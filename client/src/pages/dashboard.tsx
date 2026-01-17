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
  Check,
  Power,
  PowerOff,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Star,
  StarOff,
  ChevronRight,
  Clock,
  Activity,
} from "lucide-react";
import type { Company, Location, Light, Tv } from "@shared/schema";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Mock data for alerts and recent activity
function generateMockAlerts(lights: Light[], tvs: Tv[]) {
  const alerts: Array<{
    id: string;
    type: "warning" | "error" | "info";
    message: string;
    messageEn: string;
    time: string;
  }> = [];

  const offlineLights = lights.filter((l) => l.status === "offline");
  const offlineTvs = tvs.filter((t) => t.status === "offline");

  if (offlineLights.length > 0) {
    alerts.push({
      id: "alert-1",
      type: "error",
      message: `${offlineLights.length} luz(es) offline`,
      messageEn: `${offlineLights.length} light(s) offline`,
      time: "5m",
    });
  }

  if (offlineTvs.length > 0) {
    alerts.push({
      id: "alert-2",
      type: "error",
      message: `${offlineTvs.length} TV(s) offline`,
      messageEn: `${offlineTvs.length} TV(s) offline`,
      time: "12m",
    });
  }

  // Add some mock alerts
  alerts.push({
    id: "alert-3",
    type: "warning",
    message: "Consumo elevado detectado na Loja Lisboa",
    messageEn: "High consumption detected at Lisbon Store",
    time: "1h",
  });

  alerts.push({
    id: "alert-4",
    type: "info",
    message: "Agendamento 'Abertura' executado com sucesso",
    messageEn: "Schedule 'Opening' executed successfully",
    time: "2h",
  });

  return alerts;
}

function generateMockActivity() {
  return [
    {
      id: "act-1",
      action: "light_on",
      user: "admin",
      target: "Backlight",
      time: "há 5 min",
      timeEn: "5 min ago",
    },
    {
      id: "act-2",
      action: "brightness_changed",
      user: "joao.silva",
      target: "Main Display",
      time: "há 15 min",
      timeEn: "15 min ago",
    },
    {
      id: "act-3",
      action: "schedule_created",
      user: "admin",
      target: "Modo Noite",
      time: "há 1h",
      timeEn: "1h ago",
    },
    {
      id: "act-4",
      action: "light_off",
      user: "maria.santos",
      target: "Entrance",
      time: "há 2h",
      timeEn: "2h ago",
    },
  ];
}

// Get favorites from localStorage
function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem("favorites") || "[]");
  } catch {
    return [];
  }
}

function setFavorites(ids: string[]) {
  localStorage.setItem("favorites", JSON.stringify(ids));
}

