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
import { Plus, Users, Copy, Check, Trash2, Shield, UserMinus, MoreVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useTranslation } from "@/lib/i18n";

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

type Member = {
  id: string;
  username: string;
  email: string;
  role: string;
  invitedAt: string;
};

export default function Organizations() {
  const [, navigate] = useLocation();
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
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
        throw new Error(data?.error || tr("Falha ao carregar organizações", "Failed to load organizations"));
      setOrgs(data);
    } catch (err: any) {
      setError(err?.message || tr("Falha ao carregar organizações", "Failed to load organizations"));
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
        throw new Error(data?.error || tr("Falha ao criar organização", "Failed to create organization"));
      setCreateDialogOpen(false);
      setNewOrgName("");
      setNewOrgDesc("");
      await loadOrgs();
    } catch (err: any) {
      setError(err?.message || tr("Falha ao criar organização", "Failed to create organization"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{tr("Organizações", "Organizations")}</h1>
          <p className="text-sm text-muted-foreground">
            {tr("Gerir organizações e membros da equipa.", "Manage organizations and team members.")}
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {tr("Criar Organização", "Create Organization")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tr("Criar Organização", "Create Organization")}</DialogTitle>
              <DialogDescription>
                {tr("Crie uma nova organização para gerir dispositivos e equipa.", "Create a new organization to manage devices and team.")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createOrg} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{tr("Nome", "Name")}</label>
                <Input
                  value={newOrgName}
                  onChange={(e: any) => setNewOrgName(e.target.value)}
                  placeholder={tr("Minha Organização", "My Organization")}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {tr("Descrição (opcional)", "Description (optional)")}
                </label>
                <Input
                  value={newOrgDesc}
                  onChange={(e: any) => setNewOrgDesc(e.target.value)}
                  placeholder={tr("Uma breve descrição...", "A short description...")}
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? tr("A criar...", "Creating...") : tr("Criar Organização", "Create Organization")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="text-sm text-muted-foreground">{tr("A carregar...", "Loading...")}</div>
      ) : orgs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {tr("Ainda não pertence a nenhuma organização.", "You don't belong to any organization yet.")}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {tr("Crie uma ou peça um link de convite.", "Create one or request an invite link.")}
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
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("members");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newInviteRole, setNewInviteRole] = useState("member");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadMembers() {
    setLoadingMembers(true);
    try {
      const token = getToken();
      const res = await fetch(apiUrl(`/api/organizations/${org.id}/members`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) setMembers(data);
    } catch {
      // ignore
    } finally {
      setLoadingMembers(false);
    }
  }

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
        body: JSON.stringify({ role: newInviteRole }),
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

  async function removeMember(memberId: string) {
    if (!confirm("Tem a certeza que quer remover este membro?")) return;
    setActionLoading(memberId);
    try {
      const token = getToken();
      const res = await fetch(apiUrl(`/api/organizations/${org.id}/members/${memberId}`), {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        await loadMembers();
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  }

  async function updateMemberRole(memberId: string, newRole: string) {
    setActionLoading(memberId);
    try {
      const token = getToken();
      const res = await fetch(apiUrl(`/api/organizations/${org.id}/members/${memberId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        await loadMembers();
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteInvite(inviteId: string) {
    setActionLoading(inviteId);
    try {
      const token = getToken();
      const res = await fetch(apiUrl(`/api/organizations/${org.id}/invites/${inviteId}`), {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        await loadInvites();
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  }

  function copyInviteLink(code: string) {
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  useEffect(() => {
    if (manageDialogOpen) {
      loadMembers();
      loadInvites();
    }
  }, [manageDialogOpen]);

  const isAdmin = org.role === "owner" || org.role === "admin";
  const isOwner = org.role === "owner";

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return tr("Proprietário", "Owner");
      case "admin":
        return tr("Admin", "Admin");
      default:
        return tr("Membro", "Member");
    }
  };

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
          <Badge variant={getRoleBadgeVariant(org.role)}>
            {getRoleLabel(org.role)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isAdmin && (
          <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Users className="w-4 h-4 mr-2" />
                {tr("Gerir Equipa", "Manage Team")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{tr("Gerir", "Manage")} {org.name}</DialogTitle>
                <DialogDescription>
                  {tr("Gerir membros e convites da organização.", "Manage members and organization invites.")}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="members">
                    {tr("Membros", "Members")} ({members.length})
                  </TabsTrigger>
                  <TabsTrigger value="invites">
                    {tr("Convites", "Invites")} ({invites.filter(i => !i.usedAt).length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="members" className="space-y-4">
                  {loadingMembers ? (
                    <p className="text-sm text-muted-foreground">{tr("A carregar...", "Loading...")}</p>
                  ) : members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{tr("Sem membros.", "No members.")}</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-auto">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {member.username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.email || tr("Sem email", "No email")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              {getRoleLabel(member.role)}
                            </Badge>
                            {isOwner && member.role !== "owner" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    disabled={actionLoading === member.id}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {member.role === "member" && (
                                    <DropdownMenuItem
                                      onClick={() => updateMemberRole(member.id, "admin")}
                                    >
                                      <Shield className="w-4 h-4 mr-2" />
                                      {tr("Tornar Admin", "Make Admin")}
                                    </DropdownMenuItem>
                                  )}
                                  {member.role === "admin" && (
                                    <DropdownMenuItem
                                      onClick={() => updateMemberRole(member.id, "member")}
                                    >
                                      <UserMinus className="w-4 h-4 mr-2" />
                                      {tr("Remover Admin", "Remove Admin")}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => removeMember(member.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {tr("Remover", "Remove")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="invites" className="space-y-4">
                  <div className="flex gap-2">
                    <Select value={newInviteRole} onValueChange={setNewInviteRole}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">{tr("Membro", "Member")}</SelectItem>
                        <SelectItem value="admin">{tr("Admin", "Admin")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={createInvite} disabled={creatingInvite} className="flex-1">
                      <Plus className="w-4 h-4 mr-2" />
                      {creatingInvite ? tr("A criar...", "Creating...") : tr("Criar Link", "Create Link")}
                    </Button>
                  </div>

                  {loadingInvites ? (
                    <p className="text-sm text-muted-foreground">{tr("A carregar...", "Loading...")}</p>
                  ) : invites.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{tr("Sem convites.", "No invites.")}</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-auto">
                      {invites.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {invite.inviteCode.slice(0, 8)}...
                              </code>
                              <Badge variant={getRoleBadgeVariant(invite.role)}>
                                {getRoleLabel(invite.role)}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {invite.usedAt ? tr("Usado", "Used") : tr("Ativo", "Active")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {!invite.usedAt && (
                              <>
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteInvite(invite.id)}
                                  disabled={actionLoading === invite.id}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
