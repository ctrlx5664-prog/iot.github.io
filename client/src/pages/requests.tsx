import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  User,
  Calendar,
  Filter,
  Search,
  Lightbulb,
  Monitor,
  Building,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getToken, apiUrl } from "@/lib/auth";
import type { Company, Location } from "@shared/schema";

// Mock requests data
const mockRequests = [
  {
    id: "REQ-001",
    title: "Broken light in main hallway",
    type: "maintenance",
    priority: "high",
    status: "open",
    store: "Central Store",
    location: "Hallway A",
    createdBy: "John Smith",
    createdAt: "2026-01-17T10:30:00",
    description: "The main hallway light has not been working since yesterday.",
    comments: 2,
  },
  {
    id: "REQ-002",
    title: "TV has no signal",
    type: "maintenance",
    priority: "medium",
    status: "in_progress",
    store: "North Store",
    location: "Showcase 3",
    createdBy: "Mary Johnson",
    createdAt: "2026-01-16T14:20:00",
    assignedTo: "Technician Peter",
    description: "The TV in showcase 3 lost the HDMI signal.",
    comments: 5,
  },
  {
    id: "REQ-003",
    title: "Light firmware update",
    type: "admin",
    priority: "low",
    status: "completed",
    store: "All Stores",
    location: "-",
    createdBy: "Admin",
    createdAt: "2026-01-15T09:00:00",
    completedAt: "2026-01-16T11:30:00",
    description: "Update firmware on all smart lights.",
    comments: 3,
  },
  {
    id: "REQ-004",
    title: "New light point needed",
    type: "installation",
    priority: "medium",
    status: "pending",
    store: "South Store",
    location: "Warehouse",
    createdBy: "Carlos Foster",
    createdAt: "2026-01-14T16:45:00",
    description: "We need a new light point in the warehouse.",
    comments: 1,
  },
  {
    id: "REQ-005",
    title: "Schedule programming",
    type: "admin",
    priority: "low",
    status: "cancelled",
    store: "Central Store",
    location: "-",
    createdBy: "Anna Costa",
    createdAt: "2026-01-13T11:00:00",
    description: "Change lighting operating schedule.",
    comments: 0,
  },
];

const priorityColors = {
  high: "destructive",
  medium: "default",
  low: "secondary",
} as const;

const statusColors = {
  open: "outline",
  in_progress: "default",
  pending: "secondary",
  completed: "default",
  cancelled: "destructive",
} as const;

type Request = typeof mockRequests[0];

