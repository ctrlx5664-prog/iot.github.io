import {
  Home,
  Store,
  MapPin,
  Search,
  Zap,
  BarChart3,
  History,
  Users,
  Settings,
  LogOut,
  User,
  ChevronUp,
  ChevronRight,
  Lightbulb,
  Monitor,
  LayoutDashboard,
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Company, Location, Light, Tv } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMemo } from "react";
import { getToken, apiUrl, clearToken } from "@/lib/auth";
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

  // Calculate stats
  const stats = useMemo(() => {
    const activeLights = lights.filter((l) => l.isOn).length;
    const offlineDevices = lights.filter((l) => l.status === "offline").length +
                           tvs.filter((t) => t.status === "offline").length;
    return { activeLights, totalLights: lights.length, offlineDevices };
  }, [lights, tvs]);

  // Store stats for badges
  const getStoreStats = (companyId: string) => {
    const storeLocations = locations.filter((l) => l.companyId === companyId);
    const locationIds = storeLocations.map((l) => l.id);
    const storeLights = lights.filter((l) => locationIds.includes(l.locationId));
    const offline = storeLights.filter((l) => l.status === "offline").length;
    return { spaces: storeLocations.length, offline };
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      {/* Header */}
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/dashboard">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent tracking-tight">
                CtrlX
              </h2>
              <p className="text-xs text-muted-foreground">
                {language === "pt" ? "Painel de Controlo" : "Control Panel"}
              </p>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
            {language === "pt" ? "Principal" : "Main"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                  <Link href="/dashboard">
                    <Home className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/ha"}>
                  <Link href="/ha">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>{language === "pt" ? "Controlo" : "Control"}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/search"}>
                  <Link href="/search">
                    <Search className="w-4 h-4" />
                    <span>{language === "pt" ? "Pesquisar" : "Search"}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Stores Section */}
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 mb-1">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold p-0">
              {language === "pt" ? "Lojas" : "Stores"}
            </SidebarGroupLabel>
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              {companies.length}
            </Badge>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* All Stores Link */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/stores"}>
                  <Link href="/stores">
                    <Store className="w-4 h-4" />
                    <span>{language === "pt" ? "Ver Todas" : "View All"}</span>
                    <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Individual Stores */}
              {companies.slice(0, 6).map((company) => {
                const storeStats = getStoreStats(company.id);
                const isActive = location === `/store/${company.id}` ||
                                 location.startsWith(`/location/`) && 
                                 locations.some(l => l.companyId === company.id && location === `/location/${l.id}`);
                
                return (
                  <SidebarMenuItem key={company.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="pl-6"
                    >
                      <Link href={`/store/${company.id}`}>
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="flex-1 truncate text-sm">{company.name}</span>
                        {storeStats.offline > 0 ? (
                          <Badge variant="destructive" className="text-[10px] h-4 px-1">
                            {storeStats.offline}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {storeStats.spaces}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              
              {companies.length > 6 && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="pl-6 text-muted-foreground">
                    <Link href="/stores">
                      <span className="text-xs">
                        +{companies.length - 6} {language === "pt" ? "mais" : "more"}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
            {language === "pt" ? "Ferramentas" : "Tools"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/energy"}>
                  <Link href="/energy">
                    <BarChart3 className="w-4 h-4" />
                    <span>{language === "pt" ? "Energia" : "Energy"}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/logs"}>
                  <Link href="/logs">
                    <History className="w-4 h-4" />
                    <span>{language === "pt" ? "Histórico" : "History"}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/videos"}>
                  <Link href="/videos">
                    <Monitor className="w-4 h-4" />
                    <span>{language === "pt" ? "Vídeos & TVs" : "Videos & TVs"}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
            {language === "pt" ? "Administração" : "Admin"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/members"}>
                  <Link href="/members">
                    <Users className="w-4 h-4" />
                    <span>{language === "pt" ? "Utilizadores" : "Users"}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/organizations"}>
                  <Link href="/organizations">
                    <Settings className="w-4 h-4" />
                    <span>{language === "pt" ? "Organização" : "Organization"}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {/* Quick Stats */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-muted-foreground">{language === "pt" ? "Luzes" : "Lights"}</span>
            </div>
            <span className="font-medium">
              <span className="text-green-500">{stats.activeLights}</span>
              <span className="text-muted-foreground">/{stats.totalLights}</span>
            </span>
          </div>
          {stats.offlineDevices > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-500">{language === "pt" ? "Offline" : "Offline"}</span>
              <Badge variant="destructive" className="text-[10px] h-4 px-1">
                {stats.offlineDevices}
              </Badge>
            </div>
          )}
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
                  <p className="text-sm font-medium truncate">{user.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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
                  {language === "pt" ? "Perfil" : "Profile"}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  {language === "pt" ? "Definições" : "Settings"}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {language === "pt" ? "Terminar Sessão" : "Logout"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
