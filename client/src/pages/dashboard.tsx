import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Lightbulb, Monitor, Check } from "lucide-react";
import type { Company, Location, Light, Tv } from "@shared/schema";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";

export default function Dashboard() {
  const { language } = useTranslation();
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

  const onlineLights = lights.filter((l) => l.status === "online").length;
  const onlineTvs = tvs.filter((t) => t.status === "online").length;
  const activeLights = lights.filter((l) => l.isOn).length;

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
    },
    {
      title: tr("Televisões", "TV Displays"),
      value: tvs.length,
      icon: Monitor,
      description: tr(`${onlineTvs} online`, `${onlineTvs} online`),
      color: "text-blue-500",
    },
    {
      title: tr("Estado dos Dispositivos", "Device Health"),
      value: `${Math.round(
        ((onlineLights + onlineTvs) / Math.max(lights.length + tvs.length, 1)) *
          100
      )}%`,
      icon: Check,
      description: tr(
        `${onlineLights + onlineTvs}/${lights.length + tvs.length} dispositivos online`,
        `${onlineLights + onlineTvs}/${lights.length + tvs.length} devices online`
      ),
      color: "text-green-500",
    },
  ];

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            data-testid={`card-stat-${stat.title
              .toLowerCase()
              .replace(/\s+/g, "-")}`}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-semibold"
                data-testid={`text-stat-${stat.title
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
                const company = companies.find(
                  (c) => c.id === location.companyId
                );
                const locationLights = lights.filter(
                  (l) => l.locationId === location.id
                );
                const locationTvs = tvs.filter(
                  (t) => t.locationId === location.id
                );

                return (
                  <Link key={location.id} href={`/location/${location.id}`}>
                    <div
                      className="flex items-center justify-between p-3 rounded-md hover-elevate active-elevate-2 border cursor-pointer"
                      data-testid={`card-location-${location.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {location.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {company?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {tr(
                            `${locationLights.length + locationTvs.length} dispositivos`,
                            `${locationLights.length + locationTvs.length} devices`
                          )}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {tr("Estado dos Dispositivos", "Device Status")}
            </CardTitle>
            <CardDescription>
              {tr("Monitorização em tempo real", "Real-time monitoring")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm">{tr("Online", "Online")}</span>
                </div>
                <span className="text-sm font-medium">
                  {tr(
                    `${onlineLights + onlineTvs} dispositivos`,
                    `${onlineLights + onlineTvs} devices`
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm">{tr("Offline", "Offline")}</span>
                </div>
                <span className="text-sm font-medium">
                  {tr(
                    `${lights.length + tvs.length - onlineLights - onlineTvs} dispositivos`,
                    `${lights.length + tvs.length - onlineLights - onlineTvs} devices`
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">{tr("Luzes Ativas", "Lights Active")}</span>
                </div>
                <span className="text-sm font-medium">
                  {activeLights}/{lights.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">{tr("TVs a Reproduzir", "TVs Streaming")}</span>
                </div>
                <span className="text-sm font-medium">
                  {tvs.filter((t) => t.currentVideoId).length}/{tvs.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
