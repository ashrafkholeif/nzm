import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateGlobalReport } from "@/lib/llm";

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

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    console.log("Generating global report for organization:", organizationId);

    // Get organization details
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      console.error("Error fetching organization:", orgError);
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Get all completed diagnostic sessions for this organization
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from("diagnostic_sessions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "completed");

    if (sessionsError) {
      console.error("Error fetching sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to fetch diagnostic sessions" },
        { status: 500 }
      );
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { error: "No completed diagnostics found" },
        { status: 400 }
      );
    }

    console.log(`Found ${sessions.length} completed sessions`);

    // Prepare department analyses for LLM
    const departmentAnalyses = sessions.map((session) => ({
      department: session.department,
      eigenquestion: session.eigenquestion,
      reasoning: session.eigenquestion_reasoning,
      workflows: session.workflows,
      totalValue: session.total_value || 0,
    }));

    // Generate global report using LLM
    console.log("Calling LLM to generate global report...");
    const globalReport = await generateGlobalReport({
      departmentAnalyses,
      organization: org.name,
    });

    console.log("Global report generated:", {
      globalEigenquestion: globalReport.globalEigenquestion,
      totalValue: globalReport.totalOrganizationValue,
    });

    // Save global report to eigenquestion_analysis table
    console.log("Saving to database with data:", {
      organization_id: organizationId,
      global_eigenquestion: globalReport.globalEigenquestion,
      reasoning: globalReport.reasoning,
      cross_department_patterns: globalReport.crossDepartmentPatterns,
      priority_ranking: globalReport.prioritySequence,
      total_organization_value: globalReport.totalOrganizationValue,
    });

    const { data: analysisData, error: analysisError } = await supabaseAdmin
      .from("eigenquestion_analysis")
      .insert({
        organization_id: organizationId,
        global_eigenquestion: globalReport.globalEigenquestion,
        reasoning: globalReport.reasoning,
        cross_department_patterns: globalReport.crossDepartmentPatterns,
        priority_ranking: globalReport.prioritySequence,
        total_organization_value: globalReport.totalOrganizationValue,
      })
      .select()
      .single();

    if (analysisError) {
      console.error("Error saving global analysis:", analysisError);
      console.error(
        "Full error details:",
        JSON.stringify(analysisError, null, 2)
      );
      return NextResponse.json(
        { error: "Failed to save global analysis", details: analysisError },
        { status: 500 }
      );
    }

    console.log("Global report saved successfully:", analysisData.id);

    return NextResponse.json({
      success: true,
      analysis: analysisData,
      report: globalReport,
    });
  } catch (error: any) {
    console.error("Error generating global report:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
