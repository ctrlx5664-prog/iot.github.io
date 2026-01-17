import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Monitor,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Tv,
  Film,
  Image,
  Upload,
  Settings,
  Store,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { getToken, apiUrl } from "@/lib/auth";
import type { Company, Location, Tv as TvType } from "@shared/schema";

export default function MediaDashboard() {
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [activeTab, setActiveTab] = useState("overview");

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch companies (stores)
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

  // Fetch TVs
  const { data: tvs = [] } = useQuery<TvType[]>({
    queryKey: ["/api/tvs"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/tvs"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const stats = {
    totalTvs: tvs.length,
    onlineTvs: tvs.filter((t) => t.status === "online").length,
    offlineTvs: tvs.filter((t) => t.status === "offline").length,
    playingTvs: tvs.filter((t) => t.isPlaying).length,
  };

  // Group TVs by store
  const tvsByStore = companies.map((company) => {
    const storeLocations = locations.filter((l) => l.companyId === company.id);
    const locationIds = storeLocations.map((l) => l.id);
    const storeTvs = tvs.filter((t) => locationIds.includes(t.locationId));
    return {
      store: company,
      tvs: storeTvs,
      online: storeTvs.filter((t) => t.status === "online").length,
      offline: storeTvs.filter((t) => t.status === "offline").length,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {tr("Media Dashboard", "Media Dashboard")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr("Gestão centralizada de conteúdos multimédia", "Centralized multimedia content management")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/media/content">
              <Upload className="w-4 h-4 mr-2" />
              {tr("Gerir Conteúdos", "Manage Content")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/media/playlists">
              <Film className="w-4 h-4 mr-2" />
              {tr("Playlists", "Playlists")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Total Ecrãs", "Total Screens")}</p>
                <p className="text-2xl font-bold">{stats.totalTvs}</p>
              </div>
              <Monitor className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Online", "Online")}</p>
                <p className="text-2xl font-bold text-green-500">{stats.onlineTvs}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("A Reproduzir", "Playing")}</p>
                <p className="text-2xl font-bold text-blue-500">{stats.playingTvs}</p>
              </div>
              <Play className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Offline", "Offline")}</p>
                <p className="text-2xl font-bold text-red-500">{stats.offlineTvs}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors cursor-pointer" asChild>
          <Link href="/media/content">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Film className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">{tr("Conteúdos", "Content")}</CardTitle>
                  <CardDescription>{tr("Vídeos e imagens", "Videos and images")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{tr("Ficheiros", "Files")}</span>
                <Badge variant="secondary">24</Badge>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer" asChild>
          <Link href="/media/playlists">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Play className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">{tr("Playlists", "Playlists")}</CardTitle>
                  <CardDescription>{tr("Sequências de conteúdo", "Content sequences")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{tr("Playlists ativas", "Active playlists")}</span>
                <Badge variant="secondary">8</Badge>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors cursor-pointer" asChild>
          <Link href="/media/schedules">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">{tr("Agendamentos", "Schedules")}</CardTitle>
                  <CardDescription>{tr("Programação automática", "Automatic programming")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{tr("Agendamentos", "Schedules")}</span>
                <Badge variant="secondary">12</Badge>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* TVs by Store */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="w-5 h-5" />
            {tr("Ecrãs por Loja", "Screens by Store")}
          </CardTitle>
          <CardDescription>
            {tr("Estado dos ecrãs em cada loja", "Screen status in each store")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tvsByStore.map(({ store, tvs: storeTvs, online, offline }) => (
              <div key={store.id} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Store className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{store.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {storeTvs.length} {tr("ecrãs", "screens")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-500">{online}</span>
                    </div>
                    {offline > 0 && (
                      <div className="flex items-center gap-1 text-sm">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-red-500">{offline}</span>
                      </div>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/store/${store.id}`}>
                        {tr("Ver", "View")}
                      </Link>
                    </Button>
                  </div>
                </div>
                {storeTvs.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {storeTvs.slice(0, 6).map((tv) => (
                      <div
                        key={tv.id}
                        className={`p-2 rounded border text-center ${
                          tv.status === "online" ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"
                        }`}
                      >
                        <Monitor className={`w-4 h-4 mx-auto mb-1 ${tv.status === "online" ? "text-green-500" : "text-red-500"}`} />
                        <p className="text-xs truncate">{tv.name}</p>
                        {tv.isPlaying && (
                          <Badge variant="outline" className="text-[10px] mt-1">
                            <Play className="w-2 h-2 mr-1" />
                            {tr("A reproduzir", "Playing")}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {storeTvs.length > 6 && (
                      <div className="p-2 rounded border border-dashed text-center flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">
                          +{storeTvs.length - 6} {tr("mais", "more")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {tvsByStore.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {tr("Nenhum ecrã configurado", "No screens configured")}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
