"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Check for different auth parameters
      const code = searchParams.get("code");
      const accessToken = searchParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token");
      const type = searchParams.get("type");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      // Handle auth errors
      if (errorParam) {
        throw new Error(errorDescription || errorParam);
      }

      // Method 1: PKCE flow (code exchange)
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          code
        );

        if (error) throw error;
      }
      // Method 2: Token in URL (invite acceptance)
      else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
      }
      // Method 3: Check for existing session (already logged in)
      else {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error(
            "No valid authentication found. Please use the invitation link from your email."
          );
        }
      }

      // Get the user's role from their metadata
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      // Update invite status to accepted
      await supabase
        .from("users")
        .update({ invite_status: "accepted" })
        .eq("id", user.id);

      // Redirect based on role
      if (user.user_metadata?.role === "admin") {
        router.push("/admin/dashboard");
      } else if (user.user_metadata?.role === "department_head") {
        // Find their diagnostic session or create one
        const { data: sessions } = await supabase
          .from("diagnostic_sessions")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (sessions) {
          router.push(`/department/diagnostic/${sessions.id}`);
        } else {
          // Create a new diagnostic session
          const { data: newSession } = await supabase
            .from("diagnostic_sessions")
            .insert({
              user_id: user.id,
              organization_id: user.user_metadata.organization_id,
              department: user.user_metadata.department,
              status: "in_progress",
            })
            .select()
            .single();

          if (newSession) {
            router.push(`/department/diagnostic/${newSession.id}`);
          } else {
            router.push("/");
          }
        }
      } else {
        router.push("/");
      }
    } catch (err: any) {
      console.error("Auth callback error:", err);
      setError(err.message || "Failed to complete authentication");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Completing Sign In...</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Authentication Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700"
            >
              Return to Home
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
