import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search as SearchIcon,
  Store,
  MapPin,
  Lightbulb,
  Monitor,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Link } from "wouter";
import type { Company, Location, Light, Tv } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SearchResult = {
  type: "store" | "space" | "light" | "tv";
  id: string;
  name: string;
  description?: string;
  parentName?: string;
  status?: string;
  href: string;
};

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

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

  const getCompanyName = (companyId: string) => {
    return companies.find((c) => c.id === companyId)?.name || "";
  };

  const getLocationName = (locationId: string) => {
    return locations.find((l) => l.id === locationId)?.name || "";
  };

  const getLocationCompanyName = (locationId: string) => {
    const location = locations.find((l) => l.id === locationId);
    if (!location) return "";
    return getCompanyName(location.companyId);
  };

  const allResults = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];

    // Add stores
    companies.forEach((company) => {
      results.push({
        type: "store",
        id: company.id,
        name: company.name,
        description: company.description || undefined,
        href: `/stores`,
      });
    });

    // Add spaces (locations)
    locations.forEach((location) => {
      results.push({
        type: "space",
        id: location.id,
        name: location.name,
        description: location.description || undefined,
        parentName: getCompanyName(location.companyId),
        href: `/location/${location.id}`,
      });
    });

    // Add lights
    lights.forEach((light) => {
      results.push({
        type: "light",
        id: light.id,
        name: light.name,
        parentName: `${getLocationCompanyName(light.locationId)} > ${getLocationName(light.locationId)}`,
        status: light.isOn ? "Ligada" : "Desligada",
        href: `/location/${light.locationId}`,
      });
    });

    // Add TVs
    tvs.forEach((tv) => {
      results.push({
        type: "tv",
        id: tv.id,
        name: tv.name,
        parentName: `${getLocationCompanyName(tv.locationId)} > ${getLocationName(tv.locationId)}`,
        status: tv.status === "online" ? "Online" : "Offline",
        href: `/location/${tv.locationId}`,
      });
    });

    return results;
  }, [companies, locations, lights, tvs]);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim() && filterType === "all") {
      return [];
    }

    return allResults.filter((result) => {
      // Filter by type
      if (filterType !== "all" && result.type !== filterType) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          result.name.toLowerCase().includes(query) ||
          result.description?.toLowerCase().includes(query) ||
          result.parentName?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [allResults, searchQuery, filterType]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "store":
        return <Store className="w-5 h-5 text-primary" />;
      case "space":
        return <MapPin className="w-5 h-5 text-blue-500" />;
      case "light":
        return <Lightbulb className="w-5 h-5 text-yellow-500" />;
      case "tv":
        return <Monitor className="w-5 h-5 text-purple-500" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "store":
        return "Loja";
      case "space":
        return "Espaço";
      case "light":
        return "Luz";
      case "tv":
        return "TV";
      default:
        return type;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "store":
        return "bg-primary/10 text-primary";
      case "space":
        return "bg-blue-500/10 text-blue-600";
      case "light":
        return "bg-yellow-500/10 text-yellow-600";
      case "tv":
        return "bg-purple-500/10 text-purple-600";
      default:
        return "";
    }
  };

  const stats = {
    stores: companies.length,
    spaces: locations.length,
    lights: lights.length,
    tvs: tvs.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Pesquisar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Encontre lojas, espaços e dispositivos rapidamente
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, descrição ou localização..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 text-base"
            autoFocus
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[180px] h-12">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="store">Lojas</SelectItem>
            <SelectItem value="space">Espaços</SelectItem>
            <SelectItem value="light">Luzes</SelectItem>
            <SelectItem value="tv">Televisões</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick Stats */}
      {!searchQuery && filterType === "all" && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setFilterType("store")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lojas</p>
                  <p className="text-2xl font-bold">{stats.stores}</p>
                </div>
                <Store className="w-8 h-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-blue-500/50 transition-colors"
            onClick={() => setFilterType("space")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Espaços</p>
                  <p className="text-2xl font-bold">{stats.spaces}</p>
                </div>
                <MapPin className="w-8 h-8 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-yellow-500/50 transition-colors"
            onClick={() => setFilterType("light")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Luzes</p>
                  <p className="text-2xl font-bold">{stats.lights}</p>
                </div>
                <Lightbulb className="w-8 h-8 text-yellow-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-purple-500/50 transition-colors"
            onClick={() => setFilterType("tv")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Televisões</p>
                  <p className="text-2xl font-bold">{stats.tvs}</p>
                </div>
                <Monitor className="w-8 h-8 text-purple-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      {(searchQuery || filterType !== "all") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredResults.length} resultado
              {filteredResults.length !== 1 ? "s" : ""} encontrado
              {filteredResults.length !== 1 ? "s" : ""}
            </p>
            {filterType !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterType("all")}
              >
                Limpar filtro
              </Button>
            )}
          </div>

          {filteredResults.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhum resultado encontrado
                </h3>
                <p className="text-sm text-muted-foreground">
                  Tente uma pesquisa diferente ou altere os filtros
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredResults.map((result) => (
                <Link key={`${result.type}-${result.id}`} href={result.href}>
                  <Card className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          {getTypeIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">
                              {result.name}
                            </h3>
                            <Badge
                              className={cn(
                                "text-xs flex-shrink-0",
                                getTypeBadgeClass(result.type)
                              )}
                            >
                              {getTypeLabel(result.type)}
                            </Badge>
                            {result.status && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs flex-shrink-0",
                                  result.status === "Online" ||
                                    result.status === "Ligada"
                                    ? "border-green-500 text-green-600"
                                    : "border-muted-foreground text-muted-foreground"
                                )}
                              >
                                {result.status}
                              </Badge>
                            )}
                          </div>
                          {(result.parentName || result.description) && (
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {result.parentName || result.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!searchQuery && filterType === "all" && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Pesquise por qualquer coisa</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Digite o nome de uma loja, espaço ou dispositivo para encontrar
              rapidamente o que procura. Ou clique nos cards acima para filtrar
              por tipo.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
