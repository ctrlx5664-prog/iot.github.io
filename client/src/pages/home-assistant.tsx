import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { apiUrl, getToken } from "@/lib/auth";
import {
  Power,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Tv,
  Lightbulb,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

type HaState = {
  entity_id: string;
  state: string;
  attributes?: Record<string, any>;
};

export default function HomeAssistant() {
  const [entities, setEntities] = useState<HaState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calling, setCalling] = useState<string | null>(null);

  async function loadStates() {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(apiUrl("/api/ha/states"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load states");
      setEntities(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load states");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStates();
  }, []);

  async function callService(
    domain: string,
    service: string,
    entityId: string,
    extraData?: Record<string, any>
  ) {
    setCalling(`${entityId}-${service}`);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(apiUrl(`/api/ha/services/${domain}/${service}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ entity_id: entityId, ...extraData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to call service");
      await loadStates();
    } catch (err: any) {
      setError(err?.message || "Failed to call service");
    } finally {
      setCalling(null);
    }
  }

  function isLoading(entityId: string, service?: string): boolean {
    if (service) return calling === `${entityId}-${service}`;
    return calling?.startsWith(entityId) ?? false;
  }

  // Filter entities by type
  const mediaPlayers = entities.filter((e) =>
    e.entity_id.startsWith("media_player.")
  );
  const lights = entities.filter((e) => e.entity_id.startsWith("light."));
  const switches = entities.filter((e) => e.entity_id.startsWith("switch."));
  const sensors = entities.filter(
    (e) =>
      e.entity_id.startsWith("sensor.") ||
      e.entity_id.startsWith("binary_sensor.")
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Home Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Controle os seus dispositivos conectados ao Home Assistant
          </p>
        </div>
        <Button variant="outline" onClick={loadStates} disabled={loading}>
          {loading ? "A carregar..." : "Atualizar"}
        </Button>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      {/* Media Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="w-5 h-5" />
            Media Players
            <Badge variant="secondary">{mediaPlayers.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mediaPlayers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum media player encontrado.
            </p>
          )}
          {mediaPlayers.map((entity) => (
            <MediaPlayerCard
              key={entity.entity_id}
              entity={entity}
              onService={callService}
              isLoading={isLoading}
            />
          ))}
        </CardContent>
      </Card>

      {/* Lights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Luzes
            <Badge variant="secondary">{lights.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {lights.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma luz encontrada.
            </p>
          )}
          {lights.map((entity) => (
            <ToggleableCard
              key={entity.entity_id}
              entity={entity}
              onToggle={() =>
                callService(
                  "light",
                  entity.state === "on" ? "turn_off" : "turn_on",
                  entity.entity_id
                )
              }
              isLoading={isLoading(entity.entity_id)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Switches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="w-5 h-5" />
            Interruptores
            <Badge variant="secondary">{switches.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {switches.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum interruptor encontrado.
            </p>
          )}
          {switches.map((entity) => (
            <ToggleableCard
              key={entity.entity_id}
              entity={entity}
              onToggle={() =>
                callService(
                  "switch",
                  entity.state === "on" ? "turn_off" : "turn_on",
                  entity.entity_id
                )
              }
              isLoading={isLoading(entity.entity_id)}
            />
          ))}
        </CardContent>
      </Card>

      {/* Sensors */}
      <Card>
        <CardHeader>
          <CardTitle>
            Sensores
            <Badge variant="secondary" className="ml-2">
              {sensors.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[400px] overflow-auto">
          {sensors.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum sensor encontrado.
            </p>
          )}
          {sensors.map((entity) => (
            <div
              key={entity.entity_id}
              className="flex items-center justify-between border rounded px-3 py-2"
            >
              <div>
                <div className="font-medium text-sm">
                  {entity.attributes?.friendly_name || entity.entity_id}
                </div>
                <div className="text-xs text-muted-foreground">
                  {entity.entity_id}
                </div>
              </div>
              <Badge variant={entity.state === "on" ? "default" : "secondary"}>
                {entity.state}
                {entity.attributes?.unit_of_measurement &&
                  ` ${entity.attributes.unit_of_measurement}`}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Toggleable entity card (lights, switches)
interface ToggleableCardProps {
  key?: string;
  entity: HaState;
  onToggle: () => void;
  isLoading: boolean;
}

function ToggleableCard({ entity, onToggle, isLoading }: ToggleableCardProps) {
  const isOn = entity.state === "on";
  const name = entity.attributes?.friendly_name || entity.entity_id;

  return (
    <div className="flex items-center justify-between border rounded px-4 py-3">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{entity.entity_id}</div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={isOn ? "default" : "secondary"}>
          {isOn ? "Ligado" : "Desligado"}
        </Badge>
        <Button
          size="sm"
          variant={isOn ? "destructive" : "default"}
          onClick={onToggle}
          disabled={isLoading}
        >
          {isLoading ? "..." : isOn ? "Desligar" : "Ligar"}
        </Button>
      </div>
    </div>
  );
}

// Media player card with full controls
interface MediaPlayerCardProps {
  key?: string;
  entity: HaState;
  onService: (
    domain: string,
    service: string,
    entityId: string,
    extraData?: Record<string, any>
  ) => void;
  isLoading: (entityId: string, service?: string) => boolean;
}

function MediaPlayerCard({
  entity,
  onService,
  isLoading,
}: MediaPlayerCardProps) {
  const name = entity.attributes?.friendly_name || entity.entity_id;
  const state = entity.state;
  const isOn = state !== "off" && state !== "unavailable";
  const isPlaying = state === "playing";
  const volume = entity.attributes?.volume_level;
  const isMuted = entity.attributes?.is_volume_muted;
  const mediaTitle = entity.attributes?.media_title;
  const mediaArtist = entity.attributes?.media_artist;
  const supportedFeatures = entity.attributes?.supported_features || 0;

  // Feature flags (from Home Assistant)
  const SUPPORT_PAUSE = 1;
  const SUPPORT_VOLUME_SET = 4;
  const SUPPORT_VOLUME_MUTE = 8;
  const SUPPORT_PREVIOUS_TRACK = 16;
  const SUPPORT_NEXT_TRACK = 32;
  const SUPPORT_TURN_ON = 128;
  const SUPPORT_TURN_OFF = 256;
  const SUPPORT_PLAY = 16384;
  const SUPPORT_VOLUME_STEP = 1024;

  const canTurnOn = supportedFeatures & SUPPORT_TURN_ON;
  const canTurnOff = supportedFeatures & SUPPORT_TURN_OFF;
  const canPause = supportedFeatures & SUPPORT_PAUSE;
  const canPlay = supportedFeatures & SUPPORT_PLAY;
  const canSetVolume = supportedFeatures & SUPPORT_VOLUME_SET;
  const canMute = supportedFeatures & SUPPORT_VOLUME_MUTE;
  const canPrevious = supportedFeatures & SUPPORT_PREVIOUS_TRACK;
  const canNext = supportedFeatures & SUPPORT_NEXT_TRACK;
  const canVolumeStep = supportedFeatures & SUPPORT_VOLUME_STEP;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-lg">{name}</div>
          <div className="text-xs text-muted-foreground">
            {entity.entity_id}
          </div>
          {mediaTitle && (
            <div className="text-sm text-muted-foreground mt-1">
              🎵 {mediaTitle}
              {mediaArtist && ` - ${mediaArtist}`}
            </div>
          )}
        </div>
        <Badge
          variant={isOn ? (isPlaying ? "default" : "secondary") : "outline"}
        >
          {state === "off"
            ? "Desligado"
            : state === "playing"
            ? "A reproduzir"
            : state === "paused"
            ? "Em pausa"
            : state === "idle"
            ? "Inativo"
            : state}
        </Badge>
      </div>

      {/* Power controls */}
      <div className="flex items-center gap-2">
        {(canTurnOn || canTurnOff) && (
          <Button
            size="sm"
            variant={isOn ? "destructive" : "default"}
            onClick={() =>
              onService(
                "media_player",
                isOn ? "turn_off" : "turn_on",
                entity.entity_id
              )
            }
            disabled={isLoading(
              entity.entity_id,
              isOn ? "turn_off" : "turn_on"
            )}
          >
            <Power className="w-4 h-4 mr-1" />
            {isOn ? "Desligar" : "Ligar"}
          </Button>
        )}
      </div>

      {/* Playback controls */}
      {isOn && (canPlay || canPause || canPrevious || canNext) && (
        <div className="flex items-center gap-2">
          {canPrevious && (
            <Button
              size="icon"
              variant="outline"
              onClick={() =>
                onService(
                  "media_player",
                  "media_previous_track",
                  entity.entity_id
                )
              }
              disabled={isLoading(entity.entity_id, "media_previous_track")}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
          )}

          {(canPlay || canPause) && (
            <Button
              size="icon"
              variant="outline"
              onClick={() =>
                onService(
                  "media_player",
                  isPlaying ? "media_pause" : "media_play",
                  entity.entity_id
                )
              }
              disabled={isLoading(
                entity.entity_id,
                isPlaying ? "media_pause" : "media_play"
              )}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          )}

          {canNext && (
            <Button
              size="icon"
              variant="outline"
              onClick={() =>
                onService("media_player", "media_next_track", entity.entity_id)
              }
              disabled={isLoading(entity.entity_id, "media_next_track")}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {/* Volume controls */}
      {isOn && (canSetVolume || canMute || canVolumeStep) && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {/* Mute button */}
            {canMute && (
              <Button
                size="icon"
                variant={isMuted ? "destructive" : "outline"}
                onClick={() =>
                  onService("media_player", "volume_mute", entity.entity_id, {
                    is_volume_muted: !isMuted,
                  })
                }
                disabled={isLoading(entity.entity_id, "volume_mute")}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
            )}

            {/* Volume slider */}
            {canSetVolume && (
              <div className="flex items-center gap-3 flex-1">
                <Slider
                  value={[Math.round((volume || 0) * 100)]}
                  onValueChange={(values: number[]) => {
                    const newVolume = values[0] / 100;
                    onService("media_player", "volume_set", entity.entity_id, {
                      volume_level: newVolume,
                    });
                  }}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">
                  {Math.round((volume || 0) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Volume step buttons */}
          {canVolumeStep && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onService("media_player", "volume_down", entity.entity_id)
                }
                disabled={isLoading(entity.entity_id, "volume_down")}
              >
                <ChevronDown className="w-4 h-4 mr-1" />
                Volume -
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onService("media_player", "volume_up", entity.entity_id)
                }
                disabled={isLoading(entity.entity_id, "volume_up")}
              >
                <ChevronUp className="w-4 h-4 mr-1" />
                Volume +
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
