import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, Monitor, Plus, LayoutDashboard, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Location, Light, Tv, Video, Company, InsertLight, InsertTv } from "@shared/schema";
import { apiUrl, getToken } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";

export default function LocationDetail() {
  const [, params] = useRoute("/location/:id");
  const locationId = params?.id;
  const { toast } = useToast();
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [isLightDialogOpen, setIsLightDialogOpen] = useState(false);
  const [isTvDialogOpen, setIsTvDialogOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dashboardKey, setDashboardKey] = useState(0);

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const { data: location } = useQuery<Location>({
    queryKey: ['/api/locations', locationId],
    enabled: !!locationId,
  });

  const { data: company } = useQuery<Company>({
    queryKey: ['/api/companies', location?.companyId],
    enabled: !!location?.companyId,
  });

  const { data: lights = [] } = useQuery<Light[]>({
    queryKey: ['/api/lights'],
  });

  const { data: tvs = [] } = useQuery<Tv[]>({
    queryKey: ['/api/tvs'],
  });

  const { data: videos = [] } = useQuery<Video[]>({
    queryKey: ['/api/videos'],
  });

  const locationLights = lights.filter(l => l.locationId === locationId);
  const locationTvs = tvs.filter(t => t.locationId === locationId);

  const createLightMutation = useMutation({
    mutationFn: async (data: InsertLight) => {
      return await apiRequest<Light>('POST', '/api/lights', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lights'] });
      setIsLightDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Luz adicionada com sucesso",
      });
    },
  });

  const createTvMutation = useMutation({
    mutationFn: async (data: InsertTv) => {
      return await apiRequest<Tv>('POST', '/api/tvs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tvs'] });
      setIsTvDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "TV adicionada com sucesso",
      });
    },
  });

  const handleCreateLight = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createLightMutation.mutate({
      locationId: locationId!,
      name: formData.get('name') as string,
      isOn: false,
      brightness: 100,
      color: '#ffffff',
      status: 'online',
    });
  };

  const handleCreateTv = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createTvMutation.mutate({
      locationId: locationId!,
      name: formData.get('name') as string,
      isLooping: true,
      status: 'online',
      currentVideoId: undefined,
    });
  };

  const refreshDashboard = () => {
    setDashboardKey(prev => prev + 1);
  };

  if (!location) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{tr("A carregar...", "Loading...")}</p>
      </div>
    );
  }

  // Dashboard URL - can be customized per location in the future
  const dashboardUrl = apiUrl("/api/ha/dashboard");
  // Crop HA chrome (sidebar/top bar) to show only the control content
  const HA_LEFT_CHROME_PX = 260;
  const HA_TOP_CHROME_PX = 56;

  return (
    <div className="space-y-6">
      <div>
        {/* Clickable Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            {tr("Dashboard", "Dashboard")}
          </Link>
          <span>/</span>
          <Link href="/stores" className="hover:text-foreground transition-colors">
            {tr("Lojas", "Stores")}
          </Link>
          <span>/</span>
          <Link href={`/store/${company?.id}`} className="hover:text-foreground transition-colors">
            {company?.name}
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{location.name}</span>
        </nav>
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          {location.name}
        </h1>
        {location.description && (
          <p className="text-sm text-muted-foreground mt-1">{location.description}</p>
        )}
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="w-4 h-4" />
            {tr("Dashboard de Controlo", "Control Dashboard")}
          </TabsTrigger>
          <TabsTrigger value="lights" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            {tr("Luzes", "Lights")}
            <Badge variant="secondary" className="ml-1">{locationLights.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="tvs" className="gap-2">
            <Monitor className="w-4 h-4" />
            {tr("TVs", "TVs")}
            <Badge variant="secondary" className="ml-1">{locationTvs.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard de Controlo Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <Card className={isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{tr("Dashboard de Controlo", "Control Dashboard")}</CardTitle>
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
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className={`relative bg-[#1c1c1c] rounded-b-lg overflow-hidden ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-[600px]'}`}>
                <iframe
                  key={dashboardKey}
                  src={dashboardUrl}
                  className="border-0"
                  style={{
                    width: `calc(100% + ${HA_LEFT_CHROME_PX}px)`,
                    height: `calc(100% + ${HA_TOP_CHROME_PX}px)`,
                    transform: `translate(-${HA_LEFT_CHROME_PX}px, -${HA_TOP_CHROME_PX}px)`,
                  }}
                  title="Dashboard de Controlo"
                  allow="fullscreen"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lights Tab */}
        <TabsContent value="lights" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">{tr("Luzes Inteligentes", "Smart Lights")}</h2>
            <Dialog open={isLightDialogOpen} onOpenChange={setIsLightDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-light">
                  <Plus className="w-4 h-4 mr-2" />
                  {tr("Adicionar Luz", "Add Light")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{tr("Adicionar Luz Inteligente", "Add Smart Light")}</DialogTitle>
                  <DialogDescription>
                    {tr("Adicione uma nova luz controlável a este espaço", "Add a new controllable light to this space")}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateLight} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="light-name">{tr("Nome da Luz *", "Light Name *")}</Label>
                    <Input
                      id="light-name"
                      name="name"
                      placeholder={tr("ex: Luz do Teto 1", "e.g., Ceiling Light 1")}
                      required
                      data-testid="input-light-name"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsLightDialogOpen(false)}
                    >
                      {tr("Cancelar", "Cancel")}
                    </Button>
                    <Button type="submit" disabled={createLightMutation.isPending} data-testid="button-submit-light">
                      {createLightMutation.isPending ? tr("A adicionar...", "Adding...") : tr("Adicionar Luz", "Add Light")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {locationLights.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Lightbulb className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {tr("Ainda sem luzes adicionadas", "No lights added yet")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {locationLights.map((light) => (
                <LightControl key={light.id} light={light} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* TVs Tab */}
        <TabsContent value="tvs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">{tr("Televisões", "TVs")}</h2>
            <Dialog open={isTvDialogOpen} onOpenChange={setIsTvDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-tv">
                  <Plus className="w-4 h-4 mr-2" />
                  {tr("Adicionar TV", "Add TV")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{tr("Adicionar TV", "Add TV")}</DialogTitle>
                  <DialogDescription>
                    {tr("Adicione uma nova TV a este espaço", "Add a new TV to this space")}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTv} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tv-name">{tr("Nome da TV *", "TV Name *")}</Label>
                    <Input
                      id="tv-name"
                      name="name"
                      placeholder={tr("ex: TV do Lobby 1", "e.g., Lobby TV 1")}
                      required
                      data-testid="input-tv-name"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsTvDialogOpen(false)}
                    >
                      {tr("Cancelar", "Cancel")}
                    </Button>
                    <Button type="submit" disabled={createTvMutation.isPending} data-testid="button-submit-tv">
                      {createTvMutation.isPending ? tr("A adicionar...", "Adding...") : tr("Adicionar TV", "Add TV")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {locationTvs.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Monitor className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {tr("Ainda sem TVs adicionadas", "No TVs added yet")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {locationTvs.map((tv) => (
                <TvControl key={tv.id} tv={tv} videos={videos} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LightControl({ light }: { light: Light }) {
  const { toast } = useToast();
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [localBrightness, setLocalBrightness] = useState(light.brightness);
  const [localColor, setLocalColor] = useState(light.color);
  const mockStats = getMockLightStats(light.id);

  const updateLightMutation = useMutation({
    mutationFn: async (data: Partial<Light>) => {
      return await apiRequest<Light>('PATCH', `/api/lights/${light.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lights'] });
    },
    onError: () => {
      toast({
        title: tr("Erro", "Error"),
        description: tr("Falha ao atualizar luz", "Failed to update light"),
        variant: "destructive",
      });
    },
  });

  const handleToggle = (checked: boolean) => {
    updateLightMutation.mutate({ isOn: checked });
  };

  const handleBrightnessChange = (value: number[]) => {
    setLocalBrightness(value[0]);
  };

  const handleBrightnessCommit = (value: number[]) => {
    updateLightMutation.mutate({ brightness: value[0] });
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setLocalColor(newColor);
    updateLightMutation.mutate({ color: newColor });
  };

  const presetColors = [
    { name: tr("Branco Quente", "Warm White"), color: '#FFF3E0' },
    { name: tr("Branco Frio", "Cool White"), color: '#E3F2FD' },
    { name: tr("Vermelho", "Red"), color: '#EF5350' },
    { name: tr("Verde", "Green"), color: '#66BB6A' },
    { name: tr("Azul", "Blue"), color: '#42A5F5' },
    { name: tr("Roxo", "Purple"), color: '#AB47BC' },
  ];

  return (
    <Card data-testid={`card-light-${light.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: light.isOn ? localColor : '#e5e7eb',
                opacity: light.isOn ? 1 : 0.5,
              }}
            >
              <Lightbulb className={`w-5 h-5 ${light.isOn ? 'text-white' : 'text-gray-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium truncate">{light.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${light.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground capitalize">
                  {light.status === 'online' ? tr("Online", "Online") : tr("Offline", "Offline")}
                </span>
              </div>
            </div>
          </div>
          <Switch
            checked={light.isOn}
            onCheckedChange={handleToggle}
            disabled={updateLightMutation.isPending || light.status === 'offline'}
            data-testid={`switch-light-${light.id}`}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">
            {mockStats.watts}W
          </Badge>
          <Badge variant="outline">
            {mockStats.kwhToday} kWh {tr("hoje", "today")}
          </Badge>
          <span>
            {tr("Última atividade", "Last activity")}: {mockStats.lastActivity}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
          <Label className="text-sm font-normal">{tr("Brilho", "Brightness")}</Label>
            <span className="text-sm font-medium" data-testid={`text-brightness-${light.id}`}>
              {localBrightness}%
            </span>
          </div>
          <Slider
            value={[localBrightness]}
            onValueChange={handleBrightnessChange}
            onValueCommit={handleBrightnessCommit}
            min={0}
            max={100}
            step={1}
            disabled={!light.isOn || updateLightMutation.isPending || light.status === 'offline'}
            data-testid={`slider-brightness-${light.id}`}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-normal">{tr("Cor", "Color")}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={localColor}
              onChange={handleColorChange}
              disabled={!light.isOn || updateLightMutation.isPending || light.status === 'offline'}
              className="w-12 h-9 rounded-md border border-input cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid={`input-color-${light.id}`}
            />
            <Input
              value={localColor.toUpperCase()}
              onChange={(e) => {
                const value = e.target.value;
                if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                  setLocalColor(value);
                  if (value.length === 7) {
                    updateLightMutation.mutate({ color: value });
                  }
                }
              }}
              disabled={!light.isOn || updateLightMutation.isPending || light.status === 'offline'}
              className="flex-1 font-mono text-sm"
              placeholder="#FFFFFF"
            />
          </div>
          <div className="grid grid-cols-6 gap-2 mt-2">
            {presetColors.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setLocalColor(preset.color);
                  updateLightMutation.mutate({ color: preset.color });
                }}
                disabled={!light.isOn || updateLightMutation.isPending || light.status === 'offline'}
                className="w-full h-8 rounded-md border-2 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{
                  backgroundColor: preset.color,
                  borderColor: localColor.toUpperCase() === preset.color.toUpperCase() ? 'hsl(var(--primary))' : 'transparent',
                }}
                title={preset.name}
                data-testid={`button-preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}-${light.id}`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TvControl({ tv, videos }: { tv: Tv; videos: Video[] }) {
  const { toast } = useToast();
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const currentVideo = videos.find(v => v.id === tv.currentVideoId);

  const updateTvMutation = useMutation({
    mutationFn: async (data: Partial<Tv>) => {
      return await apiRequest<Tv>('PATCH', `/api/tvs/${tv.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tvs'] });
      toast({
        title: tr("Sucesso", "Success"),
        description: tr("TV atualizada com sucesso", "TV updated successfully"),
      });
    },
    onError: () => {
      toast({
        title: tr("Erro", "Error"),
        description: tr("Falha ao atualizar TV", "Failed to update TV"),
        variant: "destructive",
      });
    },
  });

  const handleVideoChange = (videoId: string) => {
    updateTvMutation.mutate({ currentVideoId: videoId === 'none' ? undefined : videoId });
  };

  const handleLoopToggle = (checked: boolean) => {
    updateTvMutation.mutate({ isLooping: checked });
  };

  return (
    <Card data-testid={`card-tv-${tv.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-medium truncate">{tv.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${tv.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground capitalize">
                  {tv.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
          {currentVideo && (
            <Badge variant={tv.isLooping ? "default" : "secondary"} className="flex items-center gap-1">
              <span className="text-xs">{tv.isLooping ? tr("Loop", "Loop") : tr("Uma vez", "Once")}</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-normal">{tr("Vídeo Atual", "Current Video")}</Label>
          <Select
            value={tv.currentVideoId || 'none'}
            onValueChange={handleVideoChange}
            disabled={updateTvMutation.isPending || tv.status === 'offline'}
          >
            <SelectTrigger data-testid={`select-video-${tv.id}`}>
              <SelectValue placeholder={tr("Selecione um vídeo", "Select a video")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{tr("Sem vídeo", "No video")}</SelectItem>
              {videos.map((video) => (
                <SelectItem key={video.id} value={video.id}>
                  {video.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentVideo && (
          <>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentVideo.name}</p>
                {currentVideo.duration && (
                  <p className="text-xs text-muted-foreground">
                    {tr("Duração", "Duration")}: {Math.floor(currentVideo.duration / 60)}:{(currentVideo.duration % 60).toString().padStart(2, '0')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor={`loop-${tv.id}`} className="text-sm font-normal">
                {tr("Reprodução em loop", "Loop playback")}
              </Label>
              <Switch
                id={`loop-${tv.id}`}
                checked={tv.isLooping}
                onCheckedChange={handleLoopToggle}
                disabled={updateTvMutation.isPending || tv.status === 'offline'}
                data-testid={`switch-loop-${tv.id}`}
              />
            </div>
          </>
        )}

        {videos.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            {tr("Sem vídeos disponíveis. Carregue vídeos primeiro.", "No videos available. Upload videos first.")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getMockLightStats(lightId: string) {
  let hash = 0;
  for (let i = 0; i < lightId.length; i += 1) {
    hash = (hash * 31 + lightId.charCodeAt(i)) % 9973;
  }
  const watts = 8 + (hash % 40); // 8W - 47W
  const kwhToday = (watts * ((hash % 6) + 2)) / 1000; // 2-7 hours
  const minutesAgo = (hash % 120) + 5; // 5-125 min
  const hours = Math.floor(minutesAgo / 60);
  const minutes = minutesAgo % 60;
  const lastActivity = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return {
    watts,
    kwhToday: kwhToday.toFixed(2),
    lastActivity,
  };
}
