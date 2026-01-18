import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Users,
  Shield,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getToken, apiUrl } from "@/lib/auth";
import type { Organization } from "@shared/schema";

// Mock data for boards/directories
const mockBoards = [
  { id: "1", name: "Board of Directors", members: 5, status: "active", lastMeeting: "2026-01-15" },
  { id: "2", name: "Operations Board", members: 8, status: "active", lastMeeting: "2026-01-10" },
  { id: "3", name: "Security Committee", members: 4, status: "active", lastMeeting: "2026-01-12" },
  { id: "4", name: "Finance Board", members: 3, status: "inactive", lastMeeting: "2025-12-20" },
];

const mockPolicies = [
  { id: "1", title: "Access Policy", version: "2.1", updatedAt: "2026-01-10", status: "active" },
  { id: "2", title: "Internal Regulations", version: "1.5", updatedAt: "2025-12-15", status: "active" },
  { id: "3", title: "Security Policy", version: "3.0", updatedAt: "2026-01-05", status: "review" },
];

export default function Administration() {
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch organizations
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/organizations"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {tr("Administração", "Administration")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr("Gestão de diretorias e políticas organizacionais", "Management of boards and organizational policies")}
          </p>
        </div>
        <Dialog open={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {tr("Nova Diretoria", "New Board")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tr("Criar Nova Diretoria", "Create New Board")}</DialogTitle>
              <DialogDescription>
                {tr("Adicione uma nova diretoria à organização", "Add a new board to the organization")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{tr("Nome", "Name")}</Label>
                <Input
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder={tr("Ex: Conselho Fiscal", "Ex: Fiscal Council")}
                />
              </div>
              <div className="space-y-2">
                <Label>{tr("Descrição", "Description")}</Label>
                <Textarea
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  placeholder={tr("Descreva as responsabilidades...", "Describe the responsibilities...")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateBoardOpen(false)}>
                {tr("Cancelar", "Cancel")}
              </Button>
              <Button onClick={() => setIsCreateBoardOpen(false)}>
                {tr("Criar", "Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Diretorias Ativas", "Active Boards")}</p>
                <p className="text-2xl font-bold">
                  {mockBoards.filter(b => b.status === "active").length}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Total Membros", "Total Members")}</p>
                <p className="text-2xl font-bold">
                  {mockBoards.reduce((acc, b) => acc + b.members, 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Políticas", "Policies")}</p>
                <p className="text-2xl font-bold">{mockPolicies.length}</p>
              </div>
              <FileText className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Em Revisão", "In Review")}</p>
                <p className="text-2xl font-bold">
                  {mockPolicies.filter(p => p.status === "review").length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Boards Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {tr("Diretorias", "Boards")}
          </CardTitle>
          <CardDescription>
            {tr("Gestão das diretorias da organização", "Management of organization boards")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr("Nome", "Name")}</TableHead>
                <TableHead>{tr("Membros", "Members")}</TableHead>
                <TableHead>{tr("Estado", "Status")}</TableHead>
                <TableHead>{tr("Última Reunião", "Last Meeting")}</TableHead>
                <TableHead className="text-right">{tr("Ações", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockBoards.map((board) => (
                <TableRow key={board.id}>
                  <TableCell className="font-medium">{board.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {board.members}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={board.status === "active" ? "default" : "secondary"}>
                      {board.status === "active" ? tr("Ativa", "Active") : tr("Inativa", "Inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(board.lastMeeting).toLocaleDateString(language === "pt" ? "pt-PT" : "en-GB")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Policies Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {tr("Políticas e Regulamentos", "Policies and Regulations")}
              </CardTitle>
              <CardDescription>
                {tr("Documentos organizacionais e políticas de acesso", "Organizational documents and access policies")}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {tr("Nova Política", "New Policy")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr("Título", "Title")}</TableHead>
                <TableHead>{tr("Versão", "Version")}</TableHead>
                <TableHead>{tr("Atualizado", "Updated")}</TableHead>
                <TableHead>{tr("Estado", "Status")}</TableHead>
                <TableHead className="text-right">{tr("Ações", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPolicies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.title}</TableCell>
                  <TableCell>v{policy.version}</TableCell>
                  <TableCell>
                    {new Date(policy.updatedAt).toLocaleDateString(language === "pt" ? "pt-PT" : "en-GB")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={policy.status === "active" ? "default" : "outline"}>
                      {policy.status === "active" ? tr("Ativa", "Active") : tr("Em Revisão", "In Review")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
