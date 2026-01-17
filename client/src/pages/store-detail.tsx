import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Store,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  RefreshCw,
  MapPin,
  Lightbulb,
  Monitor,
  ChevronRight,
  Zap,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  LineChart as LineChartIcon,
  History,
  Power,
  Sun,
  Palette,
  Timer,
  UserPlus,
  Download,
  Filter,
  Loader2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { Company, Location, Light, Tv, Organization } from "@shared/schema";
import { apiUrl, getToken } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────
// Mock data generators for store-specific energy & logs
// ─────────────────────────────────────────────────────────────

function generateMockHourlyData(seed: string, days: number = 1) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 9973;

  const data = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      date.setHours(h, 0, 0, 0);

      let baseUsage = 0.5;
      if (h >= 8 && h <= 20) {
        baseUsage = 2 + Math.sin((h - 8) * Math.PI / 12) * 1.5;
      } else if (h >= 6 && h < 8) {
        baseUsage = 1 + (h - 6) * 0.5;
      } else if (h > 20 && h <= 22) {
        baseUsage = 1.5 - (h - 20) * 0.5;
      }
      // Add deterministic "randomness"
      const noise = ((hash + h + d * 24) % 100) / 200 - 0.25;
      const usage = Math.max(0.1, baseUsage + noise);

      data.push({
        timestamp: date.toISOString(),
        hour: h,
        day: d,
        kwh: parseFloat(usage.toFixed(2)),
        cost: parseFloat((usage * 0.15).toFixed(2)),
      });
    }
  }
  return data.reverse();
}

function generateMockDailyData(seed: string, days: number = 30) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 9973;

  const data = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const noise = ((hash + d) % 100) / 10;
    const baseUsage = isWeekend ? 15 + noise : 25 + noise;

    data.push({
      date: date.toISOString().split("T")[0],
      dayOfWeek: date.getDay(),
      kwh: parseFloat(baseUsage.toFixed(2)),
      cost: parseFloat((baseUsage * 0.15).toFixed(2)),
    });
  }
  return data.reverse();
}

type ActivityLog = {
  id: string;
  userId: string;
  username: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  details: string;
  ipAddress: string;
  createdAt: string;
  storeName?: string;
};

function generateMockStoreLogs(storeId: string, storeName: string): ActivityLog[] {
  let hash = 0;
  for (let i = 0; i < storeId.length; i++) hash = (hash * 31 + storeId.charCodeAt(i)) % 9973;

  const users = [
    { id: "1", username: "admin" },
    { id: "2", username: "joao.silva" },
    { id: "3", username: "maria.santos" },
  ];

  const actions = [
    { action: "light_on", entityType: "light", details: '{"brightness": 100}' },
    { action: "light_off", entityType: "light", details: "{}" },
    { action: "brightness_changed", entityType: "light", details: '{"from": 50, "to": 80}' },
    { action: "color_changed", entityType: "light", details: '{"from": "#ffffff", "to": "#ffd700"}' },
    { action: "schedule_created", entityType: "schedule", details: '{"time": "08:00", "action": "turn_on"}' },
  ];

  const lights = ["Backlight", "Shelves", "Sides light", "Main Display", "Entrance"];

  const logs: ActivityLog[] = [];
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const userIdx = (hash + i) % users.length;
    const actionIdx = (hash + i * 3) % actions.length;
    const lightIdx = (hash + i * 7) % lights.length;

    const createdAt = new Date(now);
    createdAt.setMinutes(createdAt.getMinutes() - i * ((hash % 20) + 10));

    logs.push({
      id: `log-${storeId}-${i}`,
      userId: users[userIdx].id,
      username: users[userIdx].username,
      action: actions[actionIdx].action,
      entityType: actions[actionIdx].entityType,
      entityId: `entity-${i}`,
      entityName: actions[actionIdx].entityType === "light" ? lights[lightIdx] : `Schedule ${i}`,
      details: actions[actionIdx].details,
      ipAddress: `192.168.1.${(hash + i) % 254 + 1}`,
      createdAt: createdAt.toISOString(),
      storeName,
    });
  }

  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ─────────────────────────────────────────────────────────────
