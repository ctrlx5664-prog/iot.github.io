import { Link, useLocation } from "wouter";
import {
  Home,
  Store,
  Lightbulb,
  BarChart3,
  Menu,
  Search,
  Plus,
  Power,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import type { Light, Tv } from "@shared/schema";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

export function MobileBottomNav() {
  const [location] = useLocation();
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const { toggleSidebar } = useSidebar();
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  // Get device stats for badges
  const { data: lights = [] } = useQuery<Light[]>({
    queryKey: ["/api/lights"],
  });

  const { data: tvs = [] } = useQuery<Tv[]>({
    queryKey: ["/api/tvs"],
  });

  const activeLights = lights.filter((l) => l.isOn).length;
  const offlineCount = 
    lights.filter((l) => l.status === "offline").length +
    tvs.filter((t) => t.status === "offline").length;

  const navItems = [
    {
      href: "/dashboard",
      icon: Home,
      label: "Home",
      isActive: location === "/dashboard",
    },
    {
      href: "/brands",
      icon: Store,
      label: tr("Lojas", "Stores"),
      isActive: location.startsWith("/brand") || location.startsWith("/store"),
    },
    {
      href: "#quick-actions",
      icon: Plus,
      label: "",
      isQuickAction: true,
    },
    {
      href: "/local-control",
      icon: Lightbulb,
      label: tr("Controlo", "Control"),
      isActive: location === "/local-control" || location === "/schedules",
      badge: activeLights > 0 ? activeLights : undefined,
    },
    {
      href: "/energy",
      icon: BarChart3,
      label: tr("Energia", "Energy"),
      isActive: location === "/energy" || location === "/logs",
    },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item, index) => {
            if (item.isQuickAction) {
              return (
                <Sheet key={index} open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
                  <SheetTrigger asChild>
                    <button className="flex flex-col items-center justify-center -mt-6">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 active:scale-95 transition-transform">
                        <Plus className="w-7 h-7 text-white" />
                      </div>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl">
                    <SheetHeader className="pb-4">
                      <SheetTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-cyan-500" />
                        {tr("Ações Rápidas", "Quick Actions")}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="grid grid-cols-2 gap-3 pb-8">
                      <QuickActionButton
                        icon={<Power className="w-6 h-6" />}
                        label={tr("Ligar Tudo", "All On")}
                        color="bg-green-500/10 text-green-500 border-green-500/30"
                        onClick={() => setQuickActionsOpen(false)}
                      />
                      <QuickActionButton
                        icon={<Power className="w-6 h-6" />}
                        label={tr("Desligar Tudo", "All Off")}
                        color="bg-red-500/10 text-red-500 border-red-500/30"
                        onClick={() => setQuickActionsOpen(false)}
                      />
                      <QuickActionButton
                        icon={<Lightbulb className="w-6 h-6" />}
                        label={tr("Cena Dia", "Day Scene")}
                        color="bg-amber-500/10 text-amber-500 border-amber-500/30"
                        onClick={() => setQuickActionsOpen(false)}
                      />
                      <QuickActionButton
                        icon={<Lightbulb className="w-6 h-6" />}
                        label={tr("Cena Noite", "Night Scene")}
                        color="bg-indigo-500/10 text-indigo-500 border-indigo-500/30"
                        onClick={() => setQuickActionsOpen(false)}
                      />
                      <Link href="/search" onClick={() => setQuickActionsOpen(false)} className="col-span-2">
                        <QuickActionButton
                          icon={<Search className="w-6 h-6" />}
                          label={tr("Pesquisar", "Search")}
                          color="bg-muted text-foreground border-border"
                          fullWidth
                        />
                      </Link>
                    </div>
                  </SheetContent>
                </Sheet>
              );
            }

            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[64px] py-2 px-3 rounded-xl transition-all active:scale-95",
                    item.isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="relative">
                    <item.icon className={cn("w-6 h-6", item.isActive && "text-cyan-500")} />
                    {item.badge !== undefined && (
                      <Badge
                        className="absolute -top-2 -right-2 h-4 min-w-[16px] px-1 text-[10px] bg-cyan-500 text-white"
                      >
                        {item.badge}
                      </Badge>
                    )}
                    {item.isActive && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-500" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] mt-1 font-medium",
                    item.isActive && "text-cyan-500"
                  )}>
                    {item.label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom padding spacer for content */}
      <div className="h-16 md:hidden" />
    </>
  );
}

function QuickActionButton({
  icon,
  label,
  color,
  onClick,
  fullWidth = false,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick?: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-95",
        color,
        fullWidth && "justify-center"
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

// Mobile-specific header with compact design
export function MobileHeader() {
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const { toggleSidebar } = useSidebar();

  // Get offline count for alert badge
  const { data: lights = [] } = useQuery<Light[]>({
    queryKey: ["/api/lights"],
  });
  const { data: tvs = [] } = useQuery<Tv[]>({
    queryKey: ["/api/tvs"],
  });

  const offlineCount =
    lights.filter((l) => l.status === "offline").length +
    tvs.filter((t) => t.status === "offline").length;

  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-lg sticky top-0 z-40">
      <button 
        onClick={() => toggleSidebar()}
        className="p-2 -ml-2 rounded-lg hover:bg-muted active:scale-95 transition-all"
      >
        <Menu className="w-6 h-6" />
      </button>

      <Link href="/dashboard">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
            CtrlX
          </span>
        </div>
      </Link>

      <Link href="/search">
        <button className="relative p-2 -mr-2 rounded-lg hover:bg-muted active:scale-95 transition-all">
          <Search className="w-6 h-6" />
          {offlineCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 text-[10px]"
            >
              {offlineCount}
            </Badge>
          )}
        </button>
      </Link>
    </header>
  );
}

// CSS for safe area on iOS
export const mobileStyles = `
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  
  .safe-area-top {
    padding-top: env(safe-area-inset-top, 0);
  }

  /* Improve touch targets globally on mobile */
  @media (max-width: 768px) {
    button, a, [role="button"] {
      min-height: 44px;
    }
    
    /* Better tap highlight */
    * {
      -webkit-tap-highlight-color: rgba(0, 200, 255, 0.1);
    }
    
    /* Prevent text selection on buttons */
    button {
      -webkit-user-select: none;
      user-select: none;
    }
    
    /* Smoother scrolling */
    .overflow-y-auto {
      -webkit-overflow-scrolling: touch;
    }
  }
`;
