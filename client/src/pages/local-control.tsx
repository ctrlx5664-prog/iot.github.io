import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Lightbulb,
  Sun,
  Moon,
  Power,
  Palette,
  Clock,
  MapPin,
  Store,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Building2,
  ChevronRight,
  Zap,
  Settings2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getToken, apiUrl } from "@/lib/auth";
import type { Organization, Company, Location, Light } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter states - hierarchical
  const [selectedOrganization, setSelectedOrganization] = useState<string>("all");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Control states
  const [masterBrightness, setMasterBrightness] = useState(75);
  const [masterPower, setMasterPower] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Light detail dialog
  const [selectedLight, setSelectedLight] = useState<Light | null>(null);
  const [lightBrightness, setLightBrightness] = useState(100);
  const [lightPower, setLightPower] = useState(true);

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch organizations
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/organizations"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

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
  const { data: lights = [], refetch: refetchLights } = useQuery<Light[]>({
    queryKey: ["/api/lights"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/lights"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Filtered stores based on organization
  const filteredStores = useMemo(() => {
    if (selectedOrganization === "all") return companies;
    return companies.filter((c) => c.organizationId === selectedOrganization);
  }, [companies, selectedOrganization]);

  // Filtered locations based on store
  const filteredLocations = useMemo(() => {
    if (selectedStore === "all") {
      if (selectedOrganization === "all") return locations;
      const storeIds = filteredStores.map((s) => s.id);
      return locations.filter((l) => storeIds.includes(l.companyId));
    }
    return locations.filter((l) => l.companyId === selectedStore);
  }, [locations, selectedStore, selectedOrganization, filteredStores]);

  // Filter lights based on hierarchy
  const filteredLights = useMemo(() => {
    return lights.filter((light) => {
      const location = locations.find((l) => l.id === light.locationId);
      if (!location) return false;

      const store = companies.find((c) => c.id === location.companyId);
      if (!store) return false;

      if (selectedOrganization !== "all" && store.organizationId !== selectedOrganization) return false;
      if (selectedStore !== "all" && location.companyId !== selectedStore) return false;
      if (selectedLocation !== "all" && light.locationId !== selectedLocation) return false;

      return true;
    });
  }, [lights, locations, companies, selectedOrganization, selectedStore, selectedLocation]);

  // Stats
  const stats = useMemo(() => ({
    totalLights: filteredLights.length,
    onLights: filteredLights.filter((l) => l.isOn).length,
    offlineLights: filteredLights.filter((l) => l.status === "offline").length,
    avgBrightness: filteredLights.length > 0 
      ? Math.round(filteredLights.reduce((acc, l) => acc + l.brightness, 0) / filteredLights.length)
      : 0,
  }), [filteredLights]);

  // Update light mutation
  const updateLightMutation = useMutation({
    mutationFn: async ({ id, isOn, brightness }: { id: string; isOn?: boolean; brightness?: number }) => {
      const res = await fetch(apiUrl(`/api/lights/${id}`), {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ isOn, brightness }),
      });
      if (!res.ok) throw new Error("Failed to update light");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lights"] });
    },
  });

  // Apply preset
  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = lightPresets.find((p) => p.id === presetId);
    if (preset) {
      setMasterBrightness(preset.brightness);
      setMasterPower(preset.brightness > 0);
    }
  };

  // Handle master power change
  const handleMasterPowerChange = (checked: boolean) => {
    setMasterPower(checked);
    if (!checked) {
      setMasterBrightness(0);
    } else if (masterBrightness === 0) {
      setMasterBrightness(75);
    }
  };

  // Apply to all filtered lights
  const applyToAll = async () => {
    if (filteredLights.length === 0) {
      toast({
        title: tr("Erro", "Error"),
        description: tr("Nenhuma luz selecionada", "No lights selected"),
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);
    try {
      // Simulate applying to all lights
      await Promise.all(
        filteredLights.map((light) =>
          updateLightMutation.mutateAsync({
            id: light.id,
            isOn: masterPower,
            brightness: masterBrightness,
          })
        )
      );
      toast({
        title: tr("Aplicado com sucesso", "Applied successfully"),
        description: tr(
          `${filteredLights.length} luzes atualizadas`,
          `${filteredLights.length} lights updated`
        ),
      });
    } catch (error) {
      toast({
        title: tr("Erro", "Error"),
        description: tr("Falha ao aplicar alterações", "Failed to apply changes"),
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  // Toggle individual light
  const toggleLight = async (light: Light) => {
    try {
      await updateLightMutation.mutateAsync({
        id: light.id,
        isOn: !light.isOn,
      });
      toast({
        title: light.isOn ? tr("Luz desligada", "Light off") : tr("Luz ligada", "Light on"),
        description: light.name,
      });
    } catch (error) {
      toast({
        title: tr("Erro", "Error"),
        description: tr("Falha ao alterar luz", "Failed to toggle light"),
        variant: "destructive",
      });
    }
  };

  // Open light detail
  const openLightDetail = (light: Light) => {
    setSelectedLight(light);
    setLightBrightness(light.brightness);
    setLightPower(light.isOn);
  };

  // Save light settings
  const saveLightSettings = async () => {
    if (!selectedLight) return;
    try {
      await updateLightMutation.mutateAsync({
        id: selectedLight.id,
        isOn: lightPower,
        brightness: lightBrightness,
      });
      toast({
        title: tr("Luz atualizada", "Light updated"),
        description: selectedLight.name,
      });
      setSelectedLight(null);
    } catch (error) {
      toast({
        title: tr("Erro", "Error"),
        description: tr("Falha ao atualizar luz", "Failed to update light"),
        variant: "destructive",
      });
    }
  };

  // Get location path (store > space)
  const getLocationPath = (light: Light) => {
    const location = locations.find((l) => l.id === light.locationId);
    const store = location ? companies.find((c) => c.id === location.companyId) : null;
    return `${store?.name || "?"} > ${location?.name || "?"}`;
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
            {tr("Controlo em tempo real de iluminação", "Real-time lighting control")}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchLights()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {tr("Atualizar", "Refresh")}
        </Button>
      </div>

      {/* Hierarchy Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {tr("Selecionar Localização", "Select Location")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">{tr("Organização", "Organization")}</Label>
              <Select 
                value={selectedOrganization} 
                onValueChange={(v) => { 
                  setSelectedOrganization(v); 
                  setSelectedStore("all"); 
                  setSelectedLocation("all"); 
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("Todas as organizações", "All organizations")}</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground mb-2" />

            <div className="space-y-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">{tr("Loja", "Store")}</Label>
              <Select 
                value={selectedStore} 
                onValueChange={(v) => { 
                  setSelectedStore(v); 
                  setSelectedLocation("all"); 
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("Todas as lojas", "All stores")}</SelectItem>
                  {filteredStores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ChevronRight className="w-4 h-4 text-muted-foreground mb-2" />

            <div className="space-y-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">{tr("Espaço", "Space")}</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("Todos os espaços", "All spaces")}</SelectItem>
                  {filteredLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
                <p className="text-sm text-muted-foreground">{tr("Brilho Médio", "Avg Brightness")}</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.avgBrightness}%</p>
              </div>
              <Sun className="w-8 h-8 text-yellow-500 opacity-80" />
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
            <Zap className="w-5 h-5" />
            {tr("Controlo Geral", "Master Control")}
          </CardTitle>
          <CardDescription>
            {tr(
              `Aplicar a ${stats.totalLights} luzes selecionadas`,
              `Apply to ${stats.totalLights} selected lights`
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Power Switch */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${masterPower ? "bg-green-500/20" : "bg-muted"}`}>
                <Power className={`w-6 h-6 ${masterPower ? "text-green-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium text-lg">
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
              className="scale-125"
            />
          </div>

          {/* Brightness Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-base">
                <Sun className="w-5 h-5" />
                {tr("Brilho", "Brightness")}
              </Label>
              <span className="text-lg font-bold">{masterBrightness}%</span>
            </div>
            <Slider
              value={[masterBrightness]}
              onValueChange={(v) => setMasterBrightness(v[0])}
              max={100}
              step={5}
              disabled={!masterPower}
              className="py-2"
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-3">
            <Label className="text-base">{tr("Predefinições Rápidas", "Quick Presets")}</Label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {lightPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPreset === preset.id ? "default" : "outline"}
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => applyPreset(preset.id)}
                >
                  <div
                    className="w-8 h-8 rounded-full border-2"
                    style={{ 
                      backgroundColor: preset.color,
                      opacity: preset.brightness / 100 || 0.1,
                    }}
                  />
                  <span className="text-xs">
                    {tr(preset.name.pt, preset.name.en)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {preset.brightness}%
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => { setMasterBrightness(75); setMasterPower(true); setSelectedPreset(null); }}>
              {tr("Repor", "Reset")}
            </Button>
            <Button onClick={applyToAll} disabled={isApplying || stats.totalLights === 0}>
              {isApplying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {tr("A aplicar...", "Applying...")}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  {tr(`Aplicar a ${stats.totalLights} luzes`, `Apply to ${stats.totalLights} lights`)}
                </>
              )}
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
            {tr("Clique numa luz para ajustar individualmente", "Click on a light to adjust individually")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLights.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{tr("Nenhuma luz encontrada", "No lights found")}</p>
              <p className="text-sm">{tr("Selecione uma localização diferente", "Select a different location")}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredLights.map((light) => (
                <Card 
                  key={light.id} 
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    light.status === "offline" ? "opacity-60" : ""
                  } ${light.isOn ? "border-green-500/50" : ""}`}
                  onClick={() => openLightDetail(light)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${light.isOn ? "bg-yellow-500/20" : "bg-muted"}`}>
                        <Lightbulb className={`w-5 h-5 ${light.isOn ? "text-yellow-500" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-medium">{light.name}</p>
                        <p className="text-xs text-muted-foreground">{getLocationPath(light)}</p>
                      </div>
                    </div>
                    <Switch
                      checked={light.isOn}
                      onCheckedChange={(e) => { e.stopPropagation(); toggleLight(light); }}
                      disabled={light.status === "offline"}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{tr("Brilho", "Brightness")}</span>
                      <span className="font-medium">{light.brightness}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500 transition-all"
                        style={{ width: `${light.isOn ? light.brightness : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant={light.status === "online" ? "default" : "destructive"}>
                      {light.status === "online" ? tr("Online", "Online") : tr("Offline", "Offline")}
                    </Badge>
                    {light.color && light.color !== "#ffffff" && (
                      <div
                        className="w-6 h-6 rounded-full border-2"
                        style={{ backgroundColor: light.color }}
                      />
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Light Detail Dialog */}
      <Dialog open={!!selectedLight} onOpenChange={(open) => { if (!open) setSelectedLight(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className={selectedLight?.isOn ? "text-yellow-500" : "text-muted-foreground"} />
              {selectedLight?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedLight && getLocationPath(selectedLight)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Power */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Power className={lightPower ? "text-green-500" : "text-muted-foreground"} />
                <span className="font-medium">
                  {lightPower ? tr("Ligada", "On") : tr("Desligada", "Off")}
                </span>
              </div>
              <Switch
                checked={lightPower}
                onCheckedChange={setLightPower}
                disabled={selectedLight?.status === "offline"}
              />
            </div>

            {/* Brightness */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  {tr("Brilho", "Brightness")}
                </Label>
                <span className="font-bold">{lightBrightness}%</span>
              </div>
              <Slider
                value={[lightBrightness]}
                onValueChange={(v) => setLightBrightness(v[0])}
                max={100}
                step={5}
                disabled={!lightPower || selectedLight?.status === "offline"}
              />
            </div>

            {/* Quick presets */}
            <div className="grid grid-cols-3 gap-2">
              {[25, 50, 75, 100].map((val) => (
                <Button
                  key={val}
                  variant={lightBrightness === val ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLightBrightness(val)}
                  disabled={!lightPower}
                >
                  {val}%
                </Button>
              ))}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={selectedLight?.status === "online" ? "default" : "destructive"}>
                {selectedLight?.status === "online" ? tr("Online", "Online") : tr("Offline", "Offline")}
              </Badge>
              {selectedLight?.color && (
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: selectedLight.color }}
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLight(null)}>
              {tr("Cancelar", "Cancel")}
            </Button>
            <Button onClick={saveLightSettings} disabled={selectedLight?.status === "offline"}>
              {tr("Guardar", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
