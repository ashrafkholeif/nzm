"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Send, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

// This is the question flow - VERY IMPORTANT
const QUESTIONS = [
  {
    id: "domain",
    type: "choice",
    text: "Which coordination challenge best describes your department?",
    options: [
      {
        value: "supply",
        label: "Supply Coordination",
        desc: "Managing suppliers, materials, inputs",
      },
      {
        value: "demand",
        label: "Demand Coordination",
        desc: "Customer orders, fulfillment, delivery",
      },
      {
        value: "service",
        label: "Service Coordination",
        desc: "Asset maintenance, equipment, facilities",
      },
    ],
  },
  {
    id: "task",
    type: "text",
    text: "Tell me about ONE repetitive coordination task your team does daily or weekly. Be specific.",
    placeholder:
      "Example: Every morning we call 20 suppliers to check delivery status",
  },
  {
    id: "trigger",
    type: "text",
    text: "What TRIGGERS this task? How do you know to start?",
    placeholder: "Example: Every day at 8am, or when an order arrives",
  },
  {
    id: "inputs",
    type: "text",
    text: "Where does the information come from? List all sources.",
    placeholder: "Excel files, emails, phone calls, systems",
  },
  {
    id: "steps",
    type: "text",
    text: "Walk me through the steps. What happens first, then what?",
    placeholder:
      "First I check Excel, then I call suppliers, then I update the sheet...",
  },
  {
    id: "failure",
    type: "text",
    text: "CRITICAL: When this task fails, what breaks? Trace the cascade.",
    placeholder: "First X happens, then Y breaks, then Z escalates...",
  },
  {
    id: "frequency",
    type: "choice",
    text: "How often does this task happen?",
    options: [
      { value: "multiple_daily", label: "Multiple times per day" },
      { value: "daily", label: "Daily" },
      { value: "weekly", label: "Weekly" },
    ],
  },
  {
    id: "time",
    type: "text",
    text: "How many hours does this task take each time?",
    placeholder: "Example: 2 hours",
  },
  {
    id: "cost",
    type: "text",
    text: "When it fails, what does each incident cost? (time, money, reputation)",
    placeholder: "Example: 50000 EGP in downtime",
  },
  {
    id: "failures_per_month",
    type: "choice",
    text: "How often do these failures happen?",
    options: [
      { value: "1-2", label: "1-2 times per month" },
      { value: "3-5", label: "3-5 times per month" },
      { value: "6-10", label: "6-10 times per month" },
      { value: "10+", label: "More than 10 times per month" },
    ],
  },
  {
    id: "standalone",
    type: "choice",
    text: "If ONLY this task was automated, would you use it daily?",
    options: [
      { value: "yes", label: "Yes, absolutely" },
      { value: "maybe", label: "Maybe" },
      { value: "no", label: "No, need more" },
    ],
  },
  {
    id: "another",
    type: "choice",
    text: "Should we analyze another workflow?",
    options: [
      { value: "yes", label: "Yes, add another workflow" },
      { value: "no", label: "No, analyze what we have" },
    ],
  },
];

interface Message {
  type: "bot" | "user";
  content: string;
  options?: any[];
}

