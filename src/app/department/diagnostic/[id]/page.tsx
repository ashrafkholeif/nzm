"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { AlertCircle, TrendingUp, Zap } from "lucide-react";

interface Message {
  type: "bot" | "user" | "pattern" | "system";
  content: string;
  explanation?: string;
  cascadeScore?: number;
  isHighPriority?: boolean;
}

interface Workflow {
  responses: Array<{ question: string; answer: string }>;
  cascadeScore: number;
  depth: number;
}

export default function DiagnosticChat({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<
    Array<{ question: string; answer: string }>
  >([]);
  const [currentWorkflowDepth, setCurrentWorkflowDepth] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [industry, setIndustry] = useState("automotive");
  const [department, setDepartment] = useState("");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No authenticated user found");
        router.push("/auth/admin-login");
        return;
      }

      setUserId(user.id);

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("organization_id, role")
        .eq("id", user.id)
        .single();

      if (userError || !userData?.organization_id) {
        console.error("Error getting user organization:", userError);

        // Show error message to user
        setMessages([
          {
            type: "system",
            content: `⚠️ Database Configuration Error

Unable to load your user profile. This usually means:

1. The RLS (Row Level Security) policies need to be applied to your Supabase database
2. Your user account may not be properly set up in the system

Error details: ${userError?.message || "User not found in database"}

Please contact your administrator or check the database setup:
- Run the SQL migration: supabase/migrations/002_add_rls_policies.sql
- Ensure your user exists in the 'users' table
- Verify RLS policies are enabled

For immediate testing, you can temporarily disable RLS on the 'users' table in Supabase Dashboard.`,
          },
        ]);
        setIsAnalyzing(false);
        return;
      }

      setOrganizationId(userData.organization_id);
      setIsAdmin(userData.role === "admin");

      // Create diagnostic session
      const { data: session, error: sessionError } = await supabase
        .from("diagnostic_sessions")
        .insert({
          department: params.id,
          organization_id: userData.organization_id,
          user_id: user.id,
          status: "in_progress",
        })
        .select()
        .single();

      if (sessionError) {
        console.error("Error creating session:", sessionError);
        console.error("Session error details:", {
          message: sessionError.message,
          details: sessionError.details,
          hint: sessionError.hint,
          code: sessionError.code,
        });

        // Show error to user
        setMessages([
          {
            type: "system",
            content: `Error creating diagnostic session: ${sessionError.message}. Please contact your administrator.`,
          },
        ]);
        setIsAnalyzing(false);
        return;
      }

      if (!session) {
        console.error("Session created but no data returned");
        setMessages([
          {
            type: "system",
            content:
              "Error: Could not create diagnostic session. Please try again.",
          },
        ]);
        setIsAnalyzing(false);
        return;
      }

      setSessionId(session.id);
      setDepartment(params.id);

      // Start with initial question from API
      await getNextQuestion("START");
    } catch (error) {
      console.error("Initialization error:", error);
    }
  };

  const getNextQuestion = async (userResponse: string) => {
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/analyze-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: userResponse,
          context: {
            department,
            previousAnswers: currentWorkflow,
            currentWorkflowDepth,
          },
          industry,
          workflowCount: workflows.length,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get next question");
      }

      // Add bot message with question
      const botMessage: Message = {
        type: "bot",
        content: data.question,
        explanation: data.explanation,
        cascadeScore: data.analysis?.cascadeScore,
        isHighPriority: data.analysis?.isHighPriority,
      };

      // Only add message if it's not a duplicate (check last message)
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.content === data.question) {
          return prev; // Don't add duplicate
        }
        return [...prev, botMessage];
      });

      // Check if we should detect patterns (after 2+ workflows)
      if (
        workflows.length >= 2 &&
        data.analysis?.nextAction !== "CASCADE_PROBE"
      ) {
        await detectPatterns();
      }

      // Handle workflow completion signals
      if (data.analysis?.nextAction === "NEW_WORKFLOW") {
        completeCurrentWorkflow(data.analysis.cascadeScore || 0);
      } else if (data.analysis?.nextAction === "VALIDATE_EIGENQUESTION") {
        await validateAndComplete();
      }

      setIsAnalyzing(false);
    } catch (error: any) {
      console.error("Error getting next question:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "system",
          content: `Error: ${error.message}`,
        },
      ]);
      setIsAnalyzing(false);
    }
  };

  const completeCurrentWorkflow = (cascadeScore: number) => {
    const workflow: Workflow = {
      responses: currentWorkflow,
      cascadeScore,
      depth: currentWorkflowDepth,
    };

    setWorkflows((prev) => [...prev, workflow]);
    setCurrentWorkflow([]);
    setCurrentWorkflowDepth(0);
  };

  const detectPatterns = async () => {
    try {
      const response = await fetch("/api/detect-pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflows: workflows.map((w) => w.responses),
          industry,
        }),
      });

      const pattern = await response.json();

      if (pattern.patternDetected && pattern.confidence >= 70) {
        setMessages((prev) => [
          ...prev,
          {
            type: "pattern",
            content: `🔍 PATTERN DETECTED: ${pattern.description}\n\n${pattern.hypothesis}`,
          },
        ]);
      }
    } catch (error) {
      console.error("Pattern detection error:", error);
    }
  };

  const validateAndComplete = async () => {
    setIsAnalyzing(true);

    try {
      // Final analysis with all workflows
      const allWorkflows = [
        ...workflows,
        {
          responses: currentWorkflow,
          cascadeScore: 0,
          depth: currentWorkflowDepth,
        },
      ];

      const response = await fetch("/api/analyze-workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          workflows: allWorkflows.map((w) => w.responses),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      const { analysis: analysisData } = data;

      // Display final eigenquestion discovery
      setMessages((prev) => [
        ...prev,
        {
          type: "system",
          content: `
🎯 EIGENQUESTION DISCOVERED:

"${analysisData.eigenquestion}"

REASONING:
${analysisData.analysis_reasoning}

This is the ONE question that, if answered proactively, would prevent cascading failures across your operations.

Thank you for completing the diagnostic!
`,
        },
      ]);

      setIsComplete(true);
      setIsAnalyzing(false);
    } catch (error: any) {
      console.error("Final analysis error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "system",
          content: `Error during final analysis: ${error.message}`,
        },
      ]);
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    if (!inputValue.trim() || isAnalyzing) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        content: inputValue,
      },
    ]);

    // Store in current workflow
    const lastBotMessage = messages
      .filter((m) => m.type === "bot")
      .slice(-1)[0];
    if (lastBotMessage) {
      setCurrentWorkflow((prev) => [
        ...prev,
        {
          question: lastBotMessage.content,
          answer: inputValue,
        },
      ]);
      setCurrentWorkflowDepth((prev) => prev + 1);
    }

    // Get next question
    const response = inputValue;
    setInputValue("");
    getNextQuestion(response);
  };

  const handleSignOut = async () => {
    if (isAdmin) {
      router.push("/admin/dashboard");
    } else {
      await supabase.auth.signOut();
      router.push("/");
    }
  };

  const getCascadeIndicator = (score?: number) => {
    if (!score) return null;
    if (score >= 8)
      return (
        <span title="High cascade potential!">
          <Zap className="w-4 h-4 text-red-500 inline ml-2" />
        </span>
      );
    if (score >= 5)
      return (
        <span title="Moderate cascade risk">
          <TrendingUp className="w-4 h-4 text-orange-500 inline ml-2" />
        </span>
      );
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Dynamic Workflow Diagnostic
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Discovering your eigenquestion through adaptive questioning
              </p>
            </div>
            <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg">
              <div className="font-semibold">Workflows: {workflows.length}</div>
              <div className="text-xs">Depth: {currentWorkflowDepth}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-4 min-h-[60vh] mb-24">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <Card
                className={`max-w-2xl ${
                  message.type === "user"
                    ? "bg-blue-600 text-white border-blue-700"
                    : message.type === "pattern"
                    ? "bg-purple-100 border-purple-300"
                    : message.type === "system"
                    ? "bg-green-50 border-green-200"
                    : "bg-white"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    {message.isHighPriority && message.type === "bot" && (
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                    )}
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap">
                        {message.content}
                        {getCascadeIndicator(message.cascadeScore)}
                      </p>
                      {message.explanation && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm italic text-gray-600">
                            💡 {message.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}

          {isAnalyzing && (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
                <p className="text-gray-600">Analyzing with AI...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Fixed at bottom */}
        {!isComplete && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your answer... Be specific with examples and numbers."
                  onKeyPress={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSubmit()
                  }
                  className="flex-1"
                  disabled={isAnalyzing}
                />
                <Button
                  onClick={handleSubmit}
                  disabled={isAnalyzing || !inputValue.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                  Send
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: The more specific you are, the better we can identify
                cascade patterns
              </p>
            </div>
          </div>
        )}

        {/* Completion Button */}
        {isComplete && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
            <div className="max-w-4xl mx-auto px-4 py-4 flex justify-center">
              <Button
                onClick={handleSignOut}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
              >
                {isAdmin ? "Return to Dashboard" : "Close & Sign Out"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
