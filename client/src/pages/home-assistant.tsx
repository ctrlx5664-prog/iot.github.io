import { useState, useEffect, useRef } from "react";
import { apiUrl } from "@/lib/auth";
import { Loader2, RotateCcw, Smartphone } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function HomeAssistant() {
  const { language } = useTranslation() as { language: "pt" | "en" };
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(tr("A inicializar...", "Initializing..."));
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Default to "dashboard-conex" based on your setup, or "lovelace" for default
  const [dashboard] = useState<string>("dashboard-conex");
  const [view] = useState<string>("aa");

  // Detect mobile portrait mode
  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth < 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsMobilePortrait(isMobile && isPortrait);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  // Host-side cropping (robust): hide HA chrome even if it's inside shadow DOM.
  // Adjust if your HA theme/layout changes.
  const HA_LEFT_CHROME_PX = 285; // sidebar width (smaller = shift dashboard right)
  const HA_TOP_CHROME_PX = 56; // header/top bar height

  // Build the dashboard URL with dashboard and view parameters
  // This goes through our proxy which injects authentication
  const params = new URLSearchParams();
  if (dashboard) params.set("dashboard", dashboard);
  if (view) params.set("view", view);

  const dashboardUrl = `${apiUrl("/api/ha/dashboard")}?${params.toString()}`;

  // Loading messages rotation to show progress
  useEffect(() => {
    if (!isLoading) return;

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
  }, [isLoading]);

  // Handle iframe load - wait a bit extra for HA to fully render
  const handleIframeLoad = () => {
    setError(null);
    setLoadingMessage(tr("A finalizar...", "Finalizing..."));

    // Give HA some extra time to fully render (hide the HA logo loading)
    // The iframe load event fires when the HTML is loaded, but HA still
    // has internal JS loading that shows the logo
    setTimeout(() => {
      setIsLoading(false);
    }, 3000); // 3 seconds should be enough for most cases
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-6 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{tr("Dashboard de Controlo", "Control Dashboard")}</h1>
            <p className="text-sm text-muted-foreground">
              {tr("Monitorização e controlo em tempo real", "Real-time monitoring and control")}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="m-6 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      <div className="flex-1 relative overflow-hidden bg-background">
        {/* Mobile Portrait Warning */}
        {isMobilePortrait && (
          <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-6 p-8 text-center">
              {/* Animated phone icon */}
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Smartphone className="w-12 h-12 text-white" />
                </div>
                {/* Rotate arrow */}
                <div className="absolute -right-4 top-1/2 -translate-y-1/2">
                  <RotateCcw className="w-8 h-8 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold">
                  {tr("Rode o seu telemóvel", "Rotate your phone")}
                </h2>
                <p className="text-muted-foreground text-sm max-w-xs">
                  {tr(
                    "Para uma melhor experiência, por favor rode o seu dispositivo para a posição horizontal (landscape).",
                    "For a better experience, please rotate your device to landscape mode."
                  )}
                </p>
              </div>

              {/* Landscape illustration */}
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="w-8 h-12 border-2 border-current rounded-md opacity-50" />
                <RotateCcw className="w-5 h-5" />
                <div className="w-14 h-8 border-2 border-amber-500 rounded-md bg-amber-500/10" />
              </div>
            </div>

            {/* Subtle background pattern */}
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

        {/* Custom Loading Overlay - hides HA branding during load */}
        {isLoading && !isMobilePortrait && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background">
            {/* Custom branded loading screen */}
            <div className="flex flex-col items-center gap-6">
              {/* Your brand logo/icon */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {/* IoT/Network icon */}
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="19" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                    <circle cx="5" cy="12" r="1.5" />
                    <line x1="12" y1="8" x2="12" y2="9" />
                    <line x1="15" y1="12" x2="16" y2="12" />
                    <line x1="12" y1="15" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="9" y2="12" />
                  </svg>
                </div>
                {/* Animated ring */}
                <div className="absolute -inset-2 rounded-3xl border-2 border-cyan-500/30 animate-ping" />
              </div>

              {/* Brand name */}
              <div className="text-center">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  CtrlX
                </h2>
              </div>

              {/* Loading spinner and message */}
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
                <span className="text-sm">{loadingMessage}</span>
              </div>

              {/* Progress bar */}
              <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse"
                  style={{
                    width: "60%",
                    animation: "loading-progress 2s ease-in-out infinite",
                  }}
                />
              </div>
            </div>

            {/* Subtle background pattern */}
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
          ref={iframeRef}
          src={dashboardUrl}
          className="w-full h-full border-0"
          title="Dashboard de Controlo"
          onError={() => {
            setError("Falha ao carregar o dashboard");
            setIsLoading(false);
          }}
          onLoad={handleIframeLoad}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          style={{
            width: `calc(100% + ${HA_LEFT_CHROME_PX}px)`,
            height: `calc(100% + ${HA_TOP_CHROME_PX}px)`,
            transform: `translate(-${HA_LEFT_CHROME_PX}px, -${HA_TOP_CHROME_PX}px)`,
            opacity: isLoading || isMobilePortrait ? 0 : 1,
            transition: "opacity 0.3s ease-in-out",
          }}
        />
      </div>

      {/* Custom animation for progress bar */}
      <style>{`
        @keyframes loading-progress {
          0% { width: 20%; margin-left: 0; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 20%; margin-left: 80%; }
        }
      `}</style>
    </div>
  );
}
