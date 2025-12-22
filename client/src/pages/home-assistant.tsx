import { useState, useEffect } from "react";
import { apiUrl } from "@/lib/auth";

export default function HomeAssistant() {
  const [error, setError] = useState<string | null>(null);
  const [haUrl, setHaUrl] = useState<string | null>(null);
  // Default to "dashboard-conex" based on your setup, or "lovelace" for default
  const [dashboard] = useState<string>("dashboard-conex");
  const [view] = useState<string>("aa");

  // Fetch HA base URL from server
  useEffect(() => {
    fetch(apiUrl("/api/ha/url"))
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          setHaUrl(data.url);
        } else {
          setError("Failed to get Home Assistant URL");
        }
      })
      .catch((err) => {
        console.error("Error fetching HA URL:", err);
        setError("Failed to connect to Home Assistant");
      });
  }, []);

  // Build the dashboard URL directly from HA
  let dashboardUrl = "";
  if (haUrl) {
    if (dashboard === "lovelace") {
      dashboardUrl = `${haUrl}/lovelace/${encodeURIComponent(view)}`;
    } else {
      dashboardUrl = `${haUrl}/${dashboard}/${encodeURIComponent(view)}`;
    }
  }

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
        </div>
      </div>

      {error && (
        <div className="m-6 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      {!haUrl && !error && (
        <div className="m-6 p-3 text-sm text-muted-foreground">
          Loading Home Assistant...
        </div>
      )}

      {dashboardUrl && (
        <div className="flex-1 relative">
          <iframe
            src={dashboardUrl}
            className="w-full h-full border-0"
            title="Home Assistant Dashboard"
            onError={() => setError("Failed to load Home Assistant dashboard")}
            onLoad={() => setError(null)}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          />
        </div>
      )}
    </div>
  );
}
