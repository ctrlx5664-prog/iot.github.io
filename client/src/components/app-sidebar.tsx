import {
  Building2,
  Lightbulb,
  Home,
  Plus,
  Users,
  LayoutDashboard,
  Settings,
  LogOut,
  User,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Store,
  MapPin,
  Search,
  Tv,
  Monitor,
  Leaf,
  FileText,
  UserCog,
  Zap,
  BarChart3,
  History,
  Star,
  AlertCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Company, Location, Light, Tv } from "@shared/schema";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useMemo, useEffect } from "react";
import { getToken, apiUrl, clearToken } from "@/lib/auth";

// Get favorites from localStorage
function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem("favorites") || "[]");
  } catch {
    return [];
  }
}
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface UserInfo {
  id: string;
  username: string;
  email: string;
  hasOrganizations: boolean;
}

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { t, language } = useTranslation();
  const [lightControlOpen, setLightControlOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const [storesOpen, setStoresOpen] = useState(true);
  const [ecoOpen, setEcoOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [favorites, setFavorites] = useState<string[]>(getFavorites);

  // Sync favorites from localStorage on storage event (cross-tab)
  useEffect(() => {
    const onStorage = () => setFavorites(getFavorites());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Get current user info
  const { data: userData } = useQuery<{ user: UserInfo }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const token = getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(apiUrl("/api/auth/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const user = userData?.user;
  const hasOrganizations = user?.hasOrganizations ?? false;

  const handleLogout = () => {
    clearToken();
    queryClient.clear();
    navigate("/login");
  };

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
  });

  const { data: lights = [] } = useQuery<Light[]>({
    queryKey: ["/api/lights"],
  });

  const { data: tvs = [] } = useQuery<Tv[]>({
    queryKey: ["/api/tvs"],
  });

  const getDeviceCountForLocation = (locationId: string) => {
    const lightCount = lights.filter((l) => l.locationId === locationId).length;
    const tvCount = tvs.filter((t) => t.locationId === locationId).length;
    return lightCount + tvCount;
  };

  const getLocationsForCompany = (companyId: string) => {
    return locations.filter((l) => l.companyId === companyId);
  };

  const onlineLights = lights.filter((l) => l.status === "online").length;
  const offlineLights = lights.filter((l) => l.status === "offline").length;
  const onlineTvs = tvs.filter((t) => t.status === "online").length;
  const offlineTvs = tvs.filter((t) => t.status === "offline").length;
  const totalDevices = lights.length + tvs.length;
  const onlineDevices = onlineLights + onlineTvs;
  const offlineDevices = offlineLights + offlineTvs;

  // Get favorite items
  const favoriteLocations = useMemo(
    () => locations.filter((l) => favorites.includes(l.id)),
    [locations, favorites]
  );
  const favoriteCompanies = useMemo(
    () => companies.filter((c) => favorites.includes(c.id)),
    [companies, favorites]
  );
  const hasFavorites = favoriteLocations.length > 0 || favoriteCompanies.length > 0;

  // Calculate offline devices per store for badges
  const getStoreOfflineCount = (companyId: string) => {
    const companyLocationIds = locations
      .filter((loc) => loc.companyId === companyId)
      .map((loc) => loc.id);
    const offL = lights.filter(
      (l) => companyLocationIds.includes(l.locationId) && l.status === "offline"
    ).length;
    const offT = tvs.filter(
      (t) => companyLocationIds.includes(t.locationId) && t.status === "offline"
    ).length;
    return offL + offT;
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent tracking-tight">
              CtrlX
            </h2>
            <p className="text-xs text-muted-foreground">{t("nav.controlPanel")}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
            {language === "pt" ? "Navegação" : "Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                  <Link href="/dashboard" data-testid="link-dashboard">
                    <Home className="w-4 h-4" />
                    <span>{t("nav.dashboard")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/search"}>
                  <Link href="/search" data-testid="link-search">
                    <Search className="w-4 h-4" />
                    <span>{t("nav.search")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Light Control Section */}
        <SidebarGroup>
          <Collapsible open={lightControlOpen} onOpenChange={setLightControlOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold cursor-pointer hover:text-foreground flex items-center justify-between w-full pr-2">
                <span className="flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
                  {t("nav.lightControl")}
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    !lightControlOpen && "-rotate-90"
                  )}
                />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* Home Assistant Dashboard */}
                  {hasOrganizations && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/ha"}>
                        <Link href="/ha" data-testid="link-home-assistant">
                          <LayoutDashboard className="w-4 h-4" />
                          <span>{t("dashboard.title")}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  
                  {/* Stores sub-section */}
                  <SidebarMenuItem>
                    <Collapsible open={storesOpen} onOpenChange={setStoresOpen}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className="w-full justify-between">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4" />
                            <span>{t("nav.stores")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-xs h-5 px-1.5">
                              {companies.length}
                            </Badge>
                            <ChevronRight
                              className={cn(
                                "w-3 h-3 transition-transform",
                                storesOpen && "rotate-90"
                              )}
                            />
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenu className="ml-4 mt-1 space-y-0.5">
                          <SidebarMenuItem>
                            <SidebarMenuButton
                              asChild
                              isActive={location === "/stores"}
                              className="h-8"
                            >
                              <Link href="/stores" data-testid="link-stores">
                                <Building2 className="w-3.5 h-3.5" />
                                <span className="text-sm">{t("nav.allStores")}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton
                              asChild
                              isActive={location === "/companies"}
                              className="h-8"
                            >
                              <Link href="/companies" data-testid="link-companies">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="text-sm">{t("nav.spaces")}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </SidebarMenu>
                      </CollapsibleContent>
                    </Collapsible>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Media Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
            <span className="flex items-center gap-2">
              <Tv className="w-3.5 h-3.5 text-blue-500" />
              {t("nav.media")}
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/videos"}>
                  <Link href="/videos" data-testid="link-videos">
                    <Monitor className="w-4 h-4" />
                    <span>{t("nav.videos")} & {t("nav.tvs")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Eco Management Section */}
        <SidebarGroup>
          <Collapsible open={ecoOpen} onOpenChange={setEcoOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold cursor-pointer hover:text-foreground flex items-center justify-between w-full pr-2">
                <span className="flex items-center gap-2">
                  <Leaf className="w-3.5 h-3.5 text-green-500" />
                  {t("nav.ecoManagement")}
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    !ecoOpen && "-rotate-90"
                  )}
                />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/energy"}>
                      <Link href="/energy" data-testid="link-energy">
                        <BarChart3 className="w-4 h-4" />
                        <span>{t("nav.energyUsage")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Administration Section */}
        <SidebarGroup>
          <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold cursor-pointer hover:text-foreground flex items-center justify-between w-full pr-2">
                <span className="flex items-center gap-2">
                  <UserCog className="w-3.5 h-3.5 text-purple-500" />
                  {t("nav.administration")}
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform",
                    !adminOpen && "-rotate-90"
                  )}
                />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={location === "/organizations"}
                    >
                      <Link href="/organizations" data-testid="link-organizations">
                        <Building2 className="w-4 h-4" />
                        <span>{t("nav.organizations")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/members"}>
                      <Link href="/members" data-testid="link-members">
                        <Users className="w-4 h-4" />
                        <span>{t("nav.members")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/logs"}>
                      <Link href="/logs" data-testid="link-logs">
                        <History className="w-4 h-4" />
                        <span>{t("nav.activityLogs")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Favorites Section */}
        {hasFavorites && (
          <SidebarGroup>
            <Collapsible open={favoritesOpen} onOpenChange={setFavoritesOpen}>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold cursor-pointer hover:text-foreground flex items-center justify-between w-full pr-2">
                  <span className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    {language === "pt" ? "Favoritos" : "Favorites"}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform",
                      !favoritesOpen && "-rotate-90"
                    )}
                  />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {favoriteCompanies.map((company) => {
                      const offlineCount = getStoreOfflineCount(company.id);
                      return (
                        <SidebarMenuItem key={company.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={location === `/store/${company.id}`}
                            className="h-8"
                          >
                            <Link href={`/store/${company.id}`}>
                              <Store className="w-3.5 h-3.5" />
                              <span className="flex-1 truncate text-sm">{company.name}</span>
                              {offlineCount > 0 && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1">
                                  {offlineCount}
                                </Badge>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                    {favoriteLocations.map((loc) => {
                      const locLights = lights.filter((l) => l.locationId === loc.id);
                      const locTvs = tvs.filter((t) => t.locationId === loc.id);
                      const hasOffline = locLights.some((l) => l.status === "offline") ||
                                         locTvs.some((t) => t.status === "offline");
                      return (
                        <SidebarMenuItem key={loc.id}>
                          <SidebarMenuButton
                            asChild
                            isActive={location === `/location/${loc.id}`}
                            className="h-8"
                          >
                            <Link href={`/location/${loc.id}`}>
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="flex-1 truncate text-sm">{loc.name}</span>
                              {hasOffline && (
                                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        {/* Quick Access to Stores */}
        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
              {t("nav.recentStores")}
              {offlineDevices > 0 && (
                <Badge variant="destructive" className="ml-2 text-[10px] h-4 px-1">
                  {offlineDevices} offline
                </Badge>
              )}
            </SidebarGroupLabel>
            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
              <Link href="/stores" data-testid="button-add-store">
                <Plus className="w-3 h-3" />
              </Link>
            </Button>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {companies.length === 0 && (
                <div className="px-2 py-4 text-xs text-muted-foreground">
                  {language === "pt" ? "Nenhuma loja ainda" : "No stores yet"}
                </div>
              )}
              {companies.slice(0, 5).map((company) => {
                const offlineCount = getStoreOfflineCount(company.id);
                return (
                  <CompanyLocationTree
                    key={company.id}
                    company={company}
                    locations={getLocationsForCompany(company.id)}
                    getDeviceCount={getDeviceCountForLocation}
                    currentPath={location}
                    offlineCount={offlineCount}
                  />
                );
              })}
              {companies.length > 5 && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="text-muted-foreground">
                    <Link href="/stores">
                      <span className="text-xs">
                        {language === "pt" ? "Ver todas" : "View all"} ({companies.length})
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {/* Device Stats */}
        <div className="px-4 py-2 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("nav.devices")}</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-medium">{onlineDevices}</span>
              </div>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">{totalDevices}</span>
            </div>
          </div>
        </div>

        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-3 hover:bg-sidebar-accent rounded-lg transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white text-xs font-bold">
                    {getInitials(user.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side="top">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  {t("auth.profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  {t("auth.settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t("auth.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

interface CompanyLocationTreeProps {
  key?: string;
  company: Company;
  locations: Location[];
  getDeviceCount: (locationId: string) => number;
  currentPath: string;
  offlineCount?: number;
}

function CompanyLocationTree({
  company,
  locations,
  getDeviceCount,
  currentPath,
  offlineCount = 0,
}: CompanyLocationTreeProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            data-testid={`button-company-${company.id}`}
            className="group"
          >
            <Store className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
            <span className="flex-1 truncate text-sm">{company.name}</span>
            {offlineCount > 0 ? (
              <Badge variant="destructive" className="text-[10px] h-4 px-1">
                {offlineCount}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs h-5 px-1.5 opacity-60">
                {locations.length}
              </Badge>
            )}
            <ChevronRight
              className={cn(
                "w-3 h-3 transition-transform opacity-60",
                isOpen && "rotate-90"
              )}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenu className="ml-4 border-l border-sidebar-border pl-2">
            {locations.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                Sem espaços
              </div>
            )}
            {locations.map((location) => (
              <SidebarMenuItem key={location.id}>
                <SidebarMenuButton
                  asChild
                  isActive={currentPath === `/location/${location.id}`}
                  data-testid={`link-location-${location.id}`}
                  className="h-8"
                >
                  <Link href={`/location/${location.id}`}>
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="flex-1 truncate text-xs">
                      {location.name}
                    </span>
                    <Badge variant="secondary" className="text-xs h-4 px-1">
                      {getDeviceCount(location.id)}
                    </Badge>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
