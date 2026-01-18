import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Calendar,
  Lightbulb,
  Store,
  BarChart3,
  LineChart,
  PieChart,
  Download,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { Company, Location, Light } from "@shared/schema";

// Mock data generator for charts
function generateMockHourlyData(days: number = 1) {
  const data = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    for (let h = 0; h < 24; h++) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      date.setHours(h, 0, 0, 0);
      
      // Simulate usage pattern - higher during business hours
      let baseUsage = 0.5;
      if (h >= 8 && h <= 20) {
        baseUsage = 2 + Math.sin((h - 8) * Math.PI / 12) * 1.5;
      } else if (h >= 6 && h < 8) {
        baseUsage = 1 + (h - 6) * 0.5;
      } else if (h > 20 && h <= 22) {
        baseUsage = 1.5 - (h - 20) * 0.5;
      }
      
      // Add some randomness
      const usage = Math.max(0.1, baseUsage + (Math.random() - 0.5) * 0.5);
      
      data.push({
        timestamp: date.toISOString(),
        hour: h,
        day: d,
        kwh: parseFloat(usage.toFixed(2)),
        cost: parseFloat((usage * 0.15).toFixed(2)), // €0.15 per kWh
      });
    }
  }
  return data.reverse();
}

function generateMockDailyData(days: number = 30) {
  const data = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    
    // Weekend vs weekday pattern
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseUsage = isWeekend ? 15 + Math.random() * 5 : 25 + Math.random() * 10;
    
    data.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: date.getDay(),
      kwh: parseFloat(baseUsage.toFixed(2)),
      cost: parseFloat((baseUsage * 0.15).toFixed(2)),
      peakHours: parseFloat((baseUsage * 0.6).toFixed(2)),
      offPeakHours: parseFloat((baseUsage * 0.4).toFixed(2)),
    });
  }
  return data.reverse();
}

function generateMockStoreData(stores: { id: string; name: string }[]) {
  const fallbackStores = ['Lisbon Store', 'Porto Store', 'Coimbra Store', 'Faro Store'];
  const list = stores.length > 0 ? stores : fallbackStores.map((name, idx) => ({ id: `s-${idx}`, name }));
  return list.map(store => ({
    id: store.id,
    name: store.name,
    kwh: parseFloat((Math.random() * 100 + 50).toFixed(2)),
    lights: Math.floor(Math.random() * 20 + 5),
    avgBrightness: Math.floor(Math.random() * 40 + 50),
    hoursOn: parseFloat((Math.random() * 10 + 6).toFixed(1)),
  }));
}

// Simple Bar Chart Component
function BarChartSimple({ data, dataKey, xKey, color = "#3b82f6", height = 200 }: {
  data: any[];
  dataKey: string;
  xKey: string;
  color?: string;
  height?: number;
}) {
  const maxValue = Math.max(...data.map(d => d[dataKey]));
  
  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-between h-full gap-1">
        {data.slice(-24).map((item, index) => {
          const barHeight = (item[dataKey] / maxValue) * 100;
          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className="w-full rounded-t transition-all hover:opacity-80 cursor-pointer relative group"
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: color,
                  minHeight: 4,
                }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {item[dataKey]} kWh
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {typeof item[xKey] === 'number' ? `${item[xKey]}h` : item[xKey]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Simple Line Chart Component
function LineChartSimple({ data, dataKey, color = "#10b981", height = 200 }: {
  data: any[];
  dataKey: string;
  color?: string;
  height?: number;
}) {
  const maxValue = Math.max(...data.map(d => d[dataKey]));
  const minValue = Math.min(...data.map(d => d[dataKey]));
  const range = maxValue - minValue || 1;
  
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((item[dataKey] - minValue) / range) * 100;
    return { x, y, value: item[dataKey] };
  });
  
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  
  const areaD = `${pathD} L 100 100 L 0 100 Z`;
  
  return (
    <div className="w-full relative" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Area fill */}
        <path
          d={areaD}
          fill={color}
          fillOpacity={0.1}
        />
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={0.5}
          vectorEffect="non-scaling-stroke"
        />
        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={0.8}
            fill={color}
            className="hover:r-2 cursor-pointer"
          />
        ))}
      </svg>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-muted-foreground -translate-x-full pr-2">
        <span>{maxValue.toFixed(1)}</span>
        <span>{((maxValue + minValue) / 2).toFixed(1)}</span>
        <span>{minValue.toFixed(1)}</span>
      </div>
    </div>
  );
}

