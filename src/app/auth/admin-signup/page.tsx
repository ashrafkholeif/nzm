"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function AdminSignup() {
  const [formData, setFormData] = useState({
    organizationName: "",
    adminName: "",
    email: "",
    password: "",
    industry: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Step 1: Create admin auth account with auto-confirm
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.adminName,
            role: "admin",
          },
          emailRedirectTo: undefined, // Don't send confirmation email for now
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Wait a moment for the session to be established
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 2: Verify session is active
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        // If no session, sign in the user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (signInError) throw signInError;
      }

      // Step 3: Now user is authenticated, create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: formData.organizationName,
          industry: formData.industry,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Step 4: Create user record linked to organization
      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        email: formData.email,
        name: formData.adminName,
        organization_id: org.id,
        role: "admin",
      });

      if (userError) throw userError;

      // Step 5: Update user metadata with organization_id
      await supabase.auth.updateUser({
        data: { organization_id: org.id },
      });

      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Create Organization Account</CardTitle>
          <CardDescription>
            Start your enterprise diagnostic with Nazeem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label>Organization Name</Label>
              <Input
                value={formData.organizationName}
                onChange={(e) =>
                  setFormData({ ...formData, organizationName: e.target.value })
                }
                placeholder="Your company name"
                required
              />
            </div>
            <div>
              <Label>Industry</Label>
              <select
                className="w-full p-2 border rounded"
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                required
              >
                <option value="">Select...</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="automotive">Automotive</option>
                <option value="logistics">Logistics</option>
                <option value="retail">Retail</option>
              </select>
            </div>
            <div>
              <Label>Your Name</Label>
              <Input
                value={formData.adminName}
                onChange={(e) =>
                  setFormData({ ...formData, adminName: e.target.value })
                }
                placeholder="Full name"
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="admin@company.com"
                required
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Minimum 6 characters"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
