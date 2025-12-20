import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiUrl, getToken } from "@/lib/auth";

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

  function isToggleable(entityId: string) {
    return entityId.startsWith("light.") || entityId.startsWith("switch.");
  }

  async function toggle(entity: HaState) {
    if (!isToggleable(entity.entity_id)) return;
    const domain = entity.entity_id.split(".")[0];
    const service = entity.state === "on" ? "turn_off" : "turn_on";
    setCalling(entity.entity_id);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(apiUrl(`/api/ha/services/${domain}/${service}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ entity_id: entity.entity_id }),
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

  const toggleables = entities.filter((e) => isToggleable(e.entity_id));
  const sensors = entities.filter(
    (e) =>
      e.entity_id.startsWith("sensor.") ||
      e.entity_id.startsWith("binary_sensor.") ||
      e.entity_id.startsWith("climate.") ||
      e.entity_id.startsWith("weather.")
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Home Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Connected via backend proxy (uses HA_BASE_URL / HA_TOKEN). The
            public demo may be read-only.
          </p>
        </div>
        <Button variant="outline" onClick={loadStates} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lights & Switches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {toggleables.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No toggleable entities found.
              </p>
            )}
            {toggleables.map((e) => (
              <div
                key={e.entity_id}
                className="flex items-center justify-between border rounded px-3 py-2"
              >
                <div>
                  <div className="font-medium">{e.entity_id}</div>
                  <div className="text-xs text-muted-foreground">
                    state: {e.state}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={e.state === "on" ? "destructive" : "default"}
                  onClick={() => toggle(e)}
                  disabled={calling === e.entity_id}
                >
                  {calling === e.entity_id
                    ? "Working..."
                    : e.state === "on"
                    ? "Turn off"
                    : "Turn on"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sensors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[480px] overflow-auto">
            {sensors.length === 0 && (
              <p className="text-sm text-muted-foreground">No sensors found.</p>
            )}
            {sensors.map((e) => (
              <div key={e.entity_id} className="border rounded px-3 py-2">
                <div className="font-medium">{e.entity_id}</div>
                <div className="text-xs text-muted-foreground">
                  state: {e.state}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
