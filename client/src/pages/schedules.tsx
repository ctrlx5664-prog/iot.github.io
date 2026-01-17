import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { getToken, apiUrl } from "@/lib/auth";
import type { Company, Location } from "@shared/schema";

// Mock schedules
const mockSchedules = [
  {
    id: "1",
    name: "Abertura Manhã",
    action: "turn_on",
    time: "08:00",
    days: ["mon", "tue", "wed", "thu", "fri"],
    store: "Loja Centro",
    location: "Todas",
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
    store: "Loja Centro",
    location: "Todas",
    target: "all_lights",
    brightness: 0,
    isActive: true,
    lastRun: "2026-01-16T22:00:00",
  },
  {
    id: "3",
    name: "Modo Vitrine Sábado",
    action: "set_brightness",
    time: "10:00",
    days: ["sat", "sun"],
    store: "Loja Norte",
    location: "Vitrine 1",
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
    days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    store: "Todas",
    location: "Todas",
    target: "all_lights",
    brightness: 50,
    isActive: false,
    lastRun: null,
  },
  {
    id: "5",
    name: "Fim de Semana - Fecho Cedo",
    action: "turn_off",
    time: "18:00",
    days: ["sun"],
    store: "Loja Sul",
    location: "Todas",
    target: "all_lights",
    brightness: 0,
    isActive: true,
    lastRun: "2026-01-12T18:00:00",
  },
];

const dayLabels = {
  mon: { pt: "Seg", en: "Mon" },
  tue: { pt: "Ter", en: "Tue" },
  wed: { pt: "Qua", en: "Wed" },
  thu: { pt: "Qui", en: "Thu" },
  fri: { pt: "Sex", en: "Fri" },
  sat: { pt: "Sáb", en: "Sat" },
  sun: { pt: "Dom", en: "Sun" },
};

export default function Schedules() {
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterStore, setFilterStore] = useState("all");
  const [filterActive, setFilterActive] = useState("all");

  const token = getToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch companies (stores)
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/companies"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch locations
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/locations"), { headers });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filteredSchedules = mockSchedules.filter((schedule) => {
    if (filterStore !== "all" && schedule.store !== filterStore && schedule.store !== "Todas") return false;
    if (filterActive === "active" && !schedule.isActive) return false;
    if (filterActive === "inactive" && schedule.isActive) return false;
    return true;
  });

  const stats = {
    total: mockSchedules.length,
    active: mockSchedules.filter((s) => s.isActive).length,
    inactive: mockSchedules.filter((s) => !s.isActive).length,
  };

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
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {tr("Novo Agendamento", "New Schedule")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{tr("Criar Agendamento", "Create Schedule")}</DialogTitle>
              <DialogDescription>
                {tr("Configure um novo agendamento automático", "Configure a new automatic schedule")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{tr("Nome", "Name")}</Label>
                <Input placeholder={tr("Ex: Abertura Manhã", "Ex: Morning Opening")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tr("Hora", "Time")}</Label>
                  <Input type="time" defaultValue="08:00" />
                </div>
                <div className="space-y-2">
                  <Label>{tr("Ação", "Action")}</Label>
                  <Select defaultValue="turn_on">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="turn_on">{tr("Ligar", "Turn On")}</SelectItem>
                      <SelectItem value="turn_off">{tr("Desligar", "Turn Off")}</SelectItem>
                      <SelectItem value="set_brightness">{tr("Definir Brilho", "Set Brightness")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{tr("Dias da Semana", "Days of Week")}</Label>
                <div className="flex gap-2">
                  {Object.entries(dayLabels).map(([key, label]) => (
                    <Button key={key} variant="outline" size="sm" className="w-10 h-10 p-0">
                      {tr(label.pt, label.en)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{tr("Loja", "Store")}</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={tr("Selecionar", "Select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tr("Todas", "All")}</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{tr("Espaço", "Space")}</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={tr("Selecionar", "Select")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{tr("Todos", "All")}</SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                {tr("Cancelar", "Cancel")}
              </Button>
              <Button onClick={() => setIsCreateOpen(false)}>
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
          <div className="flex flex-wrap gap-4 items-center">
            <div className="space-y-2 min-w-[200px]">
              <Label>{tr("Loja", "Store")}</Label>
              <Select value={filterStore} onValueChange={setFilterStore}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr("Todas", "All")}</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.name}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-[150px]">
              <Label>{tr("Estado", "Status")}</Label>
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
                <TableHead>{tr("Loja", "Store")}</TableHead>
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
                      <div className="flex items-center gap-1">
                        <Store className="w-4 h-4 text-muted-foreground" />
                        {schedule.store}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={schedule.isActive} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500">
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
    </div>
  );
}
