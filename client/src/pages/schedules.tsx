import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Sun,
  Moon,
  Power,
  Repeat,
  Play,
  Pause,
  Lightbulb,
  Store,
  MapPin,
  Building2,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getToken, apiUrl } from "@/lib/auth";
import type { Organization, Company, Location } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface Schedule {
  id: string;
  name: string;
  action: "turn_on" | "turn_off" | "set_brightness";
  time: string;
  days: string[];
  organizationId: string;
  storeId: string;
  locationId: string | null;
  target: "all_lights" | "specific";
  brightness: number;
  isActive: boolean;
  lastRun: string | null;
}

const dayLabels = {
  mon: { pt: "Seg", en: "Mon" },
  tue: { pt: "Ter", en: "Tue" },
  wed: { pt: "Qua", en: "Wed" },
  thu: { pt: "Qui", en: "Thu" },
  fri: { pt: "Sex", en: "Fri" },
  sat: { pt: "Sáb", en: "Sat" },
  sun: { pt: "Dom", en: "Sun" },
};

const allDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function Schedules() {
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const { toast } = useToast();

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteSchedule, setDeleteSchedule] = useState<Schedule | null>(null);

  // Filter states
  const [filterOrganization, setFilterOrganization] = useState<string>("all");
  const [filterStore, setFilterStore] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");

  // Form states
  const [formName, setFormName] = useState("");
  const [formAction, setFormAction] = useState<"turn_on" | "turn_off" | "set_brightness">("turn_on");
  const [formTime, setFormTime] = useState("08:00");
  const [formDays, setFormDays] = useState<string[]>(["mon", "tue", "wed", "thu", "fri"]);
  const [formOrganization, setFormOrganization] = useState<string>("");
  const [formStore, setFormStore] = useState<string>("");
  const [formLocation, setFormLocation] = useState<string>("all");
  const [formBrightness, setFormBrightness] = useState(100);

  // Mock schedules with proper hierarchy
  const [schedules, setSchedules] = useState<Schedule[]>([
    {
      id: "1",
      name: "Abertura Manhã",
      action: "turn_on",
      time: "08:00",
      days: ["mon", "tue", "wed", "thu", "fri"],
      organizationId: "org-1",
      storeId: "store-1",
      locationId: null,
      target: "all_lights",
      brightness: 100,
      isActive: true,
      lastRun: "2026-01-17T08:00:00",
    },
    {
      id: "2",
      name: "Fecho Noite",
      action: "turn_off",
      time: "22:00",
      days: ["mon", "tue", "wed", "thu", "fri", "sat"],
      organizationId: "org-1",
      storeId: "store-1",
      locationId: null,
      target: "all_lights",
      brightness: 0,
      isActive: true,
      lastRun: "2026-01-16T22:00:00",
    },
    {
      id: "3",
      name: "Modo Vitrine",
      action: "set_brightness",
      time: "10:00",
      days: ["sat", "sun"],
      organizationId: "org-1",
      storeId: "store-2",
      locationId: "loc-1",
      target: "specific",
      brightness: 80,
      isActive: true,
      lastRun: "2026-01-11T10:00:00",
    },
    {
      id: "4",
      name: "Redução Noturna",
      action: "set_brightness",
      time: "20:00",
      days: allDays,
      organizationId: "org-1",
      storeId: "store-1",
      locationId: null,
      target: "all_lights",
      brightness: 50,
      isActive: false,
      lastRun: null,
    },
  ]);

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch organizations
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/organizations"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch companies (stores)
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/companies"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch locations (spaces)
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/locations"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Filter stores by organization
  const filteredStoresForFilter = useMemo(() => {
    if (filterOrganization === "all") return companies;
    return companies.filter((c) => c.organizationId === filterOrganization);
  }, [companies, filterOrganization]);

  // Filter locations by store
  const filteredLocationsForFilter = useMemo(() => {
    if (filterStore === "all") return locations;
    return locations.filter((l) => l.companyId === filterStore);
  }, [locations, filterStore]);

  // Form stores based on selected organization
  const formStores = useMemo(() => {
    if (!formOrganization) return [];
    return companies.filter((c) => c.organizationId === formOrganization);
  }, [companies, formOrganization]);

  // Form locations based on selected store
  const formLocations = useMemo(() => {
    if (!formStore) return [];
    return locations.filter((l) => l.companyId === formStore);
  }, [locations, formStore]);

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      if (filterOrganization !== "all" && schedule.organizationId !== filterOrganization) return false;
      if (filterStore !== "all" && schedule.storeId !== filterStore) return false;
      if (filterLocation !== "all" && schedule.locationId !== filterLocation) return false;
      if (filterActive === "active" && !schedule.isActive) return false;
      if (filterActive === "inactive" && schedule.isActive) return false;
      return true;
    });
  }, [schedules, filterOrganization, filterStore, filterLocation, filterActive]);

  const stats = useMemo(() => ({
    total: filteredSchedules.length,
    active: filteredSchedules.filter((s) => s.isActive).length,
    inactive: filteredSchedules.filter((s) => !s.isActive).length,
  }), [filteredSchedules]);

  // Toggle schedule active state
  const toggleScheduleActive = (scheduleId: string) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleId ? { ...s, isActive: !s.isActive } : s
      )
    );
    const schedule = schedules.find((s) => s.id === scheduleId);
    toast({
      title: schedule?.isActive 
        ? tr("Agendamento desativado", "Schedule deactivated")
        : tr("Agendamento ativado", "Schedule activated"),
      description: schedule?.name,
    });
  };

  // Toggle day selection
  const toggleDay = (day: string) => {
    setFormDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Open edit modal
  const openEditModal = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormName(schedule.name);
    setFormAction(schedule.action);
    setFormTime(schedule.time);
    setFormDays(schedule.days);
    setFormOrganization(schedule.organizationId);
    setFormStore(schedule.storeId);
    setFormLocation(schedule.locationId || "all");
    setFormBrightness(schedule.brightness);
  };

  // Reset form
  const resetForm = () => {
    setFormName("");
    setFormAction("turn_on");
    setFormTime("08:00");
    setFormDays(["mon", "tue", "wed", "thu", "fri"]);
    setFormOrganization(organizations[0]?.id || "");
    setFormStore("");
    setFormLocation("all");
    setFormBrightness(100);
  };

  // Save schedule
  const saveSchedule = () => {
    if (!formName || !formOrganization || !formStore) {
      toast({
        title: tr("Erro", "Error"),
        description: tr("Preencha todos os campos obrigatórios", "Fill all required fields"),
        variant: "destructive",
      });
      return;
    }

    if (editingSchedule) {
      // Update existing
      setSchedules((prev) =>
        prev.map((s) =>
          s.id === editingSchedule.id
            ? {
                ...s,
                name: formName,
                action: formAction,
                time: formTime,
                days: formDays,
                organizationId: formOrganization,
                storeId: formStore,
                locationId: formLocation === "all" ? null : formLocation,
                brightness: formBrightness,
              }
            : s
        )
      );
      toast({
        title: tr("Agendamento atualizado", "Schedule updated"),
        description: formName,
      });
      setEditingSchedule(null);
    } else {
      // Create new
      const newSchedule: Schedule = {
        id: `schedule-${Date.now()}`,
        name: formName,
        action: formAction,
        time: formTime,
        days: formDays,
        organizationId: formOrganization,
        storeId: formStore,
        locationId: formLocation === "all" ? null : formLocation,
        target: formLocation === "all" ? "all_lights" : "specific",
        brightness: formBrightness,
        isActive: true,
        lastRun: null,
      };
      setSchedules((prev) => [...prev, newSchedule]);
      toast({
        title: tr("Agendamento criado", "Schedule created"),
        description: formName,
      });
      setIsCreateOpen(false);
    }
    resetForm();
  };

  // Delete schedule
  const confirmDelete = () => {
    if (deleteSchedule) {
      setSchedules((prev) => prev.filter((s) => s.id !== deleteSchedule.id));
      toast({
        title: tr("Agendamento eliminado", "Schedule deleted"),
        description: deleteSchedule.name,
      });
      setDeleteSchedule(null);
    }
  };

  // Helper functions
  const getActionLabel = (action: string) => {
    const labels: { [key: string]: { pt: string; en: string } } = {
      turn_on: { pt: "Ligar", en: "Turn On" },
      turn_off: { pt: "Desligar", en: "Turn Off" },
      set_brightness: { pt: "Definir Brilho", en: "Set Brightness" },
    };
    return tr(labels[action]?.pt || action, labels[action]?.en || action);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "turn_on":
        return <Sun className="w-4 h-4 text-yellow-500" />;
      case "turn_off":
        return <Moon className="w-4 h-4 text-blue-500" />;
      case "set_brightness":
        return <Lightbulb className="w-4 h-4 text-orange-500" />;
      default:
        return <Power className="w-4 h-4" />;
    }
  };

  const formatDays = (days: string[]) => {
    if (days.length === 7) return tr("Todos os dias", "Every day");
    if (days.length === 5 && !days.includes("sat") && !days.includes("sun")) {
      return tr("Dias úteis", "Weekdays");
    }
    if (days.length === 2 && days.includes("sat") && days.includes("sun")) {
      return tr("Fins de semana", "Weekends");
    }
    return days.map((d) => tr(dayLabels[d as keyof typeof dayLabels]?.pt, dayLabels[d as keyof typeof dayLabels]?.en)).join(", ");
  };

  const getOrganizationName = (id: string) => organizations.find((o) => o.id === id)?.name || id;
  const getStoreName = (id: string) => companies.find((c) => c.id === id)?.name || id;
  const getLocationName = (id: string | null) => {
    if (!id) return tr("Todos os espaços", "All spaces");
    return locations.find((l) => l.id === id)?.name || id;
  };

  // Form dialog content
  const FormContent = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>{tr("Nome", "Name")} *</Label>
        <Input
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder={tr("Ex: Abertura Manhã", "Ex: Morning Opening")}
        />
      </div>

      {/* Hierarchy selectors */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <p className="text-sm font-medium flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          {tr("Localização", "Location")}
        </p>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{tr("Organização", "Organization")} *</Label>
            <Select value={formOrganization} onValueChange={(v) => { setFormOrganization(v); setFormStore(""); setFormLocation("all"); }}>
              <SelectTrigger>
                <SelectValue placeholder={tr("Selecionar organização", "Select organization")} />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formOrganization && (
            <div className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">{tr("Loja", "Store")} *</Label>
                <Select value={formStore} onValueChange={(v) => { setFormStore(v); setFormLocation("all"); }}>
                  <SelectTrigger>
                    <SelectValue placeholder={tr("Selecionar loja", "Select store")} />
                  </SelectTrigger>
                  <SelectContent>
                    {formStores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {formStore && (
            <div className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-6" />
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">{tr("Espaço", "Space")}</Label>
                <Select value={formLocation} onValueChange={setFormLocation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tr("Todos os espaços", "All spaces")}</SelectItem>
                    {formLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{tr("Hora", "Time")} *</Label>
          <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{tr("Ação", "Action")} *</Label>
          <Select value={formAction} onValueChange={(v) => setFormAction(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="turn_on">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-500" />
                  {tr("Ligar", "Turn On")}
                </div>
              </SelectItem>
              <SelectItem value="turn_off">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-blue-500" />
                  {tr("Desligar", "Turn Off")}
                </div>
              </SelectItem>
              <SelectItem value="set_brightness">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-orange-500" />
                  {tr("Definir Brilho", "Set Brightness")}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {formAction === "set_brightness" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{tr("Brilho", "Brightness")}</Label>
            <span className="text-sm font-medium">{formBrightness}%</span>
          </div>
          <Slider
            value={[formBrightness]}
            onValueChange={(v) => setFormBrightness(v[0])}
            max={100}
            step={5}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>{tr("Dias da Semana", "Days of Week")} *</Label>
        <div className="flex gap-1">
          {allDays.map((day) => (
            <Button
              key={day}
              type="button"
              variant={formDays.includes(day) ? "default" : "outline"}
              size="sm"
              className="w-10 h-10 p-0"
              onClick={() => toggleDay(day)}
            >
              {tr(dayLabels[day as keyof typeof dayLabels].pt, dayLabels[day as keyof typeof dayLabels].en)}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setFormDays(["mon", "tue", "wed", "thu", "fri"])}>
            {tr("Dias úteis", "Weekdays")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setFormDays(["sat", "sun"])}>
            {tr("Fins de semana", "Weekends")}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setFormDays(allDays)}>
            {tr("Todos", "All")}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {tr("Agendamentos", "Schedules")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr("Gestão de horários automáticos de iluminação", "Management of automatic lighting schedules")}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {tr("Novo Agendamento", "New Schedule")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{tr("Criar Agendamento", "Create Schedule")}</DialogTitle>
              <DialogDescription>
                {tr("Configure um novo agendamento automático", "Configure a new automatic schedule")}
              </DialogDescription>
            </DialogHeader>
            <FormContent />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                {tr("Cancelar", "Cancel")}
              </Button>
              <Button onClick={saveSchedule}>
                {tr("Criar", "Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Total", "Total")}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Calendar className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Ativos", "Active")}</p>
                <p className="text-2xl font-bold text-green-500">{stats.active}</p>
              </div>
              <Play className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Inativos", "Inactive")}</p>
                <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
              </div>
              <Pause className="w-8 h-8 text-muted-foreground opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">{tr("Organização", "Organization")}</Label>
              <Select value={filterOrganization} onValueChange={(v) => { setFilterOrganization(v); setFilterStore("all"); setFilterLocation("all"); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("Todas", "All")}</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">{tr("Loja", "Store")}</Label>
              <Select value={filterStore} onValueChange={(v) => { setFilterStore(v); setFilterLocation("all"); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("Todas", "All")}</SelectItem>
                  {filteredStoresForFilter.map((store) => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">{tr("Espaço", "Space")}</Label>
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("Todos", "All")}</SelectItem>
                  {filteredLocationsForFilter.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-[120px]">
              <Label className="text-xs text-muted-foreground">{tr("Estado", "Status")}</Label>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("Todos", "All")}</SelectItem>
                  <SelectItem value="active">{tr("Ativos", "Active")}</SelectItem>
                  <SelectItem value="inactive">{tr("Inativos", "Inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedules Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {tr("Lista de Agendamentos", "Schedule List")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr("Nome", "Name")}</TableHead>
                <TableHead>{tr("Hora", "Time")}</TableHead>
                <TableHead>{tr("Dias", "Days")}</TableHead>
                <TableHead>{tr("Ação", "Action")}</TableHead>
                <TableHead>{tr("Localização", "Location")}</TableHead>
                <TableHead>{tr("Estado", "Status")}</TableHead>
                <TableHead className="text-right">{tr("Ações", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSchedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {tr("Nenhum agendamento encontrado", "No schedules found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSchedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {schedule.time}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        <Repeat className="w-3 h-3 mr-1" />
                        {formatDays(schedule.days)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(schedule.action)}
                        <span>{getActionLabel(schedule.action)}</span>
                        {schedule.action === "set_brightness" && (
                          <span className="text-muted-foreground">({schedule.brightness}%)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Store className="w-3 h-3" />
                          {getStoreName(schedule.storeId)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
                          <MapPin className="w-3 h-3" />
                          {getLocationName(schedule.locationId)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={schedule.isActive}
                        onCheckedChange={() => toggleScheduleActive(schedule.id)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(schedule)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500" onClick={() => setDeleteSchedule(schedule)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingSchedule} onOpenChange={(open) => { if (!open) setEditingSchedule(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tr("Editar Agendamento", "Edit Schedule")}</DialogTitle>
            <DialogDescription>
              {tr("Modifique as configurações do agendamento", "Modify schedule settings")}
            </DialogDescription>
          </DialogHeader>
          <FormContent />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSchedule(null)}>
              {tr("Cancelar", "Cancel")}
            </Button>
            <Button onClick={saveSchedule}>
              {tr("Guardar", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSchedule} onOpenChange={(open) => { if (!open) setDeleteSchedule(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("Eliminar Agendamento", "Delete Schedule")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tr("Tem a certeza que deseja eliminar o agendamento", "Are you sure you want to delete the schedule")} "{deleteSchedule?.name}"?
              {tr(" Esta ação não pode ser desfeita.", " This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("Cancelar", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              {tr("Eliminar", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
