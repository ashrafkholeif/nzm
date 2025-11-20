import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = searchParams.get("org_id");

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

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

    // Fetch the most recent global analysis for the organization
    const { data: analyses, error } = await supabaseAdmin
      .from("eigenquestion_analysis")
      .select("*")
      .eq("organization_id", orgId)
      .order("generated_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching global analysis:", error);
      return NextResponse.json(
        { error: "Failed to fetch analysis" },
        { status: 500 }
      );
    }

    // Return null if no analysis found, otherwise return the first one
    const analysis = analyses && analyses.length > 0 ? analyses[0] : null;
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Error in global-analysis API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