export default function Dashboard() {
  const { language } = useTranslation();
  const { toast } = useToast();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [favorites, setFavoritesState] = useState<string[]>(getFavorites);

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

  const onlineLights = lights.filter((l) => l.status === "online").length;
  const offlineLights = lights.filter((l) => l.status === "offline").length;
  const onlineTvs = tvs.filter((t) => t.status === "online").length;
  const offlineTvs = tvs.filter((t) => t.status === "offline").length;
  const activeLights = lights.filter((l) => l.isOn).length;
  const totalDevices = lights.length + tvs.length;
  const offlineDevices = offlineLights + offlineTvs;

  const alerts = useMemo(() => generateMockAlerts(lights, tvs), [lights, tvs]);
  const recentActivity = useMemo(() => generateMockActivity(), []);

  // Toggle all lights mutation
  const toggleAllLightsMutation = useMutation({
    mutationFn: async ({ turnOn, companyId }: { turnOn: boolean; companyId?: string }) => {
      // Filter lights by company if specified
      let targetLights = lights.filter((l) => l.status === "online");
      if (companyId) {
        const companyLocationIds = locations
          .filter((loc) => loc.companyId === companyId)
          .map((loc) => loc.id);
        targetLights = targetLights.filter((l) => companyLocationIds.includes(l.locationId));
      }

      // Batch update all lights
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
    onError: () => {
      toast({
        title: tr("Erro", "Error"),
        description: tr("Falha ao controlar luzes", "Failed to control lights"),
        variant: "destructive",
      });
    },
  });

  const toggleFavorite = (id: string) => {
    const newFavorites = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [...favorites, id];
    setFavoritesState(newFavorites);
    setFavorites(newFavorites);
  };

  const favoriteLocations = locations.filter((l) => favorites.includes(l.id));
  const favoriteCompanies = companies.filter((c) => favorites.includes(c.id));

  const stats = [
    {
      title: tr("Lojas", "Stores"),
      value: companies.length,
      icon: Building2,
      description: tr(
        `${locations.length} espaços no total`,
        `${locations.length} total locations`
      ),
      color: "text-primary",
      bgColor: "from-blue-500/10 to-cyan-500/10",
    },
    {
      title: tr("Luzes Inteligentes", "Smart Lights"),
      value: lights.length,
      icon: Lightbulb,
      description: tr(
        `${activeLights} ligadas agora`,
        `${activeLights} currently on`
      ),
      color: "text-yellow-500",
      bgColor: "from-yellow-500/10 to-orange-500/10",
      badge: offlineLights > 0 ? offlineLights : undefined,
      badgeColor: "bg-red-500",
    },
    {
      title: tr("Televisões", "TV Displays"),
      value: tvs.length,
      icon: Monitor,
      description: tr(`${onlineTvs} online`, `${onlineTvs} online`),
      color: "text-blue-500",
      bgColor: "from-blue-500/10 to-indigo-500/10",
      badge: offlineTvs > 0 ? offlineTvs : undefined,
      badgeColor: "bg-red-500",
    },
    {
      title: tr("Estado dos Dispositivos", "Device Health"),
      value: `${Math.round(
        ((onlineLights + onlineTvs) / Math.max(totalDevices, 1)) * 100
      )}%`,
      icon: Check,
      description: tr(
        `${onlineLights + onlineTvs}/${totalDevices} dispositivos online`,
        `${onlineLights + onlineTvs}/${totalDevices} devices online`
      ),
      color: offlineDevices > 0 ? "text-yellow-500" : "text-green-500",
      bgColor: offlineDevices > 0 ? "from-yellow-500/10 to-orange-500/10" : "from-green-500/10 to-emerald-500/10",
    },
  ];

  // Get store stats for quick actions
  const storeStats = companies.map((company) => {
    const companyLocationIds = locations
      .filter((loc) => loc.companyId === company.id)
      .map((loc) => loc.id);
    const storeLights = lights.filter((l) => companyLocationIds.includes(l.locationId));
    const storeOnLights = storeLights.filter((l) => l.isOn).length;
    const storeOfflineLights = storeLights.filter((l) => l.status === "offline").length;

    return {
      ...company,
      totalLights: storeLights.length,
      onLights: storeOnLights,
      offlineLights: storeOfflineLights,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold text-foreground"
            data-testid="text-page-title"
          >
            {tr("Dashboard", "Dashboard")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tr(
              "Visão geral de todos os dispositivos nas suas localizações",
              "Overview of all IoT devices across your locations"
            )}
          </p>
        </div>

        {/* Global Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => toggleAllLightsMutation.mutate({ turnOn: true })}
            disabled={toggleAllLightsMutation.isPending || lights.length === 0}
          >
            <Power className="w-4 h-4 text-green-500" />
            {tr("Ligar Todas", "Turn All On")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => toggleAllLightsMutation.mutate({ turnOn: false })}
            disabled={toggleAllLightsMutation.isPending || lights.length === 0}
          >
            <PowerOff className="w-4 h-4 text-red-500" />
            {tr("Desligar Todas", "Turn All Off")}
          </Button>
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-4 overflow-x-auto">
              <div className="flex items-center gap-2 flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">{tr("Alertas", "Alerts")}</span>
              </div>
              <div className="flex items-center gap-3 flex-1">
                {alerts.slice(0, 3).map((alert) => (
                  <Badge
                    key={alert.id}
                    variant={alert.type === "error" ? "destructive" : "secondary"}
                    className="flex-shrink-0"
                  >
                    {language === "pt" ? alert.message : alert.messageEn}
                    <span className="ml-1 opacity-60">({alert.time})</span>
                  </Badge>
                ))}
              </div>
              {alerts.length > 3 && (
                <Link href="/logs">
                  <Button variant="ghost" size="sm" className="flex-shrink-0">
                    +{alerts.length - 3} {tr("mais", "more")}
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className={cn("bg-gradient-to-br", stat.bgColor)}
            data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="relative">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                {stat.badge && (
                  <span className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold text-white rounded-full flex items-center justify-center",
                    stat.badgeColor
                  )}>
                    {stat.badge}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions per Store */}
      {storeStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              {tr("Ações Rápidas por Loja", "Quick Actions by Store")}
            </CardTitle>
            <CardDescription>
              {tr("Controle rápido das luzes de cada loja", "Quick control of lights for each store")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {storeStats.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleFavorite(store.id)}
                      className="text-muted-foreground hover:text-yellow-500 transition-colors"
                    >
                      {favorites.includes(store.id) ? (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <Link href={`/store/${store.id}`}>
                        <p className="text-sm font-medium truncate hover:text-primary cursor-pointer">
                          {store.name}
                        </p>
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{store.onLights}/{store.totalLights} {tr("ligadas", "on")}</span>
                        {store.offlineLights > 0 && (
                          <Badge variant="destructive" className="text-[10px] h-4 px-1">
                            {store.offlineLights} offline
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleAllLightsMutation.mutate({ turnOn: true, companyId: store.id })}
                      disabled={toggleAllLightsMutation.isPending || store.totalLights === 0}
                      title={tr("Ligar todas", "Turn all on")}
                    >
                      <Power className="w-4 h-4 text-green-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleAllLightsMutation.mutate({ turnOn: false, companyId: store.id })}
                      disabled={toggleAllLightsMutation.isPending || store.totalLights === 0}
                      title={tr("Desligar todas", "Turn all off")}
                    >
                      <PowerOff className="w-4 h-4 text-red-500" />
                    </Button>
                    <Link href={`/store/${store.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Favorites Section */}
      {(favoriteLocations.length > 0 || favoriteCompanies.length > 0) && (
        <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              {tr("Favoritos", "Favorites")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {favoriteCompanies.map((company) => (
                <Link key={company.id} href={`/store/${company.id}`}>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="text-sm truncate">{company.name}</span>
                  </div>
                </Link>
              ))}
              {favoriteLocations.map((location) => {
                const company = companies.find((c) => c.id === location.companyId);
                return (
                  <Link key={location.id} href={`/location/${location.id}`}>
                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      <div className="min-w-0">
                        <p className="text-sm truncate">{location.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{company?.name}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {tr("Localizações Recentes", "Recent Locations")}
            </CardTitle>
            <CardDescription>
              {tr(
                "Acesso rápido às localizações dos dispositivos",
                "Quick access to your device locations"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {locations.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {tr("Ainda sem localizações", "No locations yet")}
                </p>
                <Link href="/companies">
                  <span
                    className="text-sm text-primary hover:underline mt-2 inline-block cursor-pointer"
                    data-testid="link-add-location"
                  >
                    {tr(
                      "Adicione a sua primeira loja e espaço",
                      "Add your first company and location"
                    )}
                  </span>
                </Link>
              </div>
            ) : (
              locations.slice(0, 5).map((location) => {
                const company = companies.find((c) => c.id === location.companyId);
                const locationLights = lights.filter((l) => l.locationId === location.id);
                const locationTvs = tvs.filter((t) => t.locationId === location.id);
                const hasOffline = locationLights.some((l) => l.status === "offline") ||
                                   locationTvs.some((t) => t.status === "offline");

                return (
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 border cursor-pointer group"
                  >
                    <Link href={`/location/${location.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(location.id);
                          }}
                          className="text-muted-foreground hover:text-yellow-500 transition-colors"
                        >
                          {favorites.includes(location.id) ? (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <StarOff className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{location.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{company?.name}</p>
                        </div>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      {hasOffline && (
                        <Badge variant="destructive" className="text-xs">
                          offline
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {tr(
                          `${locationLights.length + locationTvs.length} dispositivos`,
                          `${locationLights.length + locationTvs.length} devices`
                        )}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {tr("Atividade Recente", "Recent Activity")}
            </CardTitle>
            <CardDescription>
              {tr("Últimas ações no sistema", "Latest actions in the system")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 text-sm">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  activity.action === "light_on" ? "bg-green-500" :
                  activity.action === "light_off" ? "bg-red-500" :
                  "bg-blue-500"
                )} />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{activity.user}</span>
                  <span className="text-muted-foreground mx-1">
                    {activity.action === "light_on" && tr("ligou", "turned on")}
                    {activity.action === "light_off" && tr("desligou", "turned off")}
                    {activity.action === "brightness_changed" && tr("ajustou brilho de", "adjusted brightness of")}
                    {activity.action === "schedule_created" && tr("criou agendamento", "created schedule")}
                  </span>
                  <span className="font-medium">{activity.target}</span>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {language === "pt" ? activity.time : activity.timeEn}
                </span>
              </div>
            ))}
            <Link href="/logs">
              <Button variant="ghost" size="sm" className="w-full mt-2">
                {tr("Ver histórico completo", "View full history")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Device Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            {tr("Estado dos Dispositivos", "Device Status")}
          </CardTitle>
          <CardDescription>
            {tr("Monitorização em tempo real", "Real-time monitoring")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <div>
                <p className="text-sm font-medium">{tr("Online", "Online")}</p>
                <p className="text-2xl font-bold">{onlineLights + onlineTvs}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div>
                <p className="text-sm font-medium">{tr("Offline", "Offline")}</p>
                <p className="text-2xl font-bold">{offlineDevices}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">{tr("Luzes Ativas", "Lights Active")}</p>
                <p className="text-2xl font-bold">{activeLights}/{lights.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10">
              <Monitor className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">{tr("TVs a Reproduzir", "TVs Streaming")}</p>
                <p className="text-2xl font-bold">{tvs.filter((t) => t.currentVideoId).length}/{tvs.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
