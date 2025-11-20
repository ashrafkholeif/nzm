import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Create admin client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: NextRequest) {
  try {
    // Get the access token from the Authorization header
    const authHeader = request.headers.get("authorization");

    let organizationId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // Verify the token and get user
      const {
        data: { user },
        error: userError,
      } = await supabaseAdmin.auth.getUser(token);

      if (user) {
        console.log("Authenticated user:", { id: user.id, email: user.email });
        organizationId = user.user_metadata?.organization_id;
      }
    }

    // Fallback: try to get from query parameter
    if (!organizationId) {
      const url = new URL(request.url);
      organizationId = url.searchParams.get("org_id");
    }

    if (!organizationId) {
      console.error("No organization_id found");
      return NextResponse.json(
        { error: "No organization found - auth required" },
        { status: 401 }
      );
    }

    // Get organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError) {
      console.error("Error fetching organization:", orgError);
      return NextResponse.json(
        { error: "Failed to fetch organization" },
        { status: 500 }
      );
    }

    // Get department heads with their diagnostic sessions (most recent first)
    const { data: deptUsers, error: deptError } = await supabaseAdmin
      .from("users")
      .select(
        `
        *,
        diagnostic_sessions (
          id, status, completion_percentage, created_at
        )
      `
      )
      .eq("organization_id", organizationId)
      .eq("role", "department_head");

    if (deptError) {
      console.error("Error fetching departments:", deptError);
      return NextResponse.json(
        { error: "Failed to fetch departments" },
        { status: 500 }
      );
    }

    const departments = (deptUsers || []).map((u: any) => {
      // Sort sessions by created_at descending (most recent first)
      const sessions = (u.diagnostic_sessions || []).sort((a: any, b: any) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // descending
      });

      const mostRecentSession = sessions[0];

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        department: u.department,
        status: mostRecentSession?.status || "not_started",
        progress: mostRecentSession?.completion_percentage || 0,
        session_id: mostRecentSession?.id,
      };
    });

    console.log(
      "Dashboard data - departments with sessions:",
      departments.map((d) => ({
        dept: d.department,
        status: d.status,
        progress: d.progress,
        hasSession: !!d.session_id,
      }))
    );

    return NextResponse.json({
      organization: org,
      departments,
    });
  } catch (error: any) {
    console.error("Error in dashboard-data:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
