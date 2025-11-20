import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const byUserId = searchParams.get("user_id") === "true";

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // If querying by user_id, get the most recent session for that user
    if (byUserId) {
      const { data: sessions, error: sessionError } = await supabaseAdmin
        .from("diagnostic_sessions")
        .select("*")
        .eq("user_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (sessionError) {
        console.error("Error fetching user session:", sessionError);
        return NextResponse.json(
          { error: "Failed to fetch session" },
          { status: 500 }
        );
      }

      const session = sessions && sessions.length > 0 ? sessions[0] : null;
      return NextResponse.json({ session });
    }

    // Otherwise, get session by ID
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("diagnostic_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      console.error("Error fetching session:", sessionError);
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error: any) {
    console.error("Error in session-results:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