// Pie/Donut Chart Component
function DonutChart({ data, height = 200 }: {
  data: { name: string; value: number; color: string }[];
  height?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentAngle = 0;
  
  const segments = data.map(item => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (startAngle + angle - 90) * (Math.PI / 180);
    
    const x1 = 50 + 35 * Math.cos(startRad);
    const y1 = 50 + 35 * Math.sin(startRad);
    const x2 = 50 + 35 * Math.cos(endRad);
    const y2 = 50 + 35 * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    return {
      ...item,
      path: `M 50 50 L ${x1} ${y1} A 35 35 0 ${largeArc} 1 ${x2} ${y2} Z`,
      percentage: ((item.value / total) * 100).toFixed(1),
    };
  });
  
  return (
    <div className="flex items-center gap-4" style={{ height }}>
      <svg viewBox="0 0 100 100" className="w-32 h-32">
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.path}
            fill={seg.color}
            className="hover:opacity-80 transition-opacity cursor-pointer"
          />
        ))}
        {/* Center hole */}
        <circle cx="50" cy="50" r="20" fill="hsl(var(--background))" />
        <text x="50" y="53" textAnchor="middle" className="text-xs fill-current font-bold">
          {total.toFixed(0)}
        </text>
        <text x="50" y="60" textAnchor="middle" className="text-[6px] fill-muted-foreground">
          kWh
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-sm">{seg.name}</span>
            <span className="text-sm text-muted-foreground">{seg.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EnergyPage() {
  const { t, language } = useTranslation();
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month">("today");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");

  // Generate mock data
  const hourlyDataBase = useMemo(() => generateMockHourlyData(1), [refreshKey]);
  const dailyDataBase = useMemo(() => generateMockDailyData(30), [refreshKey]);

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const { data: lights = [] } = useQuery<Light[]>({
    queryKey: ['/api/lights'],
  });

  const storeData = useMemo(() => generateMockStoreData(companies), [companies, refreshKey]);
  const selectedStore = storeData.find((s) => s.id === selectedStoreId);
  const totalStoreKwh = storeData.reduce((sum, s) => sum + s.kwh, 0) || 1;
  const storeFactor = selectedStoreId === "all" ? 1 : (selectedStore?.kwh || 0) / totalStoreKwh;

  const hourlyData = useMemo(
    () => hourlyDataBase.map((d) => ({ ...d, kwh: parseFloat((d.kwh * storeFactor).toFixed(2)) })),
    [hourlyDataBase, storeFactor]
  );
  const dailyData = useMemo(
    () => dailyDataBase.map((d) => ({
      ...d,
      kwh: parseFloat((d.kwh * storeFactor).toFixed(2)),
      cost: parseFloat((d.cost * storeFactor).toFixed(2)),
      peakHours: parseFloat((d.peakHours * storeFactor).toFixed(2)),
      offPeakHours: parseFloat((d.offPeakHours * storeFactor).toFixed(2)),
    })),
    [dailyDataBase, storeFactor]
  );

  // Calculate totals
  const todayTotal = hourlyData.reduce((sum, d) => sum + d.kwh, 0);
  const weekTotal = dailyData.slice(-7).reduce((sum, d) => sum + d.kwh, 0);
  const monthTotal = dailyData.reduce((sum, d) => sum + d.kwh, 0);

  const activeLights = lights.filter(l => l.isOn).length;

  // Comparison with previous period (mock)
  const comparisonPercentage = -12.5; // 12.5% less than previous period

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("energy.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("energy.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">{t("energy.today")}</SelectItem>
              <SelectItem value="week">{t("energy.thisWeek")}</SelectItem>
              <SelectItem value="month">{t("energy.thisMonth")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
            <SelectTrigger className="w-[220px]">
              <Store className="w-4 h-4 mr-2" />
              <SelectValue placeholder={language === "pt" ? "Filtrar por loja" : "Filter by store"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === "pt" ? "Todas as lojas" : "All stores"}</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            {language === "pt" ? "Exportar" : "Export"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("energy.today")}</p>
                <p className="text-2xl font-bold">{todayTotal.toFixed(1)} kWh</p>
                <p className="text-xs text-muted-foreground mt-1">
                  €{(todayTotal * 0.15).toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/20">
                <Zap className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("energy.thisWeek")}</p>
                <p className="text-2xl font-bold">{weekTotal.toFixed(1)} kWh</p>
                <p className="text-xs text-muted-foreground mt-1">
                  €{(weekTotal * 0.15).toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/20">
                <BarChart3 className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("energy.thisMonth")}</p>
                <p className="text-2xl font-bold">{monthTotal.toFixed(1)} kWh</p>
                <p className="text-xs text-muted-foreground mt-1">
                  €{(monthTotal * 0.15).toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-500/20">
                <LineChart className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("energy.comparison")}</p>
                <div className="flex items-center gap-2">
                  {comparisonPercentage < 0 ? (
                    <TrendingDown className="w-5 h-5 text-green-500" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-red-500" />
                  )}
                  <p className={`text-2xl font-bold ${comparisonPercentage < 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {Math.abs(comparisonPercentage)}%
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === "pt" ? "vs. período anterior" : "vs. previous period"}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500/20">
                <PieChart className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hourly Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t("energy.hourlyUsage")}
            </CardTitle>
            <CardDescription>
              {language === "pt" ? "Consumo por hora hoje" : "Hourly consumption today"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartSimple
              data={hourlyData}
              dataKey="kwh"
              xKey="hour"
              color="#3b82f6"
              height={200}
            />
          </CardContent>
        </Card>

        {/* Daily Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LineChart className="w-5 h-5" />
              {t("energy.dailyUsage")}
            </CardTitle>
            <CardDescription>
              {language === "pt" ? "Consumo diário últimos 30 dias" : "Daily consumption last 30 days"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LineChartSimple
              data={dailyData}
              dataKey="kwh"
              color="#10b981"
              height={200}
            />
          </CardContent>
        </Card>
      </div>

      {/* Usage by Store */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="w-5 h-5" />
            {t("energy.byStore")}
          </CardTitle>
          <CardDescription>
            {language === "pt" ? "Consumo energético por loja" : "Energy consumption by store"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <DonutChart
              data={(selectedStoreId === "all" ? storeData : storeData.filter((s) => s.id === selectedStoreId)).map((s, i) => ({
                name: s.name,
                value: s.kwh,
                color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i % 4],
              }))}
              height={200}
            />
            <div className="space-y-3">
              {(selectedStoreId === "all" ? storeData : storeData.filter((s) => s.id === selectedStoreId)).map((store, i) => (
                <div
                  key={store.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i % 4] }}
                    />
                    <div>
                      <p className="font-medium text-sm">{store.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {store.lights} {language === "pt" ? "luzes" : "lights"} • {store.hoursOn}h/dia
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{store.kwh} kWh</p>
                    <p className="text-xs text-muted-foreground">
                      €{(store.kwh * 0.15).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Lights Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            {language === "pt" ? "Luzes Ativas Agora" : "Active Lights Now"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-yellow-500/20">
                <Lightbulb className="w-8 h-8 text-yellow-500" />
              </div>
              <div>
                <p className="text-3xl font-bold">{activeLights}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "pt" ? `de ${lights.length} luzes` : `of ${lights.length} lights`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {language === "pt" ? "Consumo Estimado" : "Estimated Usage"}
              </p>
              <p className="text-2xl font-bold text-yellow-500">
                {(activeLights * 0.06).toFixed(2)} kW
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Peak vs Off-Peak */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              {t("energy.peakHours")}
              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                08:00 - 22:00
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-orange-500">
                  {dailyData.slice(-7).reduce((sum, d) => sum + d.peakHours, 0).toFixed(1)} kWh
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === "pt" ? "Últimos 7 dias" : "Last 7 days"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t("energy.cost")}</p>
                <p className="text-xl font-medium">
                  €{(dailyData.slice(-7).reduce((sum, d) => sum + d.peakHours, 0) * 0.18).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              {t("energy.offPeakHours")}
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                22:00 - 08:00
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-500">
                  {dailyData.slice(-7).reduce((sum, d) => sum + d.offPeakHours, 0).toFixed(1)} kWh
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === "pt" ? "Últimos 7 dias" : "Last 7 days"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t("energy.cost")}</p>
                <p className="text-xl font-medium">
                  €{(dailyData.slice(-7).reduce((sum, d) => sum + d.offPeakHours, 0) * 0.10).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
