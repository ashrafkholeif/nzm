import { NextRequest, NextResponse } from "next/server";
import { analyzeWithLLM } from "@/lib/llm";
import { createClient } from "@supabase/supabase-js";

// Create admin client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { sessionId, workflows } = await request.json();

    console.log("Received request:", { sessionId, workflows });

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    if (!workflows || !Array.isArray(workflows) || workflows.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty workflows array" },
        { status: 400 }
      );
    }

    // Perform LLM analysis on the server side
    const analysis = await analyzeWithLLM({
      workflows,
      department: workflows[0]?.department || "Department",
    });

    // First verify the session exists
    const { data: existingSession, error: checkError } = await supabaseAdmin
      .from("diagnostic_sessions")
      .select("id")
      .eq("id", sessionId)
      .single();

    if (checkError || !existingSession) {
      console.error("Session not found:", sessionId, checkError);
      return NextResponse.json(
        { error: "Diagnostic session not found" },
        { status: 404 }
      );
    }

    // Update the diagnostic session with analysis results
    console.log(
      "Attempting to update session:",
      sessionId,
      "with completion_percentage: 100"
    );

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from("diagnostic_sessions")
      .update({
        workflows: workflows,
        eigenquestion: analysis.eigenquestion,
        eigenquestion_reasoning: analysis.reasoning,
        total_value: analysis.totalValue || 0,
        status: "completed",
        completion_percentage: 100,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .select();

    if (sessionError) {
      console.error("Error saving analysis:", sessionError);
      return NextResponse.json(
        { error: "Failed to save analysis" },
        { status: 500 }
      );
    }

    if (!sessionData || sessionData.length === 0) {
      console.error("Update succeeded but no rows returned");
    } else {
      console.log("Session update response:", sessionData[0]);
    }

    console.log("Session updated successfully:", {
      sessionId,
      status: "completed",
      completion_percentage: 100,
      updatedRows: sessionData?.length || 0,
    });

    return NextResponse.json({
      success: true,
      analysis: {
        eigenquestion: analysis.eigenquestion,
        analysis_reasoning: analysis.reasoning,
        totalValue: analysis.totalValue,
        patterns: analysis.patterns,
        successMetrics: analysis.successMetrics,
      },
    });
  } catch (error: any) {
    console.error("Error in analyze-workflows:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
