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
  ChevronDown,
  Lightbulb,
  Monitor,
  LayoutDashboard,
  Building2,
  FileText,
  Wrench,
  Tag,
  Sliders,
  Clock,
  Film,
  Play,
  Upload,
  Shield,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMemo, useState } from "react";
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
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);

  // Collapsible states
  const [lightControlOpen, setLightControlOpen] = useState(true);
  const [storesOpen, setStoresOpen] = useState(false);
  const [localMgmtOpen, setLocalMgmtOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

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
                {tr("Painel de Controlo", "Control Panel")}
              </p>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LIGHT CONTROL SECTION */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Collapsible open={lightControlOpen} onOpenChange={setLightControlOpen}>
          <SidebarGroup>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold cursor-pointer hover:text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  {tr("Light Control", "Light Control")}
                </span>
                {lightControlOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* Dashboard */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                      <Link href="/dashboard">
                        <Home className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Administration submenu */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/administration"}>
                      <Link href="/administration">
                        <Building2 className="w-4 h-4" />
                        <span>{tr("Administração", "Administration")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/members"}>
                      <Link href="/members">
                        <Users className="w-4 h-4" />
                        <span>{tr("Membros", "Members")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/access-groups"}>
                        <Link href="/access-groups">
                          <Shield className="w-4 h-4" />
                          <span>{tr("Grupos de Acesso", "Access Groups")}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/requests"}>
                      <Link href="/requests">
                        <Wrench className="w-4 h-4" />
                        <span>{tr("Pedidos", "Requests")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* STORES SECTION */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Collapsible open={storesOpen} onOpenChange={setStoresOpen}>
          <SidebarGroup>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold cursor-pointer hover:text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  {tr("Lojas", "Stores")}
                  <Badge variant="secondary" className="text-xs h-5 px-1.5 ml-1">
                    {companies.length}
                  </Badge>
                </span>
                {storesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/brands"}>
                      <Link href="/brands">
                        <Tag className="w-4 h-4" />
                        <span>{tr("Marcas", "Brands")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/stores"}>
                      <Link href="/stores">
                        <MapPin className="w-4 h-4" />
                        <span>{tr("Espaços", "Spaces")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/search"}>
                      <Link href="/search">
                        <Search className="w-4 h-4" />
                        <span>{tr("Pesquisar", "Search")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Individual Stores */}
                  {companies.slice(0, 5).map((company) => {
                    const storeStats = getStoreStats(company.id);
                    const isActive = location === `/store/${company.id}`;
                    
                    return (
                      <SidebarMenuItem key={company.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className="pl-6"
                        >
                          <Link href={`/store/${company.id}`}>
                            <Store className="w-3.5 h-3.5" />
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
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LOCAL MANAGEMENT SECTION */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Collapsible open={localMgmtOpen} onOpenChange={setLocalMgmtOpen}>
          <SidebarGroup>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold cursor-pointer hover:text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  {tr("Gestão Local", "Local Management")}
                </span>
                {localMgmtOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/local-control"}>
                      <Link href="/local-control">
                        <Lightbulb className="w-4 h-4" />
                        <span>{tr("Controlo Local", "Local Control")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/schedules"}>
                      <Link href="/schedules">
                        <Clock className="w-4 h-4" />
                        <span>{tr("Agendamentos", "Schedules")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ECO MANAGEMENT SECTION */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
            <span className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {tr("Eco Management", "Eco Management")}
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/energy"}>
                  <Link href="/energy">
                    <Zap className="w-4 h-4" />
                    <span>{tr("Consumo Energético", "Energy Consumption")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/logs"}>
                  <Link href="/logs">
                    <History className="w-4 h-4" />
                    <span>{tr("Histórico", "History")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* MEDIA SECTION */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Collapsible open={mediaOpen} onOpenChange={setMediaOpen}>
          <SidebarGroup>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold cursor-pointer hover:text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  {tr("Media", "Media")}
                </span>
                {mediaOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/media"}>
                      <Link href="/media">
                        <Home className="w-4 h-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/media/content"}>
                      <Link href="/media/content">
                        <Upload className="w-4 h-4" />
                        <span>{tr("Conteúdos", "Content")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/media/playlists"}>
                      <Link href="/media/playlists">
                        <Play className="w-4 h-4" />
                        <span>Playlists</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/videos"}>
                      <Link href="/videos">
                        <Film className="w-4 h-4" />
                        <span>{tr("Vídeos & TVs", "Videos & TVs")}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ADMIN SECTION */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              {tr("Sistema", "System")}
            </span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/organizations"}>
                  <Link href="/organizations">
                    <Settings className="w-4 h-4" />
                    <span>{tr("Organização", "Organization")}</span>
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
              <span className="text-muted-foreground">{tr("Luzes", "Lights")}</span>
            </div>
            <span className="font-medium">
              <span className="text-green-500">{stats.activeLights}</span>
              <span className="text-muted-foreground">/{stats.totalLights}</span>
            </span>
          </div>
          {stats.offlineDevices > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-red-500">Offline</span>
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
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email || tr("Sem email", "No email")}
                  </p>
                </div>
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side="top">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground">
                  {user.email || tr("Sem email", "No email")}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  {tr("Perfil", "Profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  {tr("Definições", "Settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {tr("Terminar Sessão", "Logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
