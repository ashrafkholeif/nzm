"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl mb-4">
            Nazeem Enterprise Platform
          </CardTitle>
          <CardDescription className="text-lg">
            Discover your organization's eigenquestion - the ONE problem to
            solve first
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              An intelligent diagnostic system that analyzes your workflows to
              identify the most critical coordination problem affecting your
              entire organization.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                onClick={() => router.push("/auth/admin-signup")}
              >
                Get Started - Create Organization
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/auth/admin-login")}
              >
                Admin Login
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
