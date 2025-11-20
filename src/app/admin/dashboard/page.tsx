"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Plus,
  FileText,
  CheckCircle,
  Clock,
  Trash2,
  RefreshCw,
  UserCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Department {
  id: string;
  name: string;
  email: string;
  department: string;
  status: string;
  progress: number;
  session_id?: string;
}

export default function AdminDashboard() {
  const [organization, setOrganization] = useState<any>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    name: "",
    email: "",
    department: "",
  });
  const [loading, setLoading] = useState(false);
  const [hasGlobalReport, setHasGlobalReport] = useState(false);
  const [adminSession, setAdminSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadData();

    // Set up polling to refresh data every 5 seconds
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/admin-login");
      return;
    }
  };

  const loadData = async () => {
    try {
      // Get current user to extract organization_id
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !user.user_metadata?.organization_id) {
        console.error("No user or organization_id found");
        return;
      }

      const orgId = user.user_metadata.organization_id;

      // Call API route with org_id as query parameter
      const response = await fetch(`/api/dashboard-data?org_id=${orgId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error:", response.status, errorText);
        return;
      }

      const data = await response.json();
      setOrganization(data.organization);
      setDepartments(data.departments);

      // Check if global report exists
      const analysisResponse = await fetch(
        `/api/global-analysis?org_id=${orgId}`
      );
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        setHasGlobalReport(!!analysisData.analysis);
      }

      // Check if admin has their own diagnostic session
      const sessionResponse = await fetch(
        `/api/session-results/${user.id}?user_id=true`
      );
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setAdminSession(sessionData.session);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const inviteDepartmentHead = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    try {
      // Call the API route to send invitation email
      const response = await fetch("/api/invite-department", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteData.email,
          name: inviteData.name,
          department: inviteData.department,
          organizationId: user?.user_metadata.organization_id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send invitation");
      }

      alert(`✓ Invitation email sent to ${inviteData.email}`);
      setInviteData({ name: "", email: "", department: "" });
      setShowInviteModal(false);
      loadData();
    } catch (error: any) {
      alert("Error: " + error.message);
    }

    setLoading(false);
  };

  const generateReport = () => {
    const allCompleted = departments.every((d) => d.progress === 100);
    if (!allCompleted) {
      alert("All departments must complete their diagnostics first");
      return;
    }
    router.push("/admin/report");
  };

  const startAdminDiagnostic = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please log in first");
        return;
      }

      // Create a new diagnostic session for the admin
      const { data: session, error } = await supabase
        .from("diagnostic_sessions")
        .insert({
          organization_id: user.user_metadata?.organization_id,
          user_id: user.id,
          department: "Executive/Admin",
          status: "in_progress",
          completion_percentage: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating session:", error);
        alert("Failed to start diagnostic session");
        return;
      }

      // Navigate to the diagnostic page
      router.push(`/department/diagnostic/${session.id}`);
    } catch (error: any) {
      console.error("Error starting admin diagnostic:", error);
      alert("Error: " + error.message);
    }
  };

  const deleteDepartment = async (deptId: string, deptName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${deptName}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // Call API to delete user from both Auth and database
      const response = await fetch("/api/delete-department", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: deptId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete department");
      }

      alert(`${deptName} has been deleted successfully`);
      loadData(); // Reload the departments list
    } catch (error: any) {
      alert("Error deleting department: " + error.message);
    }
  };

  const overallProgress =
    departments.length > 0
      ? Math.round(
          departments.reduce((sum, d) => sum + d.progress, 0) /
            departments.length
        )
      : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Diagnostic Control Center</h1>
              <p className="text-gray-600">{organization?.name}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => loadData()}
                variant="outline"
                className="flex items-center gap-2"
                title="Refresh data"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2"
              >
                Invite Department
              </Button>
              {adminSession && adminSession.status === "completed" ? (
                <Button
                  onClick={() =>
                    router.push(`/department/results/${adminSession.id}`)
                  }
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <UserCircle className="h-4 w-4" />
                  View My Diagnostic
                </Button>
              ) : (
                <Button
                  onClick={startAdminDiagnostic}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <UserCircle className="h-4 w-4" />
                  My Diagnostic
                </Button>
              )}
              {hasGlobalReport && (
                <Button
                  onClick={() => router.push("/admin/report")}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  View Reports
                </Button>
              )}
              <Button onClick={generateReport} disabled={overallProgress < 100}>
                Generate Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
            <CardDescription>
              {departments.filter((d) => d.progress === 100).length} of{" "}
              {departments.length} departments completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={overallProgress} className="h-3" />
            <p className="text-sm text-gray-600 mt-2">
              {overallProgress}% Complete
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <Card
              key={dept.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                console.log("Card clicked:", {
                  dept: dept.department,
                  session_id: dept.session_id,
                  progress: dept.progress,
                  status: dept.status,
                });
                if (dept.session_id && dept.progress === 100) {
                  router.push(`/department/results/${dept.session_id}`);
                } else if (dept.session_id) {
                  console.log(
                    "Session exists but progress is not 100%:",
                    dept.progress
                  );
                } else {
                  console.log("No session_id found for this department");
                }
              }}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{dept.department}</CardTitle>
                    <CardDescription>{dept.name}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {dept.progress === 100 ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click when deleting
                        deleteDepartment(dept.id, dept.name);
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Delete department"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={dept.progress} className="mb-2" />
                <p className="text-sm text-gray-600">{dept.email}</p>
                <p className="text-sm text-gray-600">Status: {dept.status}</p>
                {dept.progress === 100 && (
                  <p className="text-sm text-green-600 mt-2 font-medium">
                    ✓ Click to view report
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {departments.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No departments yet</p>
              <p className="text-sm text-gray-400">
                Click "Invite Department" to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite Department Head</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Department</Label>
                <Input
                  value={inviteData.department}
                  onChange={(e) =>
                    setInviteData({ ...inviteData, department: e.target.value })
                  }
                  placeholder="e.g., Manufacturing"
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={inviteData.name}
                  onChange={(e) =>
                    setInviteData({ ...inviteData, name: e.target.value })
                  }
                  placeholder="Department head name"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) =>
                    setInviteData({ ...inviteData, email: e.target.value })
                  }
                  placeholder="their@email.com"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={inviteDepartmentHead}
                  disabled={loading}
                  className="flex-1"
                >
                  Send Invite
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
