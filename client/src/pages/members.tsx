import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Plus,
  Search,
  Copy,
  Check,
  Crown,
  Shield,
  User,
  Mail,
  Calendar,
  MoreVertical,
  UserMinus,
  ShieldCheck,
  UserPlus,
  Store,
  Eye,
  Edit,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiUrl, getToken } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Company } from "@shared/schema";
import { useTranslation } from "@/lib/i18n";

type Organization = {
  id: string;
  name: string;
  description?: string;
  role: string;
  createdAt: string;
};

type Member = {
  id: string;
  oderId: string;
  username: string;
  email?: string;
  role: string;
  invitedAt: string;
  storePermissions?: StorePermission[];
};

type Invite = {
  id: string;
  inviteCode: string;
  role: string;
  invitedEmail: string | null;
  expiresAt: string | null;
  usedAt: string | null;
  createdAt: string;
};

type StorePermission = {
  companyId: string;
  companyName: string;
  canView: boolean;
  canEdit: boolean;
};

export default function Members() {
  const { toast } = useToast();
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // New user form state
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("member");
  const [newUserStorePermissions, setNewUserStorePermissions] = useState<{[key: string]: {canView: boolean, canEdit: boolean}}>({});

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Get stores for the selected organization
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const orgStores = companies.filter((c) => {
    // Filter stores by organization if we have that info
    // For now, show all stores (the backend will handle organization filtering)
    return true;
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      loadMembers();
      loadInvites();
    }
  }, [selectedOrgId]);

  async function loadOrganizations() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/organizations"), { headers });
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
        if (data.length > 0 && !selectedOrgId) {
          setSelectedOrgId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    setLoadingMembers(true);
    try {
      const res = await fetch(
        apiUrl(`/api/organizations/${selectedOrgId}/members`),
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Failed to load members:", error);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadInvites() {
    try {
      const res = await fetch(
        apiUrl(`/api/organizations/${selectedOrgId}/invites`),
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setInvites(data);
      }
    } catch (error) {
      console.error("Failed to load invites:", error);
    }
  }

  async function createInvite() {
    setCreatingInvite(true);
    try {
      const res = await fetch(
        apiUrl(`/api/organizations/${selectedOrgId}/invites`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({ role: inviteRole }),
        }
      );
      if (res.ok) {
        toast({
          title: tr("Sucesso", "Success"),
          description: tr("Convite criado com sucesso", "Invite created successfully"),
        });
        await loadInvites();
        setInviteDialogOpen(false);
      } else {
        throw new Error("Falha ao criar convite");
      }
    } catch (error: any) {
      toast({
        title: tr("Erro", "Error"),
        description: error?.message || tr("Falha ao criar convite", "Failed to create invite"),
        variant: "destructive",
      });
    } finally {
      setCreatingInvite(false);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreatingUser(true);
    try {
      const res = await fetch(
        apiUrl(`/api/organizations/${selectedOrgId}/users`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({
            username: newUserUsername,
            email: newUserEmail.trim() || undefined,
            password: newUserPassword,
            role: newUserRole,
            storePermissions: Object.entries(newUserStorePermissions)
              .filter(([_, perms]) => perms.canView || perms.canEdit)
              .map(([companyId, perms]) => ({
                companyId,
                canView: perms.canView,
                canEdit: perms.canEdit,
              })),
          }),
        }
      );
      
      if (res.ok) {
        toast({
          title: tr("Sucesso", "Success"),
          description: tr("Utilizador criado com sucesso", "User created successfully"),
        });
        await loadMembers();
        setCreateUserDialogOpen(false);
        resetNewUserForm();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Falha ao criar utilizador");
      }
    } catch (error: any) {
      toast({
        title: tr("Erro", "Error"),
        description: error?.message || tr("Falha ao criar utilizador", "Failed to create user"),
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  }

  function resetNewUserForm() {
    setNewUserUsername("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserRole("member");
    setNewUserStorePermissions({});
  }

  function toggleStorePermission(companyId: string, type: 'canView' | 'canEdit') {
    setNewUserStorePermissions(prev => {
      const current = prev[companyId] || { canView: false, canEdit: false };
      const updated = { ...current };
      
      if (type === 'canEdit') {
        updated.canEdit = !updated.canEdit;
        if (updated.canEdit) {
          updated.canView = true; // If can edit, must be able to view
        }
      } else {
        updated.canView = !updated.canView;
        if (!updated.canView) {
          updated.canEdit = false; // If can't view, can't edit
        }
      }
      
      return { ...prev, [companyId]: updated };
    });
  }

  function copyInviteLink(code: string) {
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: tr("Copiado!", "Copied!"),
      description: tr("Link de convite copiado para a área de transferência", "Invite link copied to clipboard"),
    });
  }

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);
  const isAdmin =
    selectedOrg?.role === "owner" || selectedOrg?.role === "admin";

  const filteredMembers = members.filter(
    (m) =>
      m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeInvites = invites.filter((i) => !i.usedAt);
  const usedInvites = invites.filter((i) => i.usedAt);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case "admin":
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">
            {tr("Proprietário", "Owner")}
          </Badge>
        );
      case "admin":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
            {tr("Administrador", "Admin")}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{tr("Membro", "Member")}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">{tr("A carregar...", "Loading...")}</div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{tr("Membros", "Members")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tr(
              "Gerir membros e permissões das suas organizações",
              "Manage members and permissions of your organizations"
            )}
          </p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {tr("Sem Organizações", "No Organizations")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {tr(
                "Crie ou junte-se a uma organização para gerir membros.",
                "Create or join an organization to manage members."
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{tr("Membros", "Members")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tr(
              "Gerir membros e permissões das suas organizações",
              "Manage members and permissions of your organizations"
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={tr("Selecione uma organização", "Select an organization")} />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <div className="flex gap-2">
              {/* Create User Button */}
              <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    {tr("Criar Utilizador", "Create User")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{tr("Criar Novo Utilizador", "Create New User")}</DialogTitle>
                    <DialogDescription>
                      {tr(
                        "Crie uma conta de utilizador e defina as permissões de acesso às lojas",
                        "Create a user account and define store access permissions"
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createUser} className="space-y-6">
                    {/* User Details */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">{tr("Dados do Utilizador", "User Details")}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">{tr("Nome de utilizador *", "Username *")}</Label>
                          <Input
                            id="username"
                            value={newUserUsername}
                            onChange={(e) => setNewUserUsername(e.target.value)}
                            placeholder={tr("utilizador123", "username123")}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">{tr("Email (opcional)", "Email (optional)")}</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder={tr("email@exemplo.com (opcional)", "email@example.com (optional)")}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="password">{tr("Password *", "Password *")}</Label>
                          <Input
                            id="password"
                            type="password"
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">{tr("Função na Organização", "Organization Role")}</Label>
                          <Select value={newUserRole} onValueChange={setNewUserRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  {tr("Membro", "Member")}
                                </div>
                              </SelectItem>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4" />
                                  {tr("Administrador", "Admin")}
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Store Permissions */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">{tr("Permissões por Loja", "Store Permissions")}</h3>
                      <p className="text-xs text-muted-foreground">
                        {tr(
                          "Selecione quais lojas este utilizador pode ver e/ou editar",
                          "Select which stores this user can view and/or edit"
                        )}
                      </p>
                      
                      {orgStores.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground border rounded-lg">
                          {tr(
                            "Nenhuma loja disponível. Crie lojas primeiro.",
                            "No stores available. Create stores first."
                          )}
                        </div>
                      ) : (
                        <div className="border rounded-lg divide-y">
                          {orgStores.map((store) => {
                            const perms = newUserStorePermissions[store.id] || { canView: false, canEdit: false };
                            return (
                              <div key={store.id} className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                  <Store className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{store.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={perms.canView}
                                      onCheckedChange={() => toggleStorePermission(store.id, 'canView')}
                                    />
                                    <span className="text-sm flex items-center gap-1">
                                      <Eye className="w-3 h-3" />
                                      {tr("Ver", "View")}
                                    </span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <Checkbox
                                      checked={perms.canEdit}
                                      onCheckedChange={() => toggleStorePermission(store.id, 'canEdit')}
                                    />
                                    <span className="text-sm flex items-center gap-1">
                                      <Edit className="w-3 h-3" />
                                      {tr("Editar", "Edit")}
                                    </span>
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setCreateUserDialogOpen(false);
                          resetNewUserForm();
                        }}
                      >
                        {tr("Cancelar", "Cancel")}
                      </Button>
                      <Button type="submit" disabled={creatingUser}>
                        {creatingUser ? tr("A criar...", "Creating...") : tr("Criar Utilizador", "Create User")}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Invite Button */}
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Mail className="w-4 h-4" />
                    {tr("Convidar", "Invite")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{tr("Convidar Membro", "Invite Member")}</DialogTitle>
                    <DialogDescription>
                      {tr(
                        "Crie um link de convite para adicionar novos membros à organização",
                        "Create an invite link to add new members to the organization"
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {tr("Função do novo membro", "New member role")}
                      </label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {tr("Membro", "Member")}
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              {tr("Administrador", "Admin")}
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {inviteRole === "admin"
                          ? tr("Administradores podem gerir membros e configurações", "Admins can manage members and settings")
                          : tr("Membros podem ver e controlar dispositivos", "Members can view and control devices")}
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setInviteDialogOpen(false)}
                      >
                        {tr("Cancelar", "Cancel")}
                      </Button>
                      <Button onClick={createInvite} disabled={creatingInvite}>
                        {creatingInvite ? tr("A criar...", "Creating...") : tr("Criar Convite", "Create Invite")}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Total de Membros", "Total Members")}</p>
                <p className="text-2xl font-bold">{members.length}</p>
              </div>
              <Users className="w-8 h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Administradores", "Administrators")}</p>
                <p className="text-2xl font-bold">
                  {
                    members.filter(
                      (m) => m.role === "owner" || m.role === "admin"
                    ).length
                  }
                </p>
              </div>
              <Shield className="w-8 h-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Convites Ativos", "Active Invites")}</p>
                <p className="text-2xl font-bold">{activeInvites.length}</p>
              </div>
              <Mail className="w-8 h-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" />
            {tr("Membros", "Members")}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="invites" className="gap-2">
              <Mail className="w-4 h-4" />
              {tr("Convites", "Invites")}
              {activeInvites.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeInvites.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={tr("Pesquisar membros...", "Search members...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Members Table */}
          <Card>
            <CardContent className="p-0">
              {loadingMembers ? (
                <div className="p-8 text-center text-muted-foreground">
                  {tr("A carregar membros...", "Loading members...")}
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchQuery
                    ? tr("Nenhum membro encontrado", "No members found")
                    : tr("Ainda sem membros", "No members yet")}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tr("Utilizador", "User")}</TableHead>
                      <TableHead>{tr("Função", "Role")}</TableHead>
                      <TableHead>{tr("Lojas", "Stores")}</TableHead>
                      <TableHead>{tr("Membro desde", "Member since")}</TableHead>
                      {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold uppercase">
                              {member.username?.charAt(0) || "U"}
                            </div>
                            <div>
                              <p className="font-medium">{member.username}</p>
                              {member.email && (
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(member.role)}
                            {getRoleBadge(member.role)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.role === "owner" || member.role === "admin" ? (
                            <Badge variant="outline" className="text-xs">
                              {tr("Todas", "All")}
                            </Badge>
                          ) : member.storePermissions && member.storePermissions.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {member.storePermissions.slice(0, 2).map((perm) => (
                                <Badge key={perm.companyId} variant="secondary" className="text-xs">
                                  {perm.companyName}
                                </Badge>
                              ))}
                              {member.storePermissions.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{member.storePermissions.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{tr("Nenhuma", "None")}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {formatDate(member.invitedAt)}
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {member.role !== "owner" && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedMember(member);
                                    setPermissionsDialogOpen(true);
                                  }}>
                                    <Store className="w-4 h-4 mr-2" />
                                    {tr("Gerir Lojas", "Manage Stores")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    {tr("Alterar Função", "Change Role")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive">
                                    <UserMinus className="w-4 h-4 mr-2" />
                                    {tr("Remover", "Remove")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="invites" className="space-y-4">
            <Card>
              <CardHeader>
            <CardTitle className="text-lg">{tr("Convites Ativos", "Active Invites")}</CardTitle>
                <CardDescription>
              {tr("Links de convite que ainda podem ser usados", "Invite links that can still be used")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeInvites.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    {tr("Nenhum convite ativo. Crie um convite para adicionar novos membros.", "No active invites. Create an invite to add new members.")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                              {invite.inviteCode.slice(0, 12)}...
                            </code>
                            {getRoleBadge(invite.role)}
                          </div>
                        <p className="text-xs text-muted-foreground">
                          {tr("Criado em", "Created on")} {formatDate(invite.createdAt)}
                          {invite.expiresAt && (
                            <> · {tr("Expira em", "Expires on")} {formatDate(invite.expiresAt)}</>
                          )}
                        </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(invite.inviteCode)}
                        >
                          {copiedCode === invite.inviteCode ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              {tr("Copiado", "Copied")}
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              {tr("Copiar Link", "Copy Link")}
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {usedInvites.length > 0 && (
              <Card>
                <CardHeader>
                <CardTitle className="text-lg">{tr("Convites Usados", "Used Invites")}</CardTitle>
                  <CardDescription>
                  {tr("Histórico de convites que já foram aceites", "History of invites that have been accepted")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {usedInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" />
                          <code className="text-sm font-mono text-muted-foreground">
                            {invite.inviteCode.slice(0, 12)}...
                          </code>
                          {getRoleBadge(invite.role)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tr("Usado em", "Used on")}{" "}
                          {invite.usedAt ? formatDate(invite.usedAt) : "N/A"}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
