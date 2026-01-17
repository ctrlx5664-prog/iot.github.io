import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Trash2,
  Store,
  Lightbulb,
  Monitor,
  Search,
  Building,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getToken, apiUrl } from "@/lib/auth";
import type { Company } from "@shared/schema";

// Mock brands data
const mockBrands = [
  {
    id: "1",
    name: "Philips Hue",
    category: "lighting",
    storesCount: 12,
    devicesCount: 156,
    logo: "https://www.philips-hue.com/favicon.ico",
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandWebsite, setNewBrandWebsite] = useState("");
  const [newBrandCategory, setNewBrandCategory] = useState("lighting");

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {tr("Marcas", "Brands")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr("Gestão de marcas e fabricantes de equipamentos", "Management of equipment brands and manufacturers")}
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
                {tr("Adicione uma nova marca de equipamento ao sistema", "Add a new equipment brand to the system")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{tr("Nome da Marca", "Brand Name")}</Label>
                <Input
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder={tr("Ex: Philips Hue", "Ex: Philips Hue")}
                />
              </div>
              <div className="space-y-2">
                <Label>{tr("Categoria", "Category")}</Label>
                <select
                  value={newBrandCategory}
                  onChange={(e) => setNewBrandCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="lighting">{tr("Iluminação", "Lighting")}</option>
                  <option value="displays">{tr("Ecrãs", "Displays")}</option>
                </select>
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
              <Button onClick={() => setIsCreateOpen(false)}>
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

      {/* Brands Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {tr("Lista de Marcas", "Brand List")}
          </CardTitle>
          <CardDescription>
            {tr("Todas as marcas de equipamentos registadas no sistema", "All equipment brands registered in the system")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr("Marca", "Brand")}</TableHead>
                <TableHead>{tr("Categoria", "Category")}</TableHead>
                <TableHead>{tr("Lojas", "Stores")}</TableHead>
                <TableHead>{tr("Dispositivos", "Devices")}</TableHead>
                <TableHead>{tr("Estado", "Status")}</TableHead>
                <TableHead className="text-right">{tr("Ações", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBrands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {tr("Nenhuma marca encontrada", "No brands found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          {brand.logo ? (
                            <img src={brand.logo} alt={brand.name} className="w-6 h-6" />
                          ) : (
                            <Tag className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{brand.name}</p>
                          {brand.website && (
                            <a
                              href={brand.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                            >
                              {brand.website.replace("https://", "").replace("www.", "")}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {getCategoryIcon(brand.category)}
                        {getCategoryLabel(brand.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        {brand.storesCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {brand.category === "lighting" ? (
                          <Lightbulb className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Monitor className="w-4 h-4 text-muted-foreground" />
                        )}
                        {brand.devicesCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={brand.status === "active" ? "default" : "secondary"}>
                        {brand.status === "active" ? tr("Ativa", "Active") : tr("Inativa", "Inactive")}
                      </Badge>
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
