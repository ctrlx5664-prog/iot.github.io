import { useState } from "react";
import { apiUrl } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function HomeAssistant() {
  const [error, setError] = useState<string | null>(null);
  // Default to "dashboard-conex" based on your setup, or "lovelace" for default
  const [dashboard] = useState<string>("dashboard-conex");
  const [view] = useState<string>("aa");
  const [kioskOnly, setKioskOnly] = useState<boolean>(true);

  // Host-side cropping (robust): hide HA chrome even if it's inside shadow DOM.
  // Adjust if your HA theme/layout changes.
  const HA_LEFT_CHROME_PX = 320; // sidebar width
  const HA_TOP_CHROME_PX = 56; // header/top bar height

  // Build the dashboard URL with dashboard and view parameters
  // This goes through our proxy which injects authentication
  const params = new URLSearchParams();
  if (dashboard) params.set("dashboard", dashboard);
  if (view) params.set("view", view);
  // If we want the full HA UI for debugging, disable kiosk behaviors in the proxied HTML.
  if (!kioskOnly) params.set("kiosk", "0");

  const dashboardUrl = `${apiUrl("/api/ha/dashboard")}?${params.toString()}`;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-6 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Home Assistant Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Dashboard: {dashboard} / View: {view}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="ha-kiosk-only"
                checked={kioskOnly}
                onCheckedChange={setKioskOnly}
              />
              <Label htmlFor="ha-kiosk-only" className="text-sm">
                Kiosk (only dashboard)
              </Label>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="m-6 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      <div className="flex-1 relative overflow-hidden bg-background">
        <iframe
          src={dashboardUrl}
          className="w-full h-full border-0"
          title="Home Assistant Dashboard"
          onError={() => setError("Failed to load Home Assistant dashboard")}
          onLoad={() => setError(null)}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          style={
            kioskOnly
              ? {
                  width: `calc(100% + ${HA_LEFT_CHROME_PX}px)`,
                  height: `calc(100% + ${HA_TOP_CHROME_PX}px)`,
                  transform: `translate(-${HA_LEFT_CHROME_PX}px, -${HA_TOP_CHROME_PX}px)`,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
