"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadSession();
  }, []);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userData?.role === "admin") {
        setIsAdmin(true);
      }
    }
  };

  const loadSession = async () => {
    try {
      const response = await fetch(`/api/session-results/${params.id}`);

      if (!response.ok) {
        console.error("Failed to load session");
        return;
      }

      const data = await response.json();
      setSession(data.session);
    } catch (error) {
      console.error("Error loading session:", error);
    }
  };

  const redoDiagnostic = async () => {
    if (
      !confirm(
        "Are you sure you want to redo your diagnostic? This will create a new session."
      )
    ) {
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please log in first");
        return;
      }

      // Create a new diagnostic session for the admin
      const { data: newSession, error } = await supabase
        .from("diagnostic_sessions")
        .insert({
          organization_id: session.organization_id,
          user_id: user.id,
          department: session.department,
          status: "in_progress",
          completion_percentage: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating new session:", error);
        alert("Failed to create new diagnostic session");
        return;
      }

      // Navigate to the new diagnostic session
      router.push(`/department/diagnostic/${newSession.id}`);
    } catch (error: any) {
      console.error("Error redoing diagnostic:", error);
      alert("Error: " + error.message);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading results...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Department Analysis Results</h1>
          <p className="text-gray-600">{session.department}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Eigenquestion Card */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white mb-8">
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl mb-4">Eigenquestion Identified:</h2>
                <p className="text-2xl font-bold mb-4">
                  {" "}
                  "{session.eigenquestion}"
                </p>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-white/20 rounded p-3">
                    <p className="text-sm opacity-80">Monthly Value</p>
                    <p className="text-xl font-bold">
                      EGP {session.total_value?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="bg-white/20 rounded p-3">
                    <p className="text-sm opacity-80">Annual Impact</p>
                    <p className="text-xl font-bold">
                      EGP {((session.total_value || 0) * 12).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reasoning */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Why This Is The Eigenquestion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">
              {session.eigenquestion_reasoning}
            </p>
          </CardContent>
        </Card>

        {/* Workflows */}
        <Card>
          <CardHeader>
            <CardTitle>Analyzed Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {session.workflows?.map((workflow: any, index: number) => (
                <div key={index} className="border rounded p-4">
                  <h3 className="font-semibold mb-2">
                    {" "}
                    Workflow {index + 1}: {workflow.task}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600">Frequency:</span>
                      <span className="ml-2">{workflow.frequency}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Time per task:</span>
                      <span className="ml-2">{workflow.time}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Failures per month:</span>
                      <span className="ml-2">
                        {workflow.failures_per_month}/month
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Cost per failure:</span>
                      <span className="ml-2">EGP {workflow.cost}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="mt-8 flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/dashboard")}
          >
            Return to Dashboard
          </Button>
          {isAdmin && <Button onClick={redoDiagnostic}>Redo Diagnostic</Button>}
        </div>
      </div>
    </div>
  );
}
