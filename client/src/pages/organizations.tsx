import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiUrl, getToken } from "@/lib/auth";
import { Plus, Users, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Organization = {
  id: string;
  name: string;
  description?: string;
  role: string;
  createdAt: string;
};

type Invite = {
  id: string;
  inviteCode: string;
  role: string;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
};

export default function Organizations() {
  const [, navigate] = useLocation();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDesc, setNewOrgDesc] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadOrgs() {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(apiUrl("/api/organizations"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Failed to load organizations");
      setOrgs(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrgs();
  }, []);

  async function createOrg(e: any) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(apiUrl("/api/organizations"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newOrgName, description: newOrgDesc }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Failed to create organization");
      setCreateDialogOpen(false);
      setNewOrgName("");
      setNewOrgDesc("");
      await loadOrgs();
    } catch (err: any) {
      setError(err?.message || "Failed to create organization");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Organizations</h1>
          <p className="text-sm text-muted-foreground">
            Manage your organizations and team members.
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>
                Create a new organization to manage your devices and team.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createOrg} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newOrgName}
                  onChange={(e: any) => setNewOrgName(e.target.value)}
                  placeholder="My Organization"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Description (optional)
                </label>
                <Input
                  value={newOrgDesc}
                  onChange={(e: any) => setNewOrgDesc(e.target.value)}
                  placeholder="A brief description..."
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Creating..." : "Create Organization"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : orgs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              You don't belong to any organizations yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Create one or ask for an invite link.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <OrgCard key={org.id} org={org} onUpdate={loadOrgs} />
          ))}
        </div>
      )}
    </div>
  );
}

interface OrgCardProps {
  key?: string;
  org: Organization;
  onUpdate: () => void | Promise<void>;
}

function OrgCard({ org, onUpdate }: OrgCardProps) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function loadInvites() {
    setLoadingInvites(true);
    try {
      const token = getToken();
      const res = await fetch(apiUrl(`/api/organizations/${org.id}/invites`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) setInvites(data);
    } catch {
      // ignore
    } finally {
      setLoadingInvites(false);
    }
  }

  async function createInvite() {
    setCreatingInvite(true);
    try {
      const token = getToken();
      const res = await fetch(apiUrl(`/api/organizations/${org.id}/invites`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: "member" }),
      });
      if (res.ok) {
        await loadInvites();
      }
    } catch {
      // ignore
    } finally {
      setCreatingInvite(false);
    }
  }

  function copyInviteLink(code: string) {
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  useEffect(() => {
    if (inviteDialogOpen) {
      loadInvites();
    }
  }, [inviteDialogOpen]);

  const isAdmin = org.role === "owner" || org.role === "admin";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{org.name}</CardTitle>
            {org.description && (
              <CardDescription>{org.description}</CardDescription>
            )}
          </div>
          <Badge variant={org.role === "owner" ? "default" : "secondary"}>
            {org.role}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isAdmin && (
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Users className="w-4 h-4 mr-2" />
                Manage Invites
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Members</DialogTitle>
                <DialogDescription>
                  Create invite links for new team members.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Button onClick={createInvite} disabled={creatingInvite}>
                  <Plus className="w-4 h-4 mr-2" />
                  {creatingInvite ? "Creating..." : "Create Invite Link"}
                </Button>

                {loadingInvites ? (
                  <p className="text-sm text-muted-foreground">
                    Loading invites...
                  </p>
                ) : invites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No invites yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-auto">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="text-sm">
                          <code className="text-xs">
                            {invite.inviteCode.slice(0, 8)}...
                          </code>
                          <span className="ml-2 text-muted-foreground">
                            {invite.usedAt ? "Used" : "Active"}
                          </span>
                        </div>
                        {!invite.usedAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteLink(invite.inviteCode)}
                          >
                            {copiedCode === invite.inviteCode ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
