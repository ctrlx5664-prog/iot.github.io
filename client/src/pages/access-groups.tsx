import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// Permission features based on the user's image
const permissionFeatures = {
  lightControl: {
    label: { pt: "Light Control", en: "Light Control" },
    children: {
      dashboard: { label: { pt: "Dashboard", en: "Dashboard" } },
      administration: { label: { pt: "Administração", en: "Administration" } },
      members: { label: { pt: "Membros", en: "Members" } },
      requests: { label: { pt: "Pedidos", en: "Requests" } },
    },
  },
  stores: {
    label: { pt: "Lojas", en: "Stores" },
    children: {
      brands: { label: { pt: "Marcas", en: "Brands" } },
      spaces: { label: { pt: "Espaços", en: "Spaces" } },
      search: { label: { pt: "Pesquisar", en: "Search" } },
    },
  },
  localManagement: {
    label: { pt: "Gestão Local", en: "Local Management" },
    children: {
      localControl: { label: { pt: "Controlo Local", en: "Local Control" } },
      schedules: { label: { pt: "Agendamentos", en: "Schedules" } },
    },
  },
  ecoManagement: {
    label: { pt: "Eco Management", en: "Eco Management" },
    children: {
      energy: { label: { pt: "Energia", en: "Energy" } },
      history: { label: { pt: "Histórico", en: "History" } },
    },
  },
  media: {
    label: { pt: "Media", en: "Media" },
    children: {
      dashboard: { label: { pt: "Dashboard", en: "Dashboard" } },
      content: { label: { pt: "Conteúdos", en: "Content" } },
      playlists: { label: { pt: "Playlists", en: "Playlists" } },
    },
  },
};

// Mock access groups
const mockGroups = [
  {
    id: "1",
    name: "Group 1 - Super Admin",
    level: 1,
    description: "Full access to all features",
    usersCount: 2,
    permissions: {
      "lightControl.dashboard": true,
      "lightControl.administration": true,
      "lightControl.members": true,
      "lightControl.requests": true,
      "stores.brands": true,
      "stores.spaces": true,
      "stores.search": true,
      "localManagement.localControl": true,
      "localManagement.schedules": true,
      "ecoManagement.energy": true,
      "ecoManagement.history": true,
      "media.dashboard": true,
      "media.content": true,
      "media.playlists": true,
    },
  },
  {
    id: "2",
    name: "Group 2 - Admin",
    level: 2,
    description: "Manage members and stores",
    usersCount: 5,
    permissions: {
      "lightControl.dashboard": true,
      "lightControl.members": true,
      "lightControl.requests": true,
      "stores.brands": true,
      "stores.spaces": true,
      "stores.search": true,
      "localManagement.localControl": true,
      "localManagement.schedules": true,
      "ecoManagement.energy": true,
      "ecoManagement.history": true,
    },
  },
  {
    id: "3",
    name: "Group 3 - Manager",
    level: 3,
    description: "Manage spaces and requests",
    usersCount: 8,
    permissions: {
      "lightControl.dashboard": true,
      "lightControl.requests": true,
      "stores.spaces": true,
      "stores.search": true,
      "localManagement.localControl": true,
      "localManagement.schedules": true,
    },
  },
  {
    id: "4",
    name: "Group 4 - Operator",
    level: 4,
    description: "Local control and search",
    usersCount: 15,
    permissions: {
      "stores.search": true,
      "localManagement.localControl": true,
    },
  },
  {
    id: "5",
    name: "Group 5 - Viewer",
    level: 5,
    description: "View only",
    usersCount: 20,
    permissions: {
      "localManagement.localControl": true,
    },
  },
];

type AccessGroup = typeof mockGroups[0];

