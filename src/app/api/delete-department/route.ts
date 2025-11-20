import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with service role key for admin operations
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

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    console.log("Deleting department user:", userId);

    // Step 1: Delete diagnostic sessions first (due to foreign key constraint)
    const { error: sessionsError } = await supabaseAdmin
      .from("diagnostic_sessions")
      .delete()
      .eq("user_id", userId);

    if (sessionsError) {
      console.error("Error deleting sessions:", sessionsError);
      // Continue anyway - sessions might not exist
    }

    // Step 2: Delete from users table
    const { error: dbError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId);

    if (dbError) {
      console.error("Database delete error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Step 3: Delete from Supabase Auth (do this last to avoid orphaned records)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );

    if (authError) {
      console.error("Auth delete error:", authError);
      // User already deleted from database, so just log the error
    }

    return NextResponse.json({
      success: true,
      message: "Department deleted successfully",
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