export default function Requests() {
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [requests, setRequests] = useState<Request[]>(mockRequests);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterType, setFilterType] = useState("all");
  
  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("maintenance");
  const [formPriority, setFormPriority] = useState("medium");
  const [formStore, setFormStore] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch stores for the dropdown
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/companies"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // CRUD functions
  const openCreateDialog = () => {
    setFormTitle("");
    setFormType("maintenance");
    setFormPriority("medium");
    setFormStore("");
    setFormLocation("");
    setFormDescription("");
    setEditingRequest(null);
    setIsCreateOpen(true);
  };

  const openEditDialog = (request: Request) => {
    setFormTitle(request.title);
    setFormType(request.type);
    setFormPriority(request.priority);
    setFormStore(request.store);
    setFormLocation(request.location);
    setFormDescription(request.description || "");
    setEditingRequest(request);
    setIsCreateOpen(true);
  };

  const saveRequest = () => {
    if (!formTitle.trim() || !formStore) return;

    const newRequest: Request = {
      id: editingRequest?.id || `REQ-${String(Date.now()).slice(-6)}`,
      title: formTitle.trim(),
      type: formType,
      priority: formPriority as "high" | "medium" | "low",
      status: editingRequest?.status || "open",
      store: companies.find(c => c.id === formStore)?.name || formStore,
      location: formLocation.trim(),
      createdBy: editingRequest?.createdBy || "Current User",
      createdAt: editingRequest?.createdAt || new Date().toISOString(),
      description: formDescription.trim(),
      comments: editingRequest?.comments || 0,
    };

    if (editingRequest) {
      setRequests((prev) => prev.map((r) => (r.id === editingRequest.id ? newRequest : r)));
    } else {
      setRequests((prev) => [...prev, newRequest]);
    }

    setIsCreateOpen(false);
    setEditingRequest(null);
  };

  const deleteRequest = (id: string) => {
    if (confirm(tr("Tem certeza que deseja eliminar este pedido?", "Are you sure you want to delete this request?"))) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const closeDialog = () => {
    setIsCreateOpen(false);
    setEditingRequest(null);
  };

  const filteredRequests = requests.filter((req) => {
    if (activeTab !== "all" && req.status !== activeTab) return false;
    if (filterPriority !== "all" && req.priority !== filterPriority) return false;
    if (filterType !== "all" && req.type !== filterType) return false;
    if (searchTerm && !req.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: { pt: string; en: string } } = {
      open: { pt: "Aberto", en: "Open" },
      in_progress: { pt: "Em Progresso", en: "In Progress" },
      pending: { pt: "Pendente", en: "Pending" },
      completed: { pt: "Concluído", en: "Completed" },
      cancelled: { pt: "Cancelado", en: "Cancelled" },
    };
    return tr(labels[status]?.pt || status, labels[status]?.en || status);
  };

  const getPriorityLabel = (priority: string) => {
    const labels: { [key: string]: { pt: string; en: string } } = {
      high: { pt: "Alta", en: "High" },
      medium: { pt: "Média", en: "Medium" },
      low: { pt: "Baixa", en: "Low" },
    };
    return tr(labels[priority]?.pt || priority, labels[priority]?.en || priority);
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: { pt: string; en: string } } = {
      maintenance: { pt: "Manutenção", en: "Maintenance" },
      admin: { pt: "Administrativo", en: "Administrative" },
      installation: { pt: "Instalação", en: "Installation" },
    };
    return tr(labels[type]?.pt || type, labels[type]?.en || type);
  };

  const stats = {
    open: requests.filter((r) => r.status === "open").length,
    inProgress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
    total: requests.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {tr("Pedidos de Manutenção", "Maintenance Requests")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr("Gestão de pedidos de manutenção e suporte", "Management of maintenance and support requests")}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={closeDialog}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              {tr("Novo Pedido", "New Request")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingRequest ? tr("Editar Pedido", "Edit Request") : tr("Criar Novo Pedido", "Create New Request")}
              </DialogTitle>
              <DialogDescription>
                {editingRequest
                  ? tr("Edite os detalhes do pedido", "Edit request details")
                  : tr("Submeta um pedido de manutenção ou suporte", "Submit a maintenance or support request")
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{tr("Título", "Title")} *</Label>
                <Input 
                  placeholder={tr("Descreva brevemente o problema...", "Briefly describe the issue...")}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tr("Tipo", "Type")}</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">{tr("Manutenção", "Maintenance")}</SelectItem>
                      <SelectItem value="admin">{tr("Administrativo", "Administrative")}</SelectItem>
                      <SelectItem value="installation">{tr("Instalação", "Installation")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tr("Prioridade", "Priority")}</Label>
                  <Select value={formPriority} onValueChange={setFormPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{tr("Alta", "High")}</SelectItem>
                      <SelectItem value="medium">{tr("Média", "Medium")}</SelectItem>
                      <SelectItem value="low">{tr("Baixa", "Low")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tr("Loja", "Store")} *</Label>
                  <Select value={formStore} onValueChange={setFormStore}>
                    <SelectTrigger>
                      <SelectValue placeholder={tr("Selecionar loja", "Select store")} />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tr("Localização", "Location")}</Label>
                  <Input 
                    placeholder={tr("Ex: Vitrine 1", "Ex: Display 1")}
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tr("Descrição", "Description")}</Label>
                <Textarea
                  placeholder={tr("Descreva o problema em detalhe...", "Describe the issue in detail...")}
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                {tr("Cancelar", "Cancel")}
              </Button>
              <Button onClick={saveRequest} disabled={!formTitle.trim() || !formStore}>
                {editingRequest ? tr("Guardar", "Save") : tr("Submeter", "Submit")}
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
                <p className="text-sm text-muted-foreground">{tr("Abertos", "Open")}</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.open}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Em Progresso", "In Progress")}</p>
                <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Concluídos", "Completed")}</p>
                <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Total", "Total")}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Wrench className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={tr("Pesquisar pedidos...", "Search requests...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tr("Prioridade", "Priority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tr("Todas", "All")}</SelectItem>
                <SelectItem value="high">{tr("Alta", "High")}</SelectItem>
                <SelectItem value="medium">{tr("Média", "Medium")}</SelectItem>
                <SelectItem value="low">{tr("Baixa", "Low")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={tr("Tipo", "Type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tr("Todos", "All")}</SelectItem>
                <SelectItem value="maintenance">{tr("Manutenção", "Maintenance")}</SelectItem>
                <SelectItem value="admin">{tr("Admin", "Admin")}</SelectItem>
                <SelectItem value="installation">{tr("Instalação", "Installation")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs & Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">{tr("Todos", "All")}</TabsTrigger>
          <TabsTrigger value="open">{tr("Abertos", "Open")}</TabsTrigger>
          <TabsTrigger value="in_progress">{tr("Em Progresso", "In Progress")}</TabsTrigger>
          <TabsTrigger value="completed">{tr("Concluídos", "Completed")}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("ID", "ID")}</TableHead>
                    <TableHead>{tr("Título", "Title")}</TableHead>
                    <TableHead>{tr("Tipo", "Type")}</TableHead>
                    <TableHead>{tr("Prioridade", "Priority")}</TableHead>
                    <TableHead>{tr("Loja", "Store")}</TableHead>
                    <TableHead>{tr("Estado", "Status")}</TableHead>
                    <TableHead>{tr("Data", "Date")}</TableHead>
                    <TableHead className="text-right">{tr("Ações", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {tr("Nenhum pedido encontrado", "No requests found")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">{request.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.title}</p>
                            <p className="text-xs text-muted-foreground">{request.location}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTypeLabel(request.type)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={priorityColors[request.priority as keyof typeof priorityColors]}>
                            {getPriorityLabel(request.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell>{request.store}</TableCell>
                        <TableCell>
                          <Badge variant={statusColors[request.status as keyof typeof statusColors]}>
                            {getStatusLabel(request.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(request.createdAt).toLocaleDateString(language === "pt" ? "pt-PT" : "en-GB")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <MessageSquare className="w-4 h-4 mr-1" />
                              {request.comments}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEditDialog(request)}>
                              {tr("Editar", "Edit")}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500 hover:text-red-700"
                              onClick={() => deleteRequest(request.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