export default function AccessGroups() {
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [groups, setGroups] = useState<AccessGroup[]>(mockGroups);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AccessGroup | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(["lightControl", "stores"]);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formLevel, setFormLevel] = useState(5);
  const [formDescription, setFormDescription] = useState("");
  const [formPermissions, setFormPermissions] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-red-500";
      case 2:
        return "bg-orange-500";
      case 3:
        return "bg-yellow-500";
      case 4:
        return "bg-blue-500";
      case 5:
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  // Initialize permissions object with all features
  const initPermissions = () => {
    const perms: Record<string, boolean> = {};
    Object.entries(permissionFeatures).forEach(([sectionKey, section]) => {
      Object.entries(section.children).forEach(([featureKey]) => {
        perms[`${sectionKey}.${featureKey}`] = false;
      });
    });
    return perms;
  };

  // Open create dialog
  const openCreateDialog = () => {
    setFormName("");
    setFormLevel(5);
    setFormDescription("");
    setFormPermissions(initPermissions());
    setEditingGroup(null);
    setIsCreateOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (group: AccessGroup) => {
    setFormName(group.name);
    setFormLevel(group.level);
    setFormDescription(group.description);
    setFormPermissions({ ...initPermissions(), ...group.permissions });
    setEditingGroup(group);
    setIsCreateOpen(true);
  };

  // Toggle permission
  const togglePermission = (permKey: string) => {
    setFormPermissions((prev) => ({
      ...prev,
      [permKey]: !prev[permKey],
    }));
  };

  // Save group (create or update)
  const saveGroup = () => {
    if (!formName.trim()) return;

    const newGroup: AccessGroup = {
      id: editingGroup?.id || String(Date.now()),
      name: formName.trim(),
      level: formLevel,
      description: formDescription.trim(),
      usersCount: editingGroup?.usersCount || 0,
      permissions: formPermissions,
    };

    if (editingGroup) {
      // Update existing
      setGroups((prev) => prev.map((g) => (g.id === editingGroup.id ? newGroup : g)));
    } else {
      // Create new
      setGroups((prev) => [...prev, newGroup]);
    }

    setIsCreateOpen(false);
    setEditingGroup(null);
  };

  // Delete group
  const deleteGroup = (groupId: string) => {
    if (confirm(tr("Tem certeza que deseja eliminar este grupo?", "Are you sure you want to delete this group?"))) {
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    }
  };

  // Close dialog and reset form
  const closeDialog = () => {
    setIsCreateOpen(false);
    setEditingGroup(null);
    setFormName("");
    setFormLevel(5);
    setFormDescription("");
    setFormPermissions(initPermissions());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {tr("Grupos de Acesso", "Access Groups")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr("Gestão de permissões e níveis de acesso", "Management of permissions and access levels")}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={closeDialog}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              {tr("Novo Grupo", "New Group")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? tr("Editar Grupo de Acesso", "Edit Access Group") : tr("Criar Grupo de Acesso", "Create Access Group")}
              </DialogTitle>
              <DialogDescription>
                {editingGroup 
                  ? tr("Edite as permissões do grupo", "Edit group permissions")
                  : tr("Defina as permissões para o novo grupo", "Define permissions for the new group")
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tr("Nome", "Name")} *</Label>
                  <Input 
                    placeholder={tr("Ex: Grupo Admin", "Ex: Admin Group")}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tr("Nível", "Level")}</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={formLevel}
                    onChange={(e) => setFormLevel(Number(e.target.value))}
                  >
                    <option value="1">1 - {tr("Super Admin", "Super Admin")}</option>
                    <option value="2">2 - {tr("Admin", "Admin")}</option>
                    <option value="3">3 - {tr("Gestor", "Manager")}</option>
                    <option value="4">4 - {tr("Operador", "Operator")}</option>
                    <option value="5">5 - {tr("Visualizador", "Viewer")}</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tr("Descrição", "Description")}</Label>
                <Input 
                  placeholder={tr("Opcional...", "Optional...")}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{tr("Permissões", "Permissions")}</Label>
                <div className="border rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                  {Object.entries(permissionFeatures).map(([sectionKey, section]) => (
                    <div key={sectionKey} className="space-y-2">
                      <button
                        type="button"
                        className="flex items-center gap-2 font-medium text-sm"
                        onClick={() => toggleSection(sectionKey)}
                      >
                        {expandedSections.includes(sectionKey) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {tr(section.label.pt, section.label.en)}
                      </button>
                      {expandedSections.includes(sectionKey) && (
                        <div className="ml-6 space-y-2">
                          {Object.entries(section.children).map(([featureKey, feature]) => {
                            const permKey = `${sectionKey}.${featureKey}`;
                            return (
                              <div key={featureKey} className="flex items-center gap-2">
                                <Checkbox 
                                  id={`form-${permKey}`}
                                  checked={formPermissions[permKey] || false}
                                  onCheckedChange={() => togglePermission(permKey)}
                                />
                                <label
                                  htmlFor={`form-${permKey}`}
                                  className="text-sm text-muted-foreground cursor-pointer"
                                >
                                  {tr(feature.label.pt, feature.label.en)}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                {tr("Cancelar", "Cancel")}
              </Button>
              <Button onClick={saveGroup} disabled={!formName.trim()}>
                {editingGroup ? tr("Guardar", "Save") : tr("Criar", "Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Total Grupos", "Total Groups")}</p>
                <p className="text-2xl font-bold">{groups.length}</p>
              </div>
              <Shield className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Utilizadores", "Users")}</p>
                <p className="text-2xl font-bold">{groups.reduce((acc, g) => acc + g.usersCount, 0)}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Níveis", "Levels")}</p>
                <p className="text-2xl font-bold">5</p>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div key={level} className={`w-2 h-6 rounded ${getLevelColor(level)}`} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {tr("Lista de Grupos", "Group List")}
          </CardTitle>
          <CardDescription>
            {tr("Configure as permissões de cada grupo de acesso", "Configure permissions for each access group")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {groups.map((group) => (
              <Card key={group.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${getLevelColor(group.level)}`}>
                      {group.level}
                    </div>
                    <div>
                      <h3 className="font-medium">{group.name}</h3>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {group.usersCount} {tr("utilizadores", "users")}
                        </div>
                        <Badge variant="outline">
                          {Object.values(group.permissions).filter(Boolean).length} {tr("permissões", "permissions")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(group)}>
                      <Edit className="w-4 h-4 mr-1" />
                      {tr("Editar", "Edit")}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => deleteGroup(group.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Permissions Preview */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {tr("Permissões:", "Permissions:")}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(permissionFeatures).map(([sectionKey, section]) =>
                      Object.entries(section.children).map(([featureKey, feature]) => {
                        const permKey = `${sectionKey}.${featureKey}`;
                        const hasPermission = group.permissions[permKey as keyof typeof group.permissions];
                        return (
                          <Badge
                            key={permKey}
                            variant={hasPermission ? "default" : "outline"}
                            className={`text-[10px] ${!hasPermission ? "opacity-30" : ""}`}
                          >
                            {hasPermission ? (
                              <Check className="w-3 h-3 mr-1" />
                            ) : (
                              <X className="w-3 h-3 mr-1" />
                            )}
                            {tr(feature.label.pt, feature.label.en)}
                          </Badge>
                        );
                      })
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permission Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>{tr("Matriz de Permissões", "Permission Matrix")}</CardTitle>
          <CardDescription>
            {tr("Visualização rápida das permissões por grupo", "Quick view of permissions by group")}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">{tr("Funcionalidade", "Feature")}</TableHead>
                {groups.map((group) => (
                  <TableHead key={group.id} className="text-center min-w-[80px]">
                    <div className={`inline-flex w-6 h-6 rounded items-center justify-center text-white text-xs font-bold ${getLevelColor(group.level)}`}>
                      {group.level}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(permissionFeatures).map(([sectionKey, section]) => (
                <>
                  <TableRow key={sectionKey} className="bg-muted/50">
                    <TableCell colSpan={groups.length + 1} className="font-medium">
                      {tr(section.label.pt, section.label.en)}
                    </TableCell>
                  </TableRow>
                  {Object.entries(section.children).map(([featureKey, feature]) => (
                    <TableRow key={`${sectionKey}.${featureKey}`}>
                      <TableCell className="pl-8 sticky left-0 bg-background">
                        {tr(feature.label.pt, feature.label.en)}
                      </TableCell>
                      {groups.map((group) => {
                        const permKey = `${sectionKey}.${featureKey}`;
                        const hasPermission = group.permissions[permKey as keyof typeof group.permissions];
                        return (
                          <TableCell key={group.id} className="text-center">
                            {hasPermission ? (
                              <Check className="w-4 h-4 text-green-500 mx-auto" />
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