// Simple chart components (same as energy.tsx)
// ─────────────────────────────────────────────────────────────

function BarChartSimple({
  data,
  dataKey,
  color = "#3b82f6",
  height = 180,
}: {
  data: any[];
  dataKey: string;
  color?: string;
  height?: number;
}) {
  const maxValue = Math.max(...data.map((d) => d[dataKey]), 1);

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-between h-full gap-0.5">
        {data.slice(-24).map((item, index) => {
          const barHeight = (item[dataKey] / maxValue) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full rounded-t transition-all hover:opacity-80"
                style={{ backgroundColor: color, height: `${barHeight}%` }}
                title={`${item[dataKey]} kWh`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>0h</span>
        <span>12h</span>
        <span>23h</span>
      </div>
    </div>
  );
}

function LineChartSimple({
  data,
  dataKey,
  color = "#10b981",
  height = 180,
}: {
  data: any[];
  dataKey: string;
  color?: string;
  height?: number;
}) {
  const maxValue = Math.max(...data.map((d) => d[dataKey]), 1);
  const minValue = Math.min(...data.map((d) => d[dataKey]));
  const range = maxValue - minValue || 1;

  const points = data
    .slice(-30)
    .map((d, i, arr) => {
      const x = (i / (arr.length - 1 || 1)) * 100;
      const y = 100 - ((d[dataKey] - minValue) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="w-full" style={{ height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>-30d</span>
        <span>Hoje</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Action icons for logs table
// ─────────────────────────────────────────────────────────────

const actionIcons: { [key: string]: React.ReactNode } = {
  light_on: <Power className="w-4 h-4 text-green-500" />,
  light_off: <Power className="w-4 h-4 text-red-500" />,
  brightness_changed: <Sun className="w-4 h-4 text-yellow-500" />,
  color_changed: <Palette className="w-4 h-4 text-purple-500" />,
  schedule_created: <Timer className="w-4 h-4 text-blue-500" />,
  schedule_deleted: <Timer className="w-4 h-4 text-red-500" />,
  user_created: <UserPlus className="w-4 h-4 text-green-500" />,
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export default function StoreDetail() {
  const [, params] = useRoute("/store/:id");
  const storeId = params?.id;
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dashboardKey, setDashboardKey] = useState(0);
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today");
  const [logPage, setLogPage] = useState(1);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [dashboardLoaded, setDashboardLoaded] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(tr("A inicializar...", "Initializing..."));

  // Loading messages rotation
  useEffect(() => {
    if (!isDashboardLoading) return;

    const messages = [
      tr("A inicializar...", "Initializing..."),
      tr("A conectar ao sistema...", "Connecting to the system..."),
      tr("A carregar dashboard...", "Loading dashboard..."),
      tr("A preparar interface...", "Preparing interface..."),
      tr("Quase pronto...", "Almost ready..."),
    ];

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isDashboardLoading]);

  const handleDashboardLoad = () => {
    // If already loaded once, don't show loading again
    if (dashboardLoaded) {
      setIsDashboardLoading(false);
      return;
    }
    setLoadingMessage(tr("A finalizar...", "Finalizing..."));
    setTimeout(() => {
      setIsDashboardLoading(false);
      setDashboardLoaded(true);
    }, 3000);
  };

  const refreshDashboard = () => {
    setDashboardLoaded(false); // Force full reload
    setIsDashboardLoading(true);
    setLoadingMessage(tr("A inicializar...", "Initializing..."));
    setDashboardKey((prev) => prev + 1);
  };

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch store (company)
  const { data: store } = useQuery<Company>({
    queryKey: ["/api/companies", storeId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/companies/${storeId}`), { headers });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!storeId,
  });

  // Fetch organization for breadcrumb
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const organization = organizations.find((o) => o.id === store?.organizationId);

  // Fetch locations for this store
  const { data: allLocations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });
  const storeLocations = allLocations.filter((l) => l.companyId === storeId);

  // Fetch lights & TVs
  const { data: allLights = [] } = useQuery<Light[]>({
    queryKey: ["/api/lights"],
  });
  const { data: allTvs = [] } = useQuery<Tv[]>({
    queryKey: ["/api/tvs"],
  });

  const locationIds = storeLocations.map((l) => l.id);
  const storeLights = allLights.filter((l) => locationIds.includes(l.locationId));
  const storeTvs = allTvs.filter((t) => locationIds.includes(t.locationId));

  // Mock energy data
  const hourlyData = useMemo(() => generateMockHourlyData(storeId || "x", 1), [storeId]);
  const dailyData = useMemo(() => generateMockDailyData(storeId || "x", 30), [storeId]);
  const todayTotal = hourlyData.reduce((s, d) => s + d.kwh, 0);
  const weekTotal = dailyData.slice(-7).reduce((s, d) => s + d.kwh, 0);
  const monthTotal = dailyData.reduce((s, d) => s + d.kwh, 0);

  // Mock logs data
  const logs = useMemo(
    () => generateMockStoreLogs(storeId || "x", store?.name || "Store"),
    [storeId, store?.name]
  );
  const logsPerPage = 10;
  const paginatedLogs = logs.slice((logPage - 1) * logsPerPage, logPage * logsPerPage);
  const totalLogPages = Math.ceil(logs.length / logsPerPage);

  if (!store) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{tr("A carregar...", "Loading...")}</p>
      </div>
    );
  }

  // Dashboard URL & cropping (same as home-assistant.tsx)
  // Use the same dashboard/view parameters as the main control dashboard
  const params = new URLSearchParams();
  params.set("dashboard", "dashboard-conex");
  params.set("view", "aa");
  const dashboardUrl = `${apiUrl("/api/ha/dashboard")}?${params.toString()}`;
  const HA_LEFT_CHROME_PX = 285; // Match home-assistant.tsx
  const HA_TOP_CHROME_PX = 56;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString(language === "pt" ? "pt-PT" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(language === "pt" ? "pt-PT" : "en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  const actionLabels: { [key: string]: { pt: string; en: string } } = {
    light_on: { pt: "Luz ligada", en: "Light on" },
    light_off: { pt: "Luz desligada", en: "Light off" },
    brightness_changed: { pt: "Brilho alterado", en: "Brightness changed" },
    color_changed: { pt: "Cor alterada", en: "Color changed" },
    schedule_created: { pt: "Agendamento criado", en: "Schedule created" },
    schedule_deleted: { pt: "Agendamento eliminado", en: "Schedule deleted" },
    user_created: { pt: "Utilizador criado", en: "User created" },
  };

  return (
    <div className="space-y-6">
      {/* Clickable Breadcrumbs */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            {tr("Dashboard", "Dashboard")}
          </Link>
          <span>/</span>
          <Link href="/stores" className="hover:text-foreground transition-colors">
            {tr("Lojas", "Stores")}
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{store.name}</span>
        </nav>
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">{store.name}</h1>
        </div>
        {store.description && (
          <p className="text-sm text-muted-foreground mt-1">{store.description}</p>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="w-4 h-4" />
            {tr("Dashboard", "Dashboard")}
          </TabsTrigger>
          <TabsTrigger value="spaces" className="gap-2">
            <MapPin className="w-4 h-4" />
            {tr("Espaços", "Spaces")}
            <Badge variant="secondary" className="ml-1">
              {storeLocations.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="energy" className="gap-2">
            <Zap className="w-4 h-4" />
            {tr("Energia", "Energy")}
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="w-4 h-4" />
            {tr("Logs", "Logs")}
          </TabsTrigger>
        </TabsList>

        {/* ─────────────────────────────────────────────────────── */}
        {/* Dashboard Tab - forceMount to keep iframe alive */}
        {/* ─────────────────────────────────────────────────────── */}
        <TabsContent value="dashboard" forceMount className={activeTab === "dashboard" ? "space-y-4" : "hidden"}>
          <Card className={isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {tr("Dashboard de Controlo", "Control Dashboard")}
                </CardTitle>
                <CardDescription>
                  {tr("Monitorização e controlo em tempo real", "Real-time monitoring and control")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={refreshDashboard}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div
                className={`relative bg-[#1c1c1c] rounded-b-lg overflow-hidden ${
                  isFullscreen ? "h-[calc(100vh-80px)]" : "h-[600px]"
                }`}
              >
                {/* Custom Loading Overlay - hides HA branding during load */}
                {isDashboardLoading && (
                  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#1c1c1c]">
                    <div className="flex flex-col items-center gap-6">
                      {/* Brand logo */}
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                          <Zap className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute -inset-2 rounded-3xl border-2 border-cyan-500/30 animate-ping" />
                      </div>

                      <div className="text-center">
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                          CtrlX
                        </h2>
                      </div>

                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
                        <span className="text-sm">{loadingMessage}</span>
                      </div>

                      <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                          style={{
                            animation: "loading-progress 2s ease-in-out infinite",
                          }}
                        />
                      </div>
                    </div>

                    <div className="absolute inset-0 -z-10 opacity-5">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                          backgroundSize: "40px 40px",
                        }}
                      />
                    </div>
                  </div>
                )}

                <iframe
                  key={dashboardKey}
                  src={dashboardUrl}
                  className="border-0"
                  style={{
                    width: `calc(100% + ${HA_LEFT_CHROME_PX}px)`,
                    height: `calc(100% + ${HA_TOP_CHROME_PX}px)`,
                    transform: `translate(-${HA_LEFT_CHROME_PX}px, -${HA_TOP_CHROME_PX}px)`,
                    opacity: isDashboardLoading ? 0 : 1,
                    transition: "opacity 0.3s ease-in-out",
                  }}
                  title="Dashboard de Controlo"
                  allow="fullscreen"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  onLoad={handleDashboardLoad}
                />
              </div>

              <style>{`
                @keyframes loading-progress {
                  0% { width: 20%; margin-left: 0; }
                  50% { width: 60%; margin-left: 20%; }
                  100% { width: 20%; margin-left: 80%; }
                }
              `}</style>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────── */}
        {/* Spaces Tab */}
        {/* ─────────────────────────────────────────────────────── */}
        <TabsContent value="spaces" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{tr("Total Espaços", "Total Spaces")}</p>
                    <p className="text-2xl font-bold">{storeLocations.length}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{tr("Luzes", "Lights")}</p>
                    <p className="text-2xl font-bold">
                      {storeLights.filter((l) => l.isOn).length}/{storeLights.length}
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
                    <p className="text-sm text-muted-foreground">{tr("TVs", "TVs")}</p>
                    <p className="text-2xl font-bold">
                      {storeTvs.filter((t) => t.status === "online").length}/{storeTvs.length}
                    </p>
                  </div>
                  <Monitor className="w-8 h-8 text-blue-500/20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Location list */}
          {storeLocations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">{tr("Ainda sem espaços", "No spaces yet")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {storeLocations.map((loc) => {
                const locLights = allLights.filter((l) => l.locationId === loc.id);
                const locTvs = allTvs.filter((t) => t.locationId === loc.id);
                return (
                  <Link key={loc.id} href={`/location/${loc.id}`}>
                    <Card className="cursor-pointer hover:shadow-md transition-shadow group">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-medium flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            {loc.name}
                          </CardTitle>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {loc.description && (
                          <CardDescription className="line-clamp-1">{loc.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Lightbulb className="w-4 h-4 text-yellow-500" />
                            {locLights.filter((l) => l.isOn).length}/{locLights.length}
                          </div>
                          <div className="flex items-center gap-1">
                            <Monitor className="w-4 h-4 text-blue-500" />
                            {locTvs.filter((t) => t.status === "online").length}/{locTvs.length}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─────────────────────────────────────────────────────── */}
        {/* Energy Tab */}
        {/* ─────────────────────────────────────────────────────── */}
        <TabsContent value="energy" className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium">{tr("Consumo Energético", "Energy Consumption")}</h2>
              <p className="text-sm text-muted-foreground">
                {tr("Dados mockados para esta loja", "Mock data for this store")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{tr("Hoje", "Today")}</SelectItem>
                  <SelectItem value="week">{tr("Semana", "Week")}</SelectItem>
                  <SelectItem value="month">{tr("Mês", "Month")}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                {tr("Exportar", "Export")}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{tr("Consumo Hoje", "Today's Usage")}</p>
                    <p className="text-2xl font-bold">{todayTotal.toFixed(1)} kWh</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ €{(todayTotal * 0.15).toFixed(2)}
                    </p>
                  </div>
                  <Zap className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{tr("Esta Semana", "This Week")}</p>
                    <p className="text-2xl font-bold">{weekTotal.toFixed(1)} kWh</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-green-500/60" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{tr("Este Mês", "This Month")}</p>
                    <p className="text-2xl font-bold">{monthTotal.toFixed(1)} kWh</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-primary/40" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{tr("Luzes Ativas", "Active Lights")}</p>
                    <p className="text-2xl font-bold">
                      {storeLights.filter((l) => l.isOn).length}/{storeLights.length}
                    </p>
                  </div>
                  <Lightbulb className="w-8 h-8 text-yellow-500/40" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  {tr("Consumo por Hora", "Hourly Usage")}
                </CardTitle>
                <CardDescription>{tr("Últimas 24 horas", "Last 24 hours")}</CardDescription>
              </CardHeader>
              <CardContent>
                <BarChartSimple data={hourlyData} dataKey="kwh" color="#f59e0b" height={180} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LineChartIcon className="w-5 h-5" />
                  {tr("Consumo Diário", "Daily Usage")}
                </CardTitle>
                <CardDescription>{tr("Últimos 30 dias", "Last 30 days")}</CardDescription>
              </CardHeader>
              <CardContent>
                <LineChartSimple data={dailyData} dataKey="kwh" color="#10b981" height={180} />
              </CardContent>
            </Card>
          </div>

          {/* Devices Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                {tr("Resumo de Dispositivos", "Devices Summary")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {storeLights.slice(0, 6).map((light) => {
                  const mockWatts = 10 + (light.id.charCodeAt(0) % 30);
                  return (
                    <div
                      key={light.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            light.isOn ? "bg-green-500 animate-pulse" : "bg-gray-400"
                          }`}
                        />
                        <span className="text-sm truncate">{light.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {mockWatts}W
                      </Badge>
                    </div>
                  );
                })}
              </div>
              {storeLights.length > 6 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  +{storeLights.length - 6} {tr("mais dispositivos", "more devices")}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─────────────────────────────────────────────────────── */}
        {/* Logs Tab */}
        {/* ─────────────────────────────────────────────────────── */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">{tr("Registo de Atividade", "Activity Log")}</h2>
              <p className="text-sm text-muted-foreground">
                {tr("Histórico de ações nesta loja", "Action history for this store")}
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              {tr("Exportar", "Export")}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tr("Hora", "Time")}</TableHead>
                    <TableHead>{tr("Utilizador", "User")}</TableHead>
                    <TableHead>{tr("Ação", "Action")}</TableHead>
                    <TableHead>{tr("Entidade", "Entity")}</TableHead>
                    <TableHead className="hidden md:table-cell">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">{formatTime(log.createdAt)}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</div>
                      </TableCell>
                      <TableCell className="font-medium">{log.username}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {actionIcons[log.action] || <Filter className="w-4 h-4" />}
                          <span className="text-sm">
                            {actionLabels[log.action]?.[language] || log.action}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.entityName}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {log.ipAddress}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalLogPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                disabled={logPage === 1}
              >
                {tr("Anterior", "Previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {logPage} / {totalLogPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                disabled={logPage === totalLogPages}
              >
                {tr("Seguinte", "Next")}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