export default function DiagnosticChat({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<any>({});
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initializeSession = async () => {
    // Get current user to retrieve organization_id
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user found");
      return;
    }

    console.log("User authenticated:", user.id);

    // Get user's organization_id and role from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.organization_id) {
      console.error("Error getting user organization:", userError);
      return;
    }

    console.log("User organization:", userData.organization_id);

    // Check if user is admin
    if (userData.role === "admin") {
      setIsAdmin(true);
    }

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
      return;
    }

    if (session) {
      console.log("Session created successfully:", session.id);
      setSessionId(session.id);
    } else {
      console.error("Session created but no data returned");
    }

    const firstQuestion = QUESTIONS[0];
    setMessages([
      {
        type: "bot",
        content: firstQuestion.text,
        options: firstQuestion.options,
      },
    ]);
  };

  const handleOptionSelect = (value: string) => {
    const question = QUESTIONS[currentQuestionIndex];

    setMessages((prev) => [
      ...prev,
      {
        type: "user",
        content:
          QUESTIONS[currentQuestionIndex].options?.find(
            (o) => o.value === value
          )?.label || value,
      },
    ]);

    const newResponses = { ...responses, [question.id]: value };
    setResponses(newResponses);

    if (question.id === "another") {
      if (value === "yes") {
        setWorkflows((prev) => [...prev, responses]);
        setResponses({});
        setCurrentQuestionIndex(1);
        showNextQuestion(1);
      } else {
        performAnalysis([...workflows, responses]);
      }
    } else {
      moveToNextQuestion();
    }
  };

  const handleTextSubmit = () => {
    if (!inputValue.trim()) return;

    const question = QUESTIONS[currentQuestionIndex];

    setMessages((prev) => [...prev, { type: "user", content: inputValue }]);

    const newResponses = { ...responses, [question.id]: inputValue };
    setResponses(newResponses);

    setInputValue("");
    moveToNextQuestion();
  };

  const moveToNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < QUESTIONS.length) {
      setCurrentQuestionIndex(nextIndex);
      showNextQuestion(nextIndex);
    }
  };

  const showNextQuestion = (index: number) => {
    setTimeout(() => {
      const question = QUESTIONS[index];
      setMessages((prev) => [
        ...prev,
        { type: "bot", content: question.text, options: question.options },
      ]);
    }, 500);
  };

  const performAnalysis = async (allWorkflows: any[]) => {
    setIsAnalyzing(true);

    console.log("performAnalysis called with sessionId:", sessionId);
    console.log("Workflows to analyze:", allWorkflows);

    setMessages((prev) => [
      ...prev,
      {
        type: "bot",
        content: "Analyzing your workflows to find the eigenquestion...",
      },
    ]);

    try {
      // Call API route to perform analysis on the server
      const response = await fetch("/api/analyze-workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          workflows: allWorkflows,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("API Error:", data);
        setMessages((prev) => [
          ...prev,
          {
            type: "bot",
            content: `Error during analysis: ${data.error || "Unknown error"}`,
          },
        ]);
        setIsAnalyzing(false);
        return;
      }

      const { analysis: analysisData } = data;

      // Session is already updated by the API route, no need to update again

      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: `
EIGENQUESTION DISCOVERED:
"${analysisData.eigenquestion}"

REASONING:
${analysisData.analysis_reasoning}

Thank you for completing the diagnostic! Your responses have been recorded.
`,
        },
      ]);

      setIsAnalyzing(false);
      setIsComplete(true);
      // Don't auto-redirect - let user close when ready
    } catch (error: any) {
      console.error("Analysis error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: `Error: ${error.message}`,
        },
      ]);
      setIsAnalyzing(false);
    }
  };

  const handleSignOut = async () => {
    if (isAdmin) {
      // Admin just returns to dashboard
      router.push("/admin/dashboard");
    } else {
      // Department heads sign out
      await supabase.auth.signOut();
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Diagnostic Chat</h2>
            <div className="text-sm text-gray-600">
              {" "}
              Question {currentQuestionIndex + 1} of {QUESTIONS.length}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-4 min-h-[60vh]">
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
                    ? "bg-blue-500 text-white"
                    : "bg-white"
                }`}
              >
                <CardContent className="p-4">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.type === "bot" &&
                    message.options &&
                    index === messages.length - 1 && (
                      <div className="mt-4 space-y-2">
                        {message.options.map((option) => (
                          <Button
                            key={option.value}
                            variant="outline"
                            className="w-full justify-start text-left p-3"
                            onClick={() => handleOptionSelect(option.value)}
                          >
                            <div>
                              <div className="font-semibold">
                                {option.label}
                              </div>
                              {option.desc && (
                                <div className="text-sm opacity-80">
                                  {option.desc}
                                </div>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    )}
                </CardContent>
              </Card>
            </div>
          ))}

          {isAnalyzing && (
            <div className="flex justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
                <p>Analyzing with AI...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {isComplete && (
          <div className="sticky bottom-0 bg-white border-t pt-4 pb-4">
            <div className="flex justify-center">
              <Button
                onClick={handleSignOut}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
              >
                {isAdmin ? "Return to Dashboard" : "Close & Sign Out"}
              </Button>
            </div>
          </div>
        )}

        {QUESTIONS[currentQuestionIndex]?.type === "text" &&
          !isAnalyzing &&
          !isComplete &&
          messages.length > 0 && (
            <div className="sticky bottom-0 bg-gray-50 pt-4">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={QUESTIONS[currentQuestionIndex].placeholder}
                  onKeyPress={(e) => e.key === "Enter" && handleTextSubmit()}
                  className="flex-1"
                />
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
