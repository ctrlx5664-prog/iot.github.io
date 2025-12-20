import { Building2, Lightbulb, Monitor, Home, Plus } from "lucide-react";
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
import { useQuery } from "@tanstack/react-query";
import type { Company, Location, Light, Tv } from "@shared/schema";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function AppSidebar() {
  const [location] = useLocation();

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  const { data: lights = [] } = useQuery<Light[]>({
    queryKey: ['/api/lights'],
  });

  const { data: tvs = [] } = useQuery<Tv[]>({
    queryKey: ['/api/tvs'],
  });

  const getDeviceCountForLocation = (locationId: string) => {
    const lightCount = lights.filter(l => l.locationId === locationId).length;
    const tvCount = tvs.filter(t => t.locationId === locationId).length;
    return lightCount + tvCount;
  };

  const getLocationsForCompany = (companyId: string) => {
    return locations.filter(l => l.companyId === companyId);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
            <Lightbulb className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-sidebar-foreground">IoT Manager</h2>
            <p className="text-xs text-muted-foreground">Device Control</p>
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel>Locations</SidebarGroupLabel>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              asChild
            >
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

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Total Devices</span>
            <Badge variant="secondary" className="text-xs">
              {lights.length + tvs.length}
            </Badge>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function CompanyLocationTree({
  company,
  locations,
  getDeviceCount,
  currentPath,
}: {
  company: Company;
  locations: Location[];
  getDeviceCount: (locationId: string) => number;
  currentPath: string;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton data-testid={`button-company-${company.id}`}>
            <Building2 className="w-4 h-4" />
            <span className="flex-1 truncate">{company.name}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
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
                    <span className="flex-1 truncate text-sm">{location.name}</span>
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
