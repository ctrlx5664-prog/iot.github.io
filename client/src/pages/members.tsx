import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

type Organization = {
  id: string;
  name: string;
  description?: string;
  role: string;
  createdAt: string;
};

type Member = {
  id: string;
  userId: string;
  username: string;
  role: string;
  invitedAt: string;
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

export default function Members() {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

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
          title: "Sucesso",
          description: "Convite criado com sucesso",
        });
        await loadInvites();
        setInviteDialogOpen(false);
      } else {
        throw new Error("Falha ao criar convite");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Falha ao criar convite",
        variant: "destructive",
      });
    } finally {
      setCreatingInvite(false);
    }
  }

  function copyInviteLink(code: string) {
    const link = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copiado!",
      description: "Link de convite copiado para a área de transferência",
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
            Proprietário
          </Badge>
        );
      case "admin":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">
            Administrador
          </Badge>
        );
      default:
        return <Badge variant="secondary">Membro</Badge>;
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
        <div className="animate-pulse text-muted-foreground">A carregar...</div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Membros</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerir membros e permissões das suas organizações
          </p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Sem Organizações</h3>
            <p className="text-sm text-muted-foreground">
              Crie ou junte-se a uma organização para gerir membros.
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
          <h1 className="text-2xl font-semibold">Membros</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerir membros e permissões das suas organizações
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione uma organização" />
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
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Convidar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar Membro</DialogTitle>
                  <DialogDescription>
                    Crie um link de convite para adicionar novos membros à
                    organização
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Função do novo membro
                    </label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Membro
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Administrador
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {inviteRole === "admin"
                        ? "Administradores podem gerir membros e configurações"
                        : "Membros podem ver e controlar dispositivos"}
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setInviteDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={createInvite} disabled={creatingInvite}>
                      {creatingInvite ? "A criar..." : "Criar Convite"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Membros</p>
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
                <p className="text-sm text-muted-foreground">Administradores</p>
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
                <p className="text-sm text-muted-foreground">Convites Ativos</p>
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
            Membros
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="invites" className="gap-2">
              <Mail className="w-4 h-4" />
              Convites
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
              placeholder="Pesquisar membros..."
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
                  A carregar membros...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {searchQuery
                    ? "Nenhum membro encontrado"
                    : "Ainda sem membros"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilizador</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Membro desde</TableHead>
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
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(member.role)}
                            {getRoleBadge(member.role)}
                          </div>
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
                                  <DropdownMenuItem>
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    Alterar Função
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive">
                                    <UserMinus className="w-4 h-4 mr-2" />
                                    Remover
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
                <CardTitle className="text-lg">Convites Ativos</CardTitle>
                <CardDescription>
                  Links de convite que ainda podem ser usados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeInvites.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhum convite ativo. Crie um convite para adicionar novos
                    membros.
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
                            Criado em {formatDate(invite.createdAt)}
                            {invite.expiresAt && (
                              <> · Expira em {formatDate(invite.expiresAt)}</>
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
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Copiar Link
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
                  <CardTitle className="text-lg">Convites Usados</CardTitle>
                  <CardDescription>
                    Histórico de convites que já foram aceites
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
                          Usado em{" "}
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
