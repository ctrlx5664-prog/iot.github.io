import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Building2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Company, Location, InsertCompany, InsertLocation } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function Companies() {
  const { toast } = useToast();
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      return await apiRequest<Company>('POST', '/api/companies', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      setIsCompanyDialogOpen(false);
      toast({
        title: "Success",
        description: "Company created successfully",
      });
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: async (data: InsertLocation) => {
      return await apiRequest<Location>('POST', '/api/locations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      setIsLocationDialogOpen(false);
      toast({
        title: "Success",
        description: "Location added successfully",
      });
    },
  });

  const handleCreateCompany = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createCompanyMutation.mutate({
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
    });
  };

  const handleCreateLocation = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createLocationMutation.mutate({
      companyId: selectedCompanyId,
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
    });
  };

  const getLocationsForCompany = (companyId: string) => {
    return locations.filter(l => l.companyId === companyId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
            Companies & Locations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organizational structure
          </p>
        </div>
        <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-company">
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
              <DialogDescription>
                Create a new company to organize your IoT devices
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name *</Label>
                <Input
                  id="company-name"
                  name="name"
                  placeholder="e.g., Acme Corporation"
                  required
                  data-testid="input-company-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-description">Description</Label>
                <Textarea
                  id="company-description"
                  name="description"
                  placeholder="Optional description"
                  rows={3}
                  data-testid="input-company-description"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCompanyDialogOpen(false)}
                  data-testid="button-cancel-company"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCompanyMutation.isPending}
                  data-testid="button-submit-company"
                >
                  {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No companies yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get started by creating your first company
            </p>
            <Button onClick={() => setIsCompanyDialogOpen(true)} data-testid="button-create-first-company">
              <Plus className="w-4 h-4 mr-2" />
              Create Company
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => {
            const companyLocations = getLocationsForCompany(company.id);
            return (
              <Card key={company.id} data-testid={`card-company-${company.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-medium truncate">
                        {company.name}
                      </CardTitle>
                      {company.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {company.description}
                        </CardDescription>
                      )}
                    </div>
                    <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Locations</span>
                    <Badge variant="secondary">{companyLocations.length}</Badge>
                  </div>

                  {companyLocations.length > 0 && (
                    <div className="space-y-1 pt-2 border-t">
                      {companyLocations.slice(0, 3).map((location) => (
                        <div
                          key={location.id}
                          className="flex items-center gap-2 text-sm"
                          data-testid={`text-location-${location.id}`}
                        >
                          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{location.name}</span>
                        </div>
                      ))}
                      {companyLocations.length > 3 && (
                        <p className="text-xs text-muted-foreground pl-5">
                          +{companyLocations.length - 3} more
                        </p>
                      )}
                    </div>
                  )}

                  <Dialog
                    open={isLocationDialogOpen && selectedCompanyId === company.id}
                    onOpenChange={(open) => {
                      setIsLocationDialogOpen(open);
                      if (open) setSelectedCompanyId(company.id);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setSelectedCompanyId(company.id)}
                        data-testid={`button-add-location-${company.id}`}
                      >
                        <Plus className="w-3 h-3 mr-2" />
                        Add Location
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Location to {company.name}</DialogTitle>
                        <DialogDescription>
                          Create a new location where devices will be installed
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateLocation} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="location-name">Location Name *</Label>
                          <Input
                            id="location-name"
                            name="name"
                            placeholder="e.g., Main Office, Floor 3"
                            required
                            data-testid="input-location-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location-description">Description</Label>
                          <Textarea
                            id="location-description"
                            name="description"
                            placeholder="Optional description"
                            rows={3}
                            data-testid="input-location-description"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsLocationDialogOpen(false)}
                            data-testid="button-cancel-location"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createLocationMutation.isPending}
                            data-testid="button-submit-location"
                          >
                            {createLocationMutation.isPending ? "Adding..." : "Add Location"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
