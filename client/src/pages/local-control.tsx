import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lightbulb,
  Sun,
  Moon,
  Power,
  Palette,
  Thermometer,
  Clock,
  MapPin,
  Store,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getToken, apiUrl } from "@/lib/auth";
import type { Company, Location, Light } from "@shared/schema";

// Quick presets for lighting
const lightPresets = [
  { id: "bright", name: { pt: "Brilhante", en: "Bright" }, brightness: 100, color: "#FFFFFF" },
  { id: "warm", name: { pt: "Quente", en: "Warm" }, brightness: 80, color: "#FFA500" },
  { id: "cool", name: { pt: "Frio", en: "Cool" }, brightness: 85, color: "#87CEEB" },
  { id: "dim", name: { pt: "Fraco", en: "Dim" }, brightness: 30, color: "#FFFFFF" },
  { id: "night", name: { pt: "Noite", en: "Night" }, brightness: 10, color: "#FF6B6B" },
  { id: "off", name: { pt: "Desligado", en: "Off" }, brightness: 0, color: "#000000" },
];

export default function LocalControl() {
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [masterBrightness, setMasterBrightness] = useState(75);
  const [masterPower, setMasterPower] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

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

  // Fetch lights
  const { data: lights = [] } = useQuery<Light[]>({
    queryKey: ["/api/lights"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/lights"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Filter locations by selected store
  const filteredLocations = selectedStore === "all"
    ? locations
    : locations.filter((l) => l.companyId === selectedStore);

  // Filter lights
  const filteredLights = lights.filter((light) => {
    const location = locations.find((l) => l.id === light.locationId);
    if (!location) return false;
    if (selectedStore !== "all" && location.companyId !== selectedStore) return false;
    if (selectedLocation !== "all" && light.locationId !== selectedLocation) return false;
    return true;
  });

  const stats = {
    totalLights: filteredLights.length,
    onLights: filteredLights.filter((l) => l.isOn).length,
    offlineLights: filteredLights.filter((l) => l.status === "offline").length,
  };

  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = lightPresets.find((p) => p.id === presetId);
    if (preset) {
      setMasterBrightness(preset.brightness);
      setMasterPower(preset.brightness > 0);
    }
  };

  const handleMasterPowerChange = (checked: boolean) => {
    setMasterPower(checked);
    if (!checked) {
      setMasterBrightness(0);
    } else if (masterBrightness === 0) {
      setMasterBrightness(75);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {tr("Controlo Local", "Local Control")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr("Controlo temporário de iluminação por loja ou espaço", "Temporary lighting control by store or space")}
          </p>
        </div>
        <Button variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          {tr("Sincronizar", "Sync")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="space-y-2 min-w-[200px]">
              <Label>{tr("Loja", "Store")}</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder={tr("Selecionar loja", "Select store")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("Todas as lojas", "All stores")}</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[200px]">
              <Label>{tr("Espaço", "Space")}</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder={tr("Selecionar espaço", "Select space")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("Todos os espaços", "All spaces")}</SelectItem>
                  {filteredLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Total Luzes", "Total Lights")}</p>
                <p className="text-2xl font-bold">{stats.totalLights}</p>
              </div>
              <Lightbulb className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Ligadas", "On")}</p>
                <p className="text-2xl font-bold text-green-500">{stats.onLights}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Offline", "Offline")}</p>
                <p className="text-2xl font-bold text-red-500">{stats.offlineLights}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Master Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="w-5 h-5" />
            {tr("Controlo Geral", "Master Control")}
          </CardTitle>
          <CardDescription>
            {tr("Controla todas as luzes selecionadas de uma vez", "Control all selected lights at once")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Power Switch */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${masterPower ? "bg-green-500/20" : "bg-muted"}`}>
                <Power className={`w-5 h-5 ${masterPower ? "text-green-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium">
                  {masterPower ? tr("Ligado", "On") : tr("Desligado", "Off")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tr(`${stats.onLights} de ${stats.totalLights} luzes ligadas`, `${stats.onLights} of ${stats.totalLights} lights on`)}
                </p>
              </div>
            </div>
            <Switch
              checked={masterPower}
              onCheckedChange={handleMasterPowerChange}
            />
          </div>

          {/* Brightness Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Sun className="w-4 h-4" />
                {tr("Brilho", "Brightness")}
              </Label>
              <span className="text-sm font-medium">{masterBrightness}%</span>
            </div>
            <Slider
              value={[masterBrightness]}
              onValueChange={(v) => setMasterBrightness(v[0])}
              max={100}
              step={1}
              disabled={!masterPower}
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-3">
            <Label>{tr("Predefinições Rápidas", "Quick Presets")}</Label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {lightPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPreset === preset.id ? "default" : "outline"}
                  className="flex flex-col h-auto py-3"
                  onClick={() => applyPreset(preset.id)}
                >
                  <div
                    className="w-6 h-6 rounded-full mb-1 border"
                    style={{ backgroundColor: preset.color }}
                  />
                  <span className="text-xs">
                    {tr(preset.name.pt, preset.name.en)}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline">
              {tr("Repor", "Reset")}
            </Button>
            <Button>
              {tr("Aplicar a Todas", "Apply to All")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Lights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            {tr("Luzes Individuais", "Individual Lights")}
          </CardTitle>
          <CardDescription>
            {tr("Controla cada luz individualmente", "Control each light individually")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLights.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {tr("Nenhuma luz encontrada para os filtros selecionados", "No lights found for the selected filters")}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLights.slice(0, 12).map((light) => {
                const location = locations.find((l) => l.id === light.locationId);
                const company = companies.find((c) => c.id === location?.companyId);
                
                return (
                  <Card key={light.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium">{light.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {company?.name} • {location?.name}
                        </p>
                      </div>
                      <Switch checked={light.isOn} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{tr("Brilho", "Brightness")}</span>
                        <span>{light.brightness}%</span>
                      </div>
                      <Slider
                        value={[light.brightness]}
                        max={100}
                        step={1}
                        disabled={!light.isOn}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <Badge variant={light.status === "online" ? "default" : "destructive"}>
                        {light.status === "online" ? tr("Online", "Online") : tr("Offline", "Offline")}
                      </Badge>
                      {light.color && (
                        <div
                          className="w-6 h-6 rounded-full border"
                          style={{ backgroundColor: light.color }}
                        />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          {filteredLights.length > 12 && (
            <div className="text-center mt-4">
              <Button variant="outline">
                {tr(`Ver todas (${filteredLights.length})`, `View all (${filteredLights.length})`)}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
