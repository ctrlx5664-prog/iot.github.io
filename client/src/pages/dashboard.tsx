import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Lightbulb,
  Monitor,
  Power,
  PowerOff,
  Zap,
  MapPin,
  ChevronRight,
  Activity,
  Store,
  Plus,
  Eye,
  Settings,
  BarChart3,
} from "lucide-react";
import type { Company, Location, Light, Tv } from "@shared/schema";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Mock recent activity
function generateMockActivity() {
  return [
    { id: "1", action: "light_on", user: "admin", target: "Backlight", store: "Loja 1", time: "5 min" },
    { id: "2", action: "brightness", user: "joao", target: "Main Display", store: "Loja 1", time: "15 min" },
    { id: "3", action: "light_off", user: "maria", target: "Entrance", store: "Loja 2", time: "1h" },
    { id: "4", action: "schedule", user: "admin", target: "Modo Noite", store: "Todas", time: "2h" },
  ];
}

export default function Dashboard() {
  const { language } = useTranslation();
  const { toast } = useToast();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);

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

  const recentActivity = useMemo(() => generateMockActivity(), []);

  // Calculate stats per store
  const storeStats = useMemo(() => {
    return companies.map((company) => {
      const storeLocations = locations.filter((l) => l.companyId === company.id);
      const locationIds = storeLocations.map((l) => l.id);
      const storeLights = lights.filter((l) => locationIds.includes(l.locationId));
      const storeTvs = tvs.filter((t) => locationIds.includes(t.locationId));

      return {
        ...company,
        locations: storeLocations,
        totalLights: storeLights.length,
        activeLights: storeLights.filter((l) => l.isOn).length,
        offlineLights: storeLights.filter((l) => l.status === "offline").length,
        totalTvs: storeTvs.length,
        onlineTvs: storeTvs.filter((t) => t.status === "online").length,
        totalSpaces: storeLocations.length,
      };
    });
  }, [companies, locations, lights, tvs]);

  // Global stats
  const globalStats = useMemo(() => ({
    totalStores: companies.length,
    totalSpaces: locations.length,
    totalLights: lights.length,
    activeLights: lights.filter((l) => l.isOn).length,
    offlineLights: lights.filter((l) => l.status === "offline").length,
    totalTvs: tvs.length,
    onlineTvs: tvs.filter((t) => t.status === "online").length,
  }), [companies, locations, lights, tvs]);

  // Toggle all lights for a store
  const toggleStoreLightsMutation = useMutation({
    mutationFn: async ({ turnOn, companyId }: { turnOn: boolean; companyId?: string }) => {
      let targetLights = lights.filter((l) => l.status === "online");
      if (companyId) {
        const companyLocationIds = locations
          .filter((loc) => loc.companyId === companyId)
          .map((loc) => loc.id);
        targetLights = targetLights.filter((l) => companyLocationIds.includes(l.locationId));
      }
      const promises = targetLights.map((light) =>
        apiRequest<Light>("PATCH", `/api/lights/${light.id}`, { isOn: turnOn })
      );
      await Promise.all(promises);
      return { count: targetLights.length, turnOn };
    },
    onSuccess: ({ count, turnOn }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lights"] });
      toast({
        title: tr("Sucesso", "Success"),
        description: turnOn
          ? tr(`${count} luzes ligadas`, `${count} lights turned on`)
          : tr(`${count} luzes desligadas`, `${count} lights turned off`),
      });
    },
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{tr("Dashboard", "Dashboard")}</h1>
          <p className="text-muted-foreground mt-1">
            {tr("Gerir luzes e dispositivos das suas lojas", "Manage lights and devices for your stores")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href="/stores">
              <Plus className="w-4 h-4" />
              {tr("Nova Loja", "New Store")}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => toggleStoreLightsMutation.mutate({ turnOn: true })}
            disabled={toggleStoreLightsMutation.isPending || globalStats.totalLights === 0}
          >
            <Power className="w-4 h-4 text-green-500" />
            {tr("Ligar Todas", "All On")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => toggleStoreLightsMutation.mutate({ turnOn: false })}
            disabled={toggleStoreLightsMutation.isPending || globalStats.totalLights === 0}
          >
            <PowerOff className="w-4 h-4 text-red-500" />
            {tr("Desligar Todas", "All Off")}
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Lojas", "Stores")}</p>
                <p className="text-3xl font-bold">{globalStats.totalStores}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {globalStats.totalSpaces} {tr("espaços", "spaces")}
                </p>
              </div>
              <Store className="w-10 h-10 text-primary/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Luzes", "Lights")}</p>
                <p className="text-3xl font-bold">
                  <span className="text-green-500">{globalStats.activeLights}</span>
                  <span className="text-muted-foreground text-lg">/{globalStats.totalLights}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {tr("ligadas agora", "currently on")}
                </p>
              </div>
              <Lightbulb className="w-10 h-10 text-yellow-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("TVs", "TVs")}</p>
                <p className="text-3xl font-bold">
                  <span className="text-blue-500">{globalStats.onlineTvs}</span>
                  <span className="text-muted-foreground text-lg">/{globalStats.totalTvs}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">online</p>
              </div>
              <Monitor className="w-10 h-10 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "bg-gradient-to-br",
          globalStats.offlineLights > 0
            ? "from-red-500/10 to-orange-500/5 border-red-500/20"
            : "from-green-500/10 to-emerald-500/5"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Estado", "Status")}</p>
                <p className="text-3xl font-bold">
                  {globalStats.offlineLights > 0 ? (
                    <span className="text-red-500">{globalStats.offlineLights}</span>
                  ) : (
                    <span className="text-green-500">OK</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {globalStats.offlineLights > 0
                    ? tr("dispositivos offline", "devices offline")
                    : tr("tudo online", "all online")}
                </p>
              </div>
              <Zap className={cn(
                "w-10 h-10",
                globalStats.offlineLights > 0 ? "text-red-500/30" : "text-green-500/30"
              )} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Store Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{tr("As Suas Lojas", "Your Stores")}</h2>
          <Link href="/stores">
            <Button variant="ghost" size="sm" className="gap-1">
              {tr("Ver todas", "View all")}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {storeStats.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Store className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {tr("Ainda não tem lojas", "No stores yet")}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                {tr(
                  "Crie a sua primeira loja para começar a gerir luzes e dispositivos.",
                  "Create your first store to start managing lights and devices."
                )}
              </p>
              <Button asChild>
                <Link href="/stores">
                  <Plus className="w-4 h-4 mr-2" />
                  {tr("Criar Loja", "Create Store")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {storeStats.map((store) => (
              <Card
                key={store.id}
                className="group hover:shadow-lg hover:border-primary/30 transition-all duration-200 overflow-hidden"
              >
                {/* Store Header with gradient */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Store className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{store.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {store.totalSpaces} {tr("espaços", "spaces")}
                        </p>
                      </div>
                    </div>
                    {store.offlineLights > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {store.offlineLights} offline
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-4 space-y-4">
                  {/* Device Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="text-lg font-semibold">
                          {store.activeLights}/{store.totalLights}
                        </p>
                        <p className="text-xs text-muted-foreground">{tr("Luzes", "Lights")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10">
                      <Monitor className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-lg font-semibold">
                          {store.onlineTvs}/{store.totalTvs}
                        </p>
                        <p className="text-xs text-muted-foreground">TVs</p>
                      </div>
                    </div>
                  </div>

                  {/* Spaces Preview */}
                  {store.locations.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {tr("Espaços", "Spaces")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {store.locations.slice(0, 4).map((loc) => (
                          <Link key={loc.id} href={`/location/${loc.id}`}>
                            <Badge
                              variant="secondary"
                              className="cursor-pointer hover:bg-primary/20 transition-colors"
                            >
                              <MapPin className="w-3 h-3 mr-1" />
                              {loc.name}
                            </Badge>
                          </Link>
                        ))}
                        {store.locations.length > 4 && (
                          <Badge variant="outline" className="text-muted-foreground">
                            +{store.locations.length - 4}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => toggleStoreLightsMutation.mutate({ turnOn: true, companyId: store.id })}
                      disabled={toggleStoreLightsMutation.isPending || store.totalLights === 0}
                    >
                      <Power className="w-4 h-4 text-green-500" />
                      {tr("Ligar", "On")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => toggleStoreLightsMutation.mutate({ turnOn: false, companyId: store.id })}
                      disabled={toggleStoreLightsMutation.isPending || store.totalLights === 0}
                    >
                      <PowerOff className="w-4 h-4 text-red-500" />
                      {tr("Desligar", "Off")}
                    </Button>
                    <Link href={`/store/${store.id}`}>
                      <Button variant="default" size="sm" className="gap-2">
                        <Eye className="w-4 h-4" />
                        {tr("Abrir", "Open")}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Row: Activity + Quick Links */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {tr("Atividade Recente", "Recent Activity")}
            </CardTitle>
            <CardDescription>
              {tr("Últimas ações no sistema", "Latest actions in the system")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    activity.action === "light_on" ? "bg-green-500" :
                    activity.action === "light_off" ? "bg-red-500" :
                    "bg-blue-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user}</span>
                      <span className="text-muted-foreground mx-1">
                        {activity.action === "light_on" && tr("ligou", "turned on")}
                        {activity.action === "light_off" && tr("desligou", "turned off")}
                        {activity.action === "brightness" && tr("ajustou", "adjusted")}
                        {activity.action === "schedule" && tr("criou", "created")}
                      </span>
                      <span className="font-medium">{activity.target}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.store}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {tr("há", "")} {activity.time} {language === "en" && "ago"}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/logs">
              <Button variant="ghost" size="sm" className="w-full mt-4 gap-2">
                {tr("Ver histórico completo", "View full history")}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{tr("Acesso Rápido", "Quick Access")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/search">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Building2 className="w-4 h-4" />
                {tr("Pesquisar Dispositivos", "Search Devices")}
              </Button>
            </Link>
            <Link href="/energy">
              <Button variant="outline" className="w-full justify-start gap-3">
                <BarChart3 className="w-4 h-4" />
                {tr("Consumo Energético", "Energy Usage")}
              </Button>
            </Link>
            <Link href="/ha">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Zap className="w-4 h-4" />
                {tr("Dashboard de Controlo", "Control Dashboard")}
              </Button>
            </Link>
            <Link href="/members">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Settings className="w-4 h-4" />
                {tr("Gestão de Utilizadores", "User Management")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
