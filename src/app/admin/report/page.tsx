"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalReportPage() {
  const [organization, setOrganization] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [globalAnalysis, setGlobalAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/admin-login");
        return;
      }

      const orgId = user.user_metadata?.organization_id;
      if (!orgId) {
        setError("No organization found");
        return;
      }

      const orgResponse = await fetch(`/api/dashboard-data?org_id=${orgId}`);
      if (!orgResponse.ok) {
        throw new Error("Failed to load organization data");
      }

      const orgData = await orgResponse.json();
      setOrganization(orgData.organization);

      const sessionsResponse = await fetch(
        `/api/completed-sessions?org_id=${orgId}`
      );
      if (!sessionsResponse.ok) {
        throw new Error("Failed to load sessions");
      }

      const sessionsData = await sessionsResponse.json();
      setSessions(sessionsData.sessions || []);

      const analysisResponse = await fetch(
        `/api/global-analysis?org_id=${orgId}`
      );
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        setGlobalAnalysis(analysisData.analysis);
      }
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.message);
    } finally {
      setInitialLoading(false);
    }
  };

  const generateReport = async () => {
    if (!organization) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-global-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: organization.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate report");
      }

      const data = await response.json();
      setGlobalAnalysis(data.analysis);
    } catch (err: any) {
      console.error("Error generating report:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const regenerateReport = async () => {
    if (
      !confirm(
        "Are you sure you want to regenerate the report? This will create a new analysis based on current data."
      )
    ) {
      return;
    }
    await generateReport();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <Button onClick={() => router.push("/admin/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (initialLoading || !organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Global Analysis Report</h1>
              <p className="text-gray-600">{organization.name}</p>
              {globalAnalysis && globalAnalysis.generated_at && (
                <p className="text-sm text-gray-500 mt-1">
                  Generated: {formatDate(globalAnalysis.generated_at)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {globalAnalysis && (
                <Button
                  variant="outline"
                  onClick={regenerateReport}
                  disabled={loading}
                >
                  {loading ? "Regenerating..." : "Regenerate Report"}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => router.push("/admin/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Diagnostic Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Departments</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed Diagnostics</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-2xl font-bold text-green-600">Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Department Eigenquestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <h3 className="font-semibold text-lg mb-2">
                    {session.department}
                  </h3>
                  <p className="text-gray-700 mb-2">
                    <span className="font-medium">Eigenquestion:</span>{" "}
                    {session.eigenquestion}
                  </p>
                  <p className="text-sm text-gray-600">
                    {session.eigenquestion_reasoning}
                  </p>
                  {session.total_value > 0 && (
                    <p className="text-sm text-green-600 mt-2">
                      Estimated Value: EGP {session.total_value}/month
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {!globalAnalysis && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-4">
                  Ready to Generate Global Report
                </h3>
                <p className="text-gray-600 mb-6">
                  Analyze all department diagnostics to find the
                  organization-wide eigenquestion and priority sequence.
                </p>
                <Button
                  onClick={generateReport}
                  disabled={loading || sessions.length === 0}
                  className="px-8 py-3"
                >
                  {loading ? "Generating..." : "Generate Global Report"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {globalAnalysis && (
          <>
            <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white mb-8">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-4">
                  Global Eigenquestion
                </h2>
                <p className="text-xl mb-4">
                  {globalAnalysis.global_eigenquestion}
                </p>
                <p className="text-white/90">{globalAnalysis.reasoning}</p>
              </CardContent>
            </Card>

            {globalAnalysis.cross_department_patterns &&
              globalAnalysis.cross_department_patterns.length > 0 && (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Cross-Department Patterns</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {globalAnalysis.cross_department_patterns.map(
                        (pattern: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span>{pattern}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}

            {globalAnalysis.priority_ranking &&
              globalAnalysis.priority_ranking.length > 0 && (
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Implementation Priority</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {globalAnalysis.priority_ranking.map(
                        (item: any, index: number) => (
                          <div
                            key={index}
                            className="border-l-4 border-blue-600 pl-4 py-2"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold">
                                {index + 1}. {item.department}
                              </h4>
                              {item.value && (
                                <span className="text-green-600 font-medium">
                                  EGP {item.value}/month
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {item.workflow}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

            {globalAnalysis.total_organization_value > 0 && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      Total Organization Value
                    </p>
                    <p className="text-4xl font-bold text-green-600">
                      EGP {globalAnalysis.total_organization_value}
                      <span className="text-lg">/month</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
