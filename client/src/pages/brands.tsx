import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tag,
  Plus,
  Edit,
  Trash2,
  Store,
  Lightbulb,
  Monitor,
  Search,
  Building,
  ExternalLink,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getToken, apiUrl } from "@/lib/auth";
import type { Company, Location, Light, Tv } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Mock brands data
const mockBrands = [
  {
    id: "1",
    name: "Philips Hue",
    category: "lighting",
    storesCount: 12,
    devicesCount: 156,
    logo: null,
    website: "https://www.philips-hue.com",
    status: "active",
  },
  {
    id: "2",
    name: "LIFX",
    category: "lighting",
    storesCount: 8,
    devicesCount: 89,
    logo: null,
    website: "https://www.lifx.com",
    status: "active",
  },
  {
    id: "3",
    name: "Samsung",
    category: "displays",
    storesCount: 15,
    devicesCount: 45,
    logo: null,
    website: "https://www.samsung.com",
    status: "active",
  },
  {
    id: "4",
    name: "LG",
    category: "displays",
    storesCount: 10,
    devicesCount: 32,
    logo: null,
    website: "https://www.lg.com",
    status: "active",
  },
  {
    id: "5",
    name: "Nanoleaf",
    category: "lighting",
    storesCount: 3,
    devicesCount: 24,
    logo: null,
    website: "https://nanoleaf.me",
    status: "inactive",
  },
  {
    id: "6",
    name: "Yeelight",
    category: "lighting",
    storesCount: 5,
    devicesCount: 67,
    logo: null,
    website: "https://www.yeelight.com",
    status: "active",
  },
];

export default function Brands() {
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandWebsite, setNewBrandWebsite] = useState("");
  const [newBrandCategory, setNewBrandCategory] = useState("lighting");

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch stores to get real counts
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/companies"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch locations
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

  const filteredBrands = mockBrands.filter((brand) => {
    if (filterCategory !== "all" && brand.category !== filterCategory) return false;
    if (searchTerm && !brand.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const stats = {
    totalBrands: mockBrands.length,
    activeBrands: mockBrands.filter((b) => b.status === "active").length,
    lightingBrands: mockBrands.filter((b) => b.category === "lighting").length,
    displayBrands: mockBrands.filter((b) => b.category === "displays").length,
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: { pt: string; en: string } } = {
      lighting: { pt: "Iluminação", en: "Lighting" },
      displays: { pt: "Ecrãs", en: "Displays" },
    };
    return tr(labels[category]?.pt || category, labels[category]?.en || category);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "lighting":
        return <Lightbulb className="w-4 h-4" />;
      case "displays":
        return <Monitor className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const handleCreateBrand = () => {
    if (!newBrandName) {
      toast({
        title: tr("Erro", "Error"),
        description: tr("O nome é obrigatório", "Name is required"),
        variant: "destructive",
      });
      return;
    }
    toast({
      title: tr("Marca criada", "Brand created"),
      description: newBrandName,
    });
    setIsCreateOpen(false);
    setNewBrandName("");
    setNewBrandWebsite("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {tr("Marcas", "Brands")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr("Gestão de marcas e os seus equipamentos", "Management of brands and their equipment")}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {tr("Nova Marca", "New Brand")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tr("Adicionar Nova Marca", "Add New Brand")}</DialogTitle>
              <DialogDescription>
                {tr("Adicione uma nova marca de cliente ao sistema", "Add a new client brand to the system")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{tr("Nome da Marca", "Brand Name")} *</Label>
                <Input
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder={tr("Ex: WELLS", "Ex: WELLS")}
                />
              </div>
              <div className="space-y-2">
                <Label>{tr("Categoria", "Category")}</Label>
                <Select value={newBrandCategory} onValueChange={setNewBrandCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lighting">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        {tr("Iluminação", "Lighting")}
                      </div>
                    </SelectItem>
                    <SelectItem value="displays">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        {tr("Ecrãs", "Displays")}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{tr("Website", "Website")}</Label>
                <Input
                  value={newBrandWebsite}
                  onChange={(e) => setNewBrandWebsite(e.target.value)}
                  placeholder="https://"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                {tr("Cancelar", "Cancel")}
              </Button>
              <Button onClick={handleCreateBrand}>
                {tr("Adicionar", "Add")}
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
                <p className="text-sm text-muted-foreground">{tr("Total Marcas", "Total Brands")}</p>
                <p className="text-2xl font-bold">{stats.totalBrands}</p>
              </div>
              <Tag className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Ativas", "Active")}</p>
                <p className="text-2xl font-bold text-green-500">{stats.activeBrands}</p>
              </div>
              <Building className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Iluminação", "Lighting")}</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.lightingBrands}</p>
              </div>
              <Lightbulb className="w-8 h-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Ecrãs", "Displays")}</p>
                <p className="text-2xl font-bold text-blue-500">{stats.displayBrands}</p>
              </div>
              <Monitor className="w-8 h-8 text-blue-500 opacity-80" />
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
                  placeholder={tr("Pesquisar marcas...", "Search brands...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory("all")}
              >
                {tr("Todas", "All")}
              </Button>
              <Button
                variant={filterCategory === "lighting" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory("lighting")}
              >
                <Lightbulb className="w-4 h-4 mr-1" />
                {tr("Iluminação", "Lighting")}
              </Button>
              <Button
                variant={filterCategory === "displays" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory("displays")}
              >
                <Monitor className="w-4 h-4 mr-1" />
                {tr("Ecrãs", "Displays")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brands Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {tr("Lista de Marcas", "Brand List")}
          </CardTitle>
          <CardDescription>
            {tr("Clique numa marca para ver as suas lojas", "Click on a brand to see its stores")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBrands.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{tr("Nenhuma marca encontrada", "No brands found")}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredBrands.map((brand) => (
                <Card
                  key={brand.id}
                  className="hover:border-primary/50 transition-all cursor-pointer group overflow-hidden"
                  asChild
                >
                  <Link href={`/brand/${brand.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                            {brand.logo ? (
                              <img src={brand.logo} alt={brand.name} className="w-7 h-7" />
                            ) : (
                              <Tag className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {brand.name}
                            </CardTitle>
                            {brand.website && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                {brand.website.replace("https://", "").replace("www.", "")}
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 mb-4">
                        <Badge variant="outline" className="gap-1">
                          {getCategoryIcon(brand.category)}
                          {getCategoryLabel(brand.category)}
                        </Badge>
                        <Badge variant={brand.status === "active" ? "default" : "secondary"}>
                          {brand.status === "active" ? tr("Ativa", "Active") : tr("Inativa", "Inactive")}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-muted/50 text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <Store className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xl font-bold">{brand.storesCount}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{tr("Lojas", "Stores")}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50 text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            {brand.category === "lighting" ? (
                              <Lightbulb className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Monitor className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-xl font-bold">{brand.devicesCount}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{tr("Dispositivos", "Devices")}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {tr("Ver lojas e espaços", "View stores and spaces")}
                        </span>
                        <Button variant="ghost" size="sm" className="text-xs h-7">
                          {tr("Abrir", "Open")}
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
