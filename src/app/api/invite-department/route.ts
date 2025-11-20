import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create a Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // You'll need to add this to .env.local
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const { email, name, department, organizationId } = await request.json();

    // Validate input
    if (!email || !name || !department || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Step 1: Invite user via Supabase Auth (this sends the email)
    const redirectUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    }/auth/callback`;

    console.log("Sending invitation:", {
      email,
      name,
      department,
      redirectUrl,
    });

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          name,
          department,
          organization_id: organizationId,
          role: "department_head",
        },
        redirectTo: redirectUrl,
      });

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    console.log(
      "Invitation sent successfully to:",
      email,
      "User ID:",
      inviteData.user.id
    );

    // Step 2: Create user record in database
    const { error: dbError } = await supabaseAdmin.from("users").insert({
      id: inviteData.user.id,
      email,
      name,
      department,
      organization_id: organizationId,
      role: "department_head",
      invite_status: "pending",
    });

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      userId: inviteData.user.id,
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
