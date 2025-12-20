import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiUrl, getToken } from "@/lib/auth";

export default function AcceptInvite() {
  const [, navigate] = useLocation();
  const params = useParams<{ code: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const token = getToken();

  async function acceptInvite() {
    if (!params.code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/invites/${params.code}/accept`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to accept invite");
      setSuccess(
        `Joined ${data.organization?.name || "organization"} successfully!`
      );
      setTimeout(() => navigate("/organizations"), 2000);
    } catch (err: any) {
      setError(err?.message || "Failed to accept invite");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Join Organization</CardTitle>
            <CardDescription>
              You need to be logged in to accept this invite.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => navigate("/login")}>
              Login
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/register")}
            >
              Create Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Accept Invite</CardTitle>
          <CardDescription>
            You've been invited to join an organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
          {!success && (
            <Button
              className="w-full"
              onClick={acceptInvite}
              disabled={loading}
            >
              {loading ? "Joining..." : "Accept Invite"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
