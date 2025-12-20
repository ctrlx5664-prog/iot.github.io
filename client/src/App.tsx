import {
  Switch,
  Route,
  Link,
  Router as WouterRouter,
  useLocation,
} from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWebSocket } from "@/hooks/use-websocket";
import Dashboard from "@/pages/dashboard";
import Companies from "@/pages/companies";
import LocationDetail from "@/pages/location-detail";
import Videos from "@/pages/videos";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import HomeAssistant from "@/pages/home-assistant";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getToken } from "@/lib/auth";

function Routes() {
  // Initialize WebSocket connection
  useWebSocket();

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/companies" component={Companies} />
      <Route path="/location/:id" component={LocationDetail} />
      <Route path="/videos" component={Videos} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/ha" component={HomeAssistant} />
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const [location, navigate] = useLocation();
  const token = getToken();

  useEffect(() => {
    if (!token && location !== "/login" && location !== "/register") {
      navigate("/login");
    }
  }, [token, location, navigate]);

  const style: CSSProperties = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // GitHub Pages doesn't support SPA rewrites; use hash routing there.
  const routerMode =
    (import.meta.env.VITE_ROUTER_MODE as string | undefined) ?? "path";
  const routerHook = useMemo(
    () => (routerMode === "hash" ? useHashLocation : undefined),
    [routerMode]
  );

  const isLogin = location === "/login";

  const shell = isLogin ? (
    <div className="min-h-screen bg-background">
      <WouterRouter hook={routerHook}>
        <Routes />
      </WouterRouter>
    </div>
  ) : (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/videos" data-testid="link-videos-header">
                  <Video className="w-4 h-4 mr-2" />
                  Videos
                </Link>
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-6 py-6">
              <WouterRouter hook={routerHook}>
                <Routes />
              </WouterRouter>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          {shell}
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Minimal hash-based location hook for wouter Router.
// Signature matches wouter's `hook` contract: () => [path, navigate]
function useHashLocation(): [string, (to: string) => void] {
  const getHashPath = () => {
    const hash = window.location.hash || "";
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    // Support both "#/path" and "#path" by normalizing to "/path"
    const path = raw.startsWith("/") ? raw : `/${raw}`;
    return path === "/" ? "/" : path.replace(/\/+$/, "");
  };

  const [path, setPath] = useState<string>(() => getHashPath());

  useEffect(() => {
    const onChange = () => setPath(getHashPath());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = (to: string) => {
    const normalized = to.startsWith("/") ? to : `/${to}`;
    window.location.hash = normalized;
  };

  return [path, navigate];
}
