import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Tag,
  Plus,
  Edit,
  Store,
  MapPin,
  Lightbulb,
  Monitor,
  ChevronRight,
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Power,
  BarChart3,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getToken, apiUrl } from "@/lib/auth";
import type { Company, Location, Light, Tv } from "@shared/schema";

// Mock brand data (in real app, fetch from API)
const mockBrands: { [key: string]: { id: string; name: string; category: string; website: string; logo: string | null; status: string } } = {
  "1": { id: "1", name: "Philips Hue", category: "lighting", website: "https://www.philips-hue.com", logo: null, status: "active" },
  "2": { id: "2", name: "LIFX", category: "lighting", website: "https://www.lifx.com", logo: null, status: "active" },
  "3": { id: "3", name: "Samsung", category: "displays", website: "https://www.samsung.com", logo: null, status: "active" },
  "4": { id: "4", name: "LG", category: "displays", website: "https://www.lg.com", logo: null, status: "active" },
  "5": { id: "5", name: "Nanoleaf", category: "lighting", website: "https://nanoleaf.me", logo: null, status: "inactive" },
  "6": { id: "6", name: "Yeelight", category: "lighting", website: "https://www.yeelight.com", logo: null, status: "active" },
};

export default function BrandDetail() {
  const [, params] = useRoute("/brand/:id");
  const brandId = params?.id;
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);

  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreDescription, setNewStoreDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Get brand info
  const brand = brandId ? mockBrands[brandId] : null;

  // Fetch stores (companies) - in real app, filter by brand
  const { data: stores = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/companies"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch locations (spaces)
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/locations"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch lights
  const { data: lights = [] } = useQuery<Light[]>({
    queryKey: ["/api/lights"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/lights"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch TVs
  const { data: tvs = [] } = useQuery<Tv[]>({
    queryKey: ["/api/tvs"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/tvs"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Filter stores by search
  const filteredStores = useMemo(() => {
    if (!searchTerm) return stores;
    return stores.filter((store) =>
      store.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stores, searchTerm]);

  // Get stats for a store
  const getStoreStats = (storeId: string) => {
    const storeLocations = locations.filter((l) => l.companyId === storeId);
    const locationIds = storeLocations.map((l) => l.id);
    const storeLights = lights.filter((l) => locationIds.includes(l.locationId));
    const storeTvs = tvs.filter((t) => locationIds.includes(t.locationId));
    
    return {
      spacesCount: storeLocations.length,
      lightsCount: storeLights.length,
      tvsCount: storeTvs.length,
      lightsOn: storeLights.filter((l) => l.isOn).length,
      offline: storeLights.filter((l) => l.status === "offline").length +
               storeTvs.filter((t) => t.status === "offline").length,
    };
  };

  // Total stats for this brand
  const totalStats = useMemo(() => {
    let totalSpaces = 0;
    let totalLights = 0;
    let totalTvs = 0;
    let totalLightsOn = 0;
    let totalOffline = 0;

    stores.forEach((store) => {
      const stats = getStoreStats(store.id);
      totalSpaces += stats.spacesCount;
      totalLights += stats.lightsCount;
      totalTvs += stats.tvsCount;
      totalLightsOn += stats.lightsOn;
      totalOffline += stats.offline;
    });

    return { totalSpaces, totalLights, totalTvs, totalLightsOn, totalOffline };
  }, [stores, locations, lights, tvs]);

  if (!brand) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Tag className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">{tr("Marca não encontrada", "Brand not found")}</h2>
        <Button variant="link" asChild className="mt-2">
          <Link href="/brands">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {tr("Voltar às marcas", "Back to brands")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/brands" className="hover:text-foreground">{tr("Marcas", "Brands")}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{brand.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Tag className="w-8 h-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{brand.name}</h1>
              <Badge variant={brand.status === "active" ? "default" : "secondary"}>
                {brand.status === "active" ? tr("Ativa", "Active") : tr("Inativa", "Inactive")}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                {brand.category === "lighting" ? (
                  <Lightbulb className="w-4 h-4" />
                ) : (
                  <Monitor className="w-4 h-4" />
                )}
                {brand.category === "lighting" ? tr("Iluminação", "Lighting") : tr("Ecrãs", "Displays")}
              </span>
              {brand.website && (
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <ExternalLink className="w-3 h-3" />
                  {brand.website.replace("https://", "").replace("www.", "")}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            {tr("Editar", "Edit")}
          </Button>
          <Dialog open={isCreateStoreOpen} onOpenChange={setIsCreateStoreOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {tr("Nova Loja", "New Store")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{tr("Adicionar Loja", "Add Store")}</DialogTitle>
                <DialogDescription>
                  {tr(`Adicionar uma nova loja à marca ${brand.name}`, `Add a new store to ${brand.name} brand`)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{tr("Nome da Loja", "Store Name")}</Label>
                  <Input
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    placeholder={tr("Ex: Loja Centro", "Ex: Downtown Store")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{tr("Descrição", "Description")}</Label>
                  <Input
                    value={newStoreDescription}
                    onChange={(e) => setNewStoreDescription(e.target.value)}
                    placeholder={tr("Opcional...", "Optional...")}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateStoreOpen(false)}>
                  {tr("Cancelar", "Cancel")}
                </Button>
                <Button onClick={() => setIsCreateStoreOpen(false)}>
                  {tr("Criar Loja", "Create Store")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Lojas", "Stores")}</p>
                <p className="text-2xl font-bold">{stores.length}</p>
              </div>
              <Store className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Espaços", "Spaces")}</p>
                <p className="text-2xl font-bold">{totalStats.totalSpaces}</p>
              </div>
              <MapPin className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Luzes", "Lights")}</p>
                <p className="text-2xl font-bold">
                  <span className="text-green-500">{totalStats.totalLightsOn}</span>
                  <span className="text-muted-foreground text-lg">/{totalStats.totalLights}</span>
                </p>
              </div>
              <Lightbulb className="w-8 h-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Ecrãs", "Screens")}</p>
                <p className="text-2xl font-bold">{totalStats.totalTvs}</p>
              </div>
              <Monitor className="w-8 h-8 text-purple-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Offline", "Offline")}</p>
                <p className="text-2xl font-bold text-red-500">{totalStats.totalOffline}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{tr("Ações Rápidas", "Quick Actions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2">
              <Power className="w-4 h-4 text-green-500" />
              {tr("Ligar Todas as Luzes", "Turn All Lights On")}
            </Button>
            <Button variant="outline" className="gap-2">
              <Power className="w-4 h-4 text-red-500" />
              {tr("Desligar Todas as Luzes", "Turn All Lights Off")}
            </Button>
            <Button variant="outline" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              {tr("Ver Consumo Energético", "View Energy Consumption")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stores List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                {tr("Lojas", "Stores")}
              </CardTitle>
              <CardDescription>
                {tr(`${stores.length} lojas desta marca`, `${stores.length} stores of this brand`)}
              </CardDescription>
            </div>
            <Input
              placeholder={tr("Pesquisar lojas...", "Search stores...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredStores.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{tr("Nenhuma loja encontrada", "No stores found")}</p>
              <Button variant="link" onClick={() => setIsCreateStoreOpen(true)}>
                {tr("Adicionar primeira loja", "Add first store")}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStores.map((store) => {
                const stats = getStoreStats(store.id);
                return (
                  <Card 
                    key={store.id} 
                    className="hover:border-primary/50 transition-all cursor-pointer group"
                    asChild
                  >
                    <Link href={`/store/${store.id}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <Store className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-base group-hover:text-primary transition-colors">
                                {store.name}
                              </CardTitle>
                              {store.description && (
                                <CardDescription className="text-xs">
                                  {store.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold">{stats.spacesCount}</p>
                            <p className="text-[10px] text-muted-foreground">{tr("Espaços", "Spaces")}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold">
                              <span className="text-green-500">{stats.lightsOn}</span>
                              <span className="text-muted-foreground text-sm">/{stats.lightsCount}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground">{tr("Luzes", "Lights")}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/50">
                            <p className="text-lg font-bold">{stats.tvsCount}</p>
                            <p className="text-[10px] text-muted-foreground">{tr("Ecrãs", "Screens")}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2">
                            {stats.offline > 0 ? (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {stats.offline} offline
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-green-500 border-green-500/50">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {tr("Tudo online", "All online")}
                              </Badge>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" className="text-xs">
                            {tr("Ver detalhes", "View details")}
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
