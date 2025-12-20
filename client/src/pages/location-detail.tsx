import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
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
import { Lightbulb, Monitor, Plus, Upload, Play, Pause, RotateCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Location, Light, Tv, Video, Company, InsertLight, InsertTv } from "@shared/schema";

export default function LocationDetail() {
  const [, params] = useRoute("/location/:id");
  const locationId = params?.id;
  const { toast } = useToast();
  const [isLightDialogOpen, setIsLightDialogOpen] = useState(false);
  const [isTvDialogOpen, setIsTvDialogOpen] = useState(false);

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
        title: "Success",
        description: "Light added successfully",
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
        title: "Success",
        description: "TV added successfully",
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

  if (!location) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>{company?.name}</span>
          <span>/</span>
          <span>{location.name}</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          {location.name}
        </h1>
        {location.description && (
          <p className="text-sm text-muted-foreground mt-1">{location.description}</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Smart Lights</h2>
            <Dialog open={isLightDialogOpen} onOpenChange={setIsLightDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-light">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Light
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Smart Light</DialogTitle>
                  <DialogDescription>Add a new controllable light to this location</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateLight} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="light-name">Light Name *</Label>
                    <Input
                      id="light-name"
                      name="name"
                      placeholder="e.g., Ceiling Light 1"
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
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createLightMutation.isPending} data-testid="button-submit-light">
                      {createLightMutation.isPending ? "Adding..." : "Add Light"}
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
                <p className="text-sm text-muted-foreground">No lights added yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {locationLights.map((light) => (
                <LightControl key={light.id} light={light} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">TV Displays</h2>
            <Dialog open={isTvDialogOpen} onOpenChange={setIsTvDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-tv">
                  <Plus className="w-4 h-4 mr-2" />
                  Add TV
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add TV Display</DialogTitle>
                  <DialogDescription>Add a new TV display to this location</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTv} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tv-name">TV Name *</Label>
                    <Input
                      id="tv-name"
                      name="name"
                      placeholder="e.g., Lobby Display 1"
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
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTvMutation.isPending} data-testid="button-submit-tv">
                      {createTvMutation.isPending ? "Adding..." : "Add TV"}
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
                <p className="text-sm text-muted-foreground">No TVs added yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {locationTvs.map((tv) => (
                <TvControl key={tv.id} tv={tv} videos={videos} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LightControl({ light }: { light: Light }) {
  const { toast } = useToast();
  const [localBrightness, setLocalBrightness] = useState(light.brightness);
  const [localColor, setLocalColor] = useState(light.color);

  const updateLightMutation = useMutation({
    mutationFn: async (data: Partial<Light>) => {
      return await apiRequest<Light>('PATCH', `/api/lights/${light.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lights'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update light",
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
    { name: 'Warm White', color: '#FFF3E0' },
    { name: 'Cool White', color: '#E3F2FD' },
    { name: 'Red', color: '#EF5350' },
    { name: 'Green', color: '#66BB6A' },
    { name: 'Blue', color: '#42A5F5' },
    { name: 'Purple', color: '#AB47BC' },
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
                <span className="text-xs text-muted-foreground capitalize">{light.status}</span>
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-normal">Brightness</Label>
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
          <Label className="text-sm font-normal">Color</Label>
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
                className="w-full h-8 rounded-md border-2 hover-elevate active-elevate-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
  const currentVideo = videos.find(v => v.id === tv.currentVideoId);

  const updateTvMutation = useMutation({
    mutationFn: async (data: Partial<Tv>) => {
      return await apiRequest<Tv>('PATCH', `/api/tvs/${tv.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tvs'] });
      toast({
        title: "Success",
        description: "TV updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update TV",
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
                <span className="text-xs text-muted-foreground capitalize">{tv.status}</span>
              </div>
            </div>
          </div>
          {currentVideo && (
            <Badge variant={tv.isLooping ? "default" : "secondary"} className="flex items-center gap-1">
              {tv.isLooping ? <RotateCw className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span className="text-xs">{tv.isLooping ? 'Looping' : 'Once'}</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-normal">Current Video</Label>
          <Select
            value={tv.currentVideoId || 'none'}
            onValueChange={handleVideoChange}
            disabled={updateTvMutation.isPending || tv.status === 'offline'}
          >
            <SelectTrigger data-testid={`select-video-${tv.id}`}>
              <SelectValue placeholder="Select a video" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No video</SelectItem>
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
                    Duration: {Math.floor(currentVideo.duration / 60)}:{(currentVideo.duration % 60).toString().padStart(2, '0')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor={`loop-${tv.id}`} className="text-sm font-normal">
                Loop playback
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
            No videos available. Upload videos first.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
