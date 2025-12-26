import { Building2, Lightbulb, Home, Plus, Users, LayoutDashboard, Settings, LogOut, User, ChevronUp } from "lucide-react";
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
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { getToken, apiUrl, clearToken } from "@/lib/auth";

interface UserInfo {
  id: string;
  username: string;
  email: string;
  hasOrganizations: boolean;
}

export function AppSidebar() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();

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

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
              CtrlX
            </h2>
            <p className="text-xs text-muted-foreground">IoT Manager</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/"}>
                  <Link href="/" data-testid="link-dashboard">
                    <Home className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/companies"}>
                  <Link href="/companies" data-testid="link-companies">
                    <Building2 className="w-4 h-4" />
                    <span>Companies</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/organizations"}
                >
                  <Link href="/organizations" data-testid="link-organizations">
                    <Users className="w-4 h-4" />
                    <span>Organizações</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* Home Assistant only shows when user has organizations */}
              {hasOrganizations && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/ha"}
                  >
                    <Link href="/ha" data-testid="link-home-assistant">
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard de Controlo</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel>Locations</SidebarGroupLabel>
            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
              <Link href="/companies" data-testid="button-add-company">
                <Plus className="w-3 h-3" />
              </Link>
            </Button>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {companies.length === 0 && (
                <div className="px-2 py-4 text-xs text-muted-foreground">
                  No companies yet
                </div>
              )}
              {companies.map((company) => (
                <CompanyLocationTree
                  key={company.id}
                  company={company}
                  locations={getLocationsForCompany(company.id)}
                  getDeviceCount={getDeviceCountForLocation}
                  currentPath={location}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {/* Device count */}
        <div className="px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Total Devices</span>
            <Badge variant="secondary" className="text-xs">
              {lights.length + tvs.length}
            </Badge>
          </div>
        </div>
        
        {/* User menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-3 hover:bg-sidebar-accent rounded-lg transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
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
                  Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Definições
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Terminar Sessão
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
}

function CompanyLocationTree({
  company,
  locations,
  getDeviceCount,
  currentPath,
}: CompanyLocationTreeProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton data-testid={`button-company-${company.id}`}>
            <Building2 className="w-4 h-4" />
            <span className="flex-1 truncate">{company.name}</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${
                isOpen ? "rotate-0" : "-rotate-90"
              }`}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenu className="ml-4 border-l border-sidebar-border">
            {locations.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                No locations
              </div>
            )}
            {locations.map((location) => (
              <SidebarMenuItem key={location.id}>
                <SidebarMenuButton
                  asChild
                  isActive={currentPath === `/location/${location.id}`}
                  data-testid={`link-location-${location.id}`}
                >
                  <Link href={`/location/${location.id}`}>
                    <span className="flex-1 truncate text-sm">
                      {location.name}
                    </span>
                    <Badge variant="secondary" className="text-xs h-5">
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
