import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
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
  Plus,
  Store,
  MapPin,
  Search,
  Lightbulb,
  Monitor,
  MoreVertical,
  Edit,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Company, Location, Light, Tv, InsertCompany, InsertLocation } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiUrl, getToken } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";

type Organization = {
  id: string;
  name: string;
  description?: string;
  role: string;
};

export default function Stores() {
  const { toast } = useToast();
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/organizations"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const { data: lights = [] } = useQuery<Light[]>({
    queryKey: ["/api/lights"],
  });

  const { data: tvs = [] } = useQuery<Tv[]>({
    queryKey: ["/api/tvs"],
  });

  const createStoreMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      return await apiRequest<Company>("POST", "/api/companies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setIsStoreDialogOpen(false);
      toast({
        title: tr("Sucesso", "Success"),
        description: tr("Loja criada com sucesso", "Store created successfully"),
      });
    },
    onError: (error: any) => {
      toast({
        title: tr("Erro", "Error"),
        description: error?.message || tr("Falha ao criar loja", "Failed to create store"),
        variant: "destructive",
      });
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: async (data: InsertLocation) => {
      return await apiRequest<Location>("POST", "/api/locations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setIsLocationDialogOpen(false);
      toast({
        title: tr("Sucesso", "Success"),
        description: tr("Espaço adicionado com sucesso", "Space added successfully"),
      });
    },
    onError: (error: any) => {
      toast({
        title: tr("Erro", "Error"),
        description: error?.message || tr("Falha ao criar espaço", "Failed to create space"),
        variant: "destructive",
      });
    },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/companies/${id}`), {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(tr("Falha ao eliminar loja", "Failed to delete store"));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({
        title: tr("Sucesso", "Success"),
        description: tr("Loja eliminada com sucesso", "Store deleted successfully"),
      });
    },
  });

  const handleCreateStore = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const orgId = formData.get("organizationId") as string;
    
    if (!orgId) {
      toast({
        title: tr("Erro", "Error"),
        description: tr("Selecione uma organização", "Select an organization"),
        variant: "destructive",
      });
      return;
    }

    createStoreMutation.mutate({
      organizationId: orgId,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
    });
  };

  const handleCreateLocation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createLocationMutation.mutate({
      companyId: selectedStoreId,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
    });
  };

  const getLocationsForStore = (companyId: string) => {
    return locations.filter((l) => l.companyId === companyId);
  };

  const getDeviceStats = (companyId: string) => {
    const storeLocations = getLocationsForStore(companyId);
    const locationIds = storeLocations.map((l) => l.id);
    const storeLights = lights.filter((l) => locationIds.includes(l.locationId));
    const storeTvs = tvs.filter((t) => locationIds.includes(t.locationId));
    
    return {
      totalLights: storeLights.length,
      onlineLights: storeLights.filter((l) => l.status === "online").length,
      activeLights: storeLights.filter((l) => l.isOn).length,
      totalTvs: storeTvs.length,
      onlineTvs: storeTvs.filter((t) => t.status === "online").length,
    };
  };

  const getOrgName = (orgId: string) => {
    return organizations.find((o) => o.id === orgId)?.name || "N/A";
  };

  // Filter stores based on search query
  const filteredStores = companies.filter(
    (store) =>
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{tr("Lojas", "Stores")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tr("Gerir as suas lojas, espaços e dispositivos", "Manage your stores, spaces, and devices")}
          </p>
        </div>
        <Dialog open={isStoreDialogOpen} onOpenChange={setIsStoreDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {tr("Nova Loja", "New Store")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tr("Criar Nova Loja", "Create New Store")}</DialogTitle>
              <DialogDescription>
                {tr("Adicione uma nova loja à sua organização", "Add a new store to your organization")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateStore} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationId">{tr("Organização *", "Organization *")}</Label>
                <Select
                  name="organizationId"
                  value={selectedOrgId}
                  onValueChange={setSelectedOrgId}
                >
                  <SelectTrigger>
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-name">{tr("Nome da Loja *", "Store Name *")}</Label>
                <Input
                  id="store-name"
                  name="name"
                  placeholder={tr("ex: Loja Centro Comercial", "e.g., Mall Store")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-description">{tr("Descrição", "Description")}</Label>
                <Textarea
                  id="store-description"
                  name="description"
                  placeholder={tr("Descrição opcional", "Optional description")}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsStoreDialogOpen(false)}
                >
                  {tr("Cancelar", "Cancel")}
                </Button>
                <Button type="submit" disabled={createStoreMutation.isPending}>
                  {createStoreMutation.isPending ? tr("A criar...", "Creating...") : tr("Criar Loja", "Create Store")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={tr("Pesquisar lojas...", "Search stores...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Total de Lojas", "Total Stores")}</p>
                <p className="text-2xl font-bold">{companies.length}</p>
              </div>
              <Store className="w-8 h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Total de Espaços", "Total Spaces")}</p>
                <p className="text-2xl font-bold">{locations.length}</p>
              </div>
              <MapPin className="w-8 h-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Luzes", "Lights")}</p>
                <p className="text-2xl font-bold">
                  {lights.filter((l) => l.isOn).length}/{lights.length}
                </p>
              </div>
              <Lightbulb className="w-8 h-8 text-yellow-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Televisões", "TVs")}</p>
                <p className="text-2xl font-bold">
                  {tvs.filter((t) => t.status === "online").length}/{tvs.length}
                </p>
              </div>
              <Monitor className="w-8 h-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stores List */}
      {filteredStores.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? tr("Nenhuma loja encontrada", "No stores found") : tr("Ainda não tem lojas", "You don't have stores yet")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery
                ? tr("Tente uma pesquisa diferente", "Try a different search")
                : tr("Comece por criar a sua primeira loja", "Start by creating your first store")}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsStoreDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {tr("Criar Loja", "Create Store")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStores.map((store) => {
            const storeLocations = getLocationsForStore(store.id);
            const stats = getDeviceStats(store.id);

            return (
              <Card
                key={store.id}
                className="group hover:shadow-lg transition-all duration-200 hover:border-primary/20"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 space-y-1">
                      <CardTitle className="text-lg font-semibold truncate flex items-center gap-2">
                        <Store className="w-5 h-5 text-primary flex-shrink-0" />
                        {store.name}
                      </CardTitle>
                      {store.description && (
                        <CardDescription className="line-clamp-2">
                          {store.description}
                        </CardDescription>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {getOrgName(store.organizationId)}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          {tr("Editar", "Edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteStoreMutation.mutate(store.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {tr("Eliminar", "Delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Device Stats */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      <span>
                        {stats.activeLights}/{stats.totalLights} {tr("Ligadas", "On")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
                      <Monitor className="w-4 h-4 text-blue-500" />
                      <span>
                        {stats.onlineTvs}/{stats.totalTvs} {tr("Online", "Online")}
                      </span>
                    </div>
                  </div>

                  {/* Locations */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {tr("Espaços", "Spaces")} ({storeLocations.length})
                      </span>
                    </div>
                    {storeLocations.length > 0 ? (
                      <div className="space-y-1">
                        {storeLocations.slice(0, 3).map((location) => (
                          <Link
                            key={location.id}
                            href={`/location/${location.id}`}
                          >
                            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group/item">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-sm truncate">
                                  {location.name}
                                </span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                            </div>
                          </Link>
                        ))}
                        {storeLocations.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-6">
                            +{storeLocations.length - 3} {tr("mais", "more")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {tr("Ainda sem espaços", "No spaces yet")}
                      </p>
                    )}
                  </div>

                  {/* Add Location Button */}
                  <Dialog
                    open={isLocationDialogOpen && selectedStoreId === store.id}
                    onOpenChange={(open) => {
                      setIsLocationDialogOpen(open);
                      if (open) setSelectedStoreId(store.id);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedStoreId(store.id)}
                      >
                        <Plus className="w-3 h-3 mr-2" />
                        {tr("Adicionar Espaço", "Add Space")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {tr("Adicionar Espaço a", "Add Space to")} {store.name}
                        </DialogTitle>
                        <DialogDescription>
                          {tr(
                            "Crie um novo espaço onde os dispositivos serão instalados",
                            "Create a new space where devices will be installed"
                          )}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateLocation} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="location-name">{tr("Nome do Espaço *", "Space Name *")}</Label>
                          <Input
                            id="location-name"
                            name="name"
                            placeholder={tr("ex: Piso 1, Montra, Armazém", "e.g., Floor 1, Showcase, Storage")}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location-description">{tr("Descrição", "Description")}</Label>
                          <Textarea
                            id="location-description"
                            name="description"
                            placeholder={tr("Descrição opcional", "Optional description")}
                            rows={3}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsLocationDialogOpen(false)}
                          >
                            {tr("Cancelar", "Cancel")}
                          </Button>
                          <Button
                            type="submit"
                            disabled={createLocationMutation.isPending}
                          >
                            {createLocationMutation.isPending
                              ? tr("A adicionar...", "Adding...")
                              : tr("Adicionar Espaço", "Add Space")}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
