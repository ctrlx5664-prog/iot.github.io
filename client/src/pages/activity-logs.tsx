import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History,
  Search,
  Filter,
  Lightbulb,
  Power,
  Calendar,
  User,
  Clock,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Sun,
  Palette,
  Timer,
  UserPlus,
  Mail,
  Trash2,
  Edit,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type ActivityLog = {
  id: string;
  userId: string;
  username: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  details: string;
  ipAddress: string;
  createdAt: string;
};

// Generate mock activity logs
function generateMockLogs(): ActivityLog[] {
  const users = [
    { id: "1", username: "admin" },
    { id: "2", username: "joao.silva" },
    { id: "3", username: "maria.santos" },
    { id: "4", username: "pedro.costa" },
  ];

  const actions = [
    { action: "light_on", entityType: "light", details: '{"brightness": 100}' },
    { action: "light_off", entityType: "light", details: '{}' },
    { action: "brightness_changed", entityType: "light", details: '{"from": 50, "to": 80}' },
    { action: "color_changed", entityType: "light", details: '{"from": "#ffffff", "to": "#ffd700"}' },
    { action: "schedule_created", entityType: "schedule", details: '{"time": "08:00", "action": "turn_on"}' },
    { action: "schedule_deleted", entityType: "schedule", details: '{}' },
    { action: "user_created", entityType: "user", details: '{"role": "member"}' },
    { action: "user_invited", entityType: "invite", details: '{"role": "member"}' },
  ];

  const lights = [
    { id: "l1", name: "Backlight" },
    { id: "l2", name: "Shelves" },
    { id: "l3", name: "Sides light" },
    { id: "l4", name: "Main Display" },
    { id: "l5", name: "Entrance" },
  ];

  const logs: ActivityLog[] = [];
  const now = new Date();

  for (let i = 0; i < 50; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const light = lights[Math.floor(Math.random() * lights.length)];
    
    const createdAt = new Date(now);
    createdAt.setMinutes(createdAt.getMinutes() - i * Math.floor(Math.random() * 30 + 5));

    logs.push({
      id: `log-${i}`,
      userId: user.id,
      username: user.username,
      action: action.action,
      entityType: action.entityType,
      entityId: action.entityType === "light" ? light.id : `entity-${i}`,
      entityName: action.entityType === "light" ? light.name : 
                  action.entityType === "schedule" ? `Schedule ${i}` :
                  action.entityType === "user" ? `new_user_${i}` :
                  `Invite #${i}`,
      details: action.details,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      createdAt: createdAt.toISOString(),
    });
  }

  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

const actionIcons: { [key: string]: React.ReactNode } = {
  light_on: <Power className="w-4 h-4 text-green-500" />,
  light_off: <Power className="w-4 h-4 text-red-500" />,
  brightness_changed: <Sun className="w-4 h-4 text-yellow-500" />,
  color_changed: <Palette className="w-4 h-4 text-purple-500" />,
  schedule_created: <Timer className="w-4 h-4 text-blue-500" />,
  schedule_deleted: <Trash2 className="w-4 h-4 text-red-500" />,
  user_created: <UserPlus className="w-4 h-4 text-green-500" />,
  user_invited: <Mail className="w-4 h-4 text-blue-500" />,
};

const actionLabels: { [key: string]: { pt: string; en: string } } = {
  light_on: { pt: "Luz ligada", en: "Light turned on" },
  light_off: { pt: "Luz desligada", en: "Light turned off" },
  brightness_changed: { pt: "Brilho alterado", en: "Brightness changed" },
  color_changed: { pt: "Cor alterada", en: "Color changed" },
  schedule_created: { pt: "Agendamento criado", en: "Schedule created" },
  schedule_deleted: { pt: "Agendamento eliminado", en: "Schedule deleted" },
  user_created: { pt: "Utilizador criado", en: "User created" },
  user_invited: { pt: "Utilizador convidado", en: "User invited" },
};

const entityTypeLabels: { [key: string]: { pt: string; en: string } } = {
  light: { pt: "Luz", en: "Light" },
  schedule: { pt: "Agendamento", en: "Schedule" },
  user: { pt: "Utilizador", en: "User" },
  invite: { pt: "Convite", en: "Invite" },
};

export default function ActivityLogsPage() {
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  // Mock logs data
  const allLogs = useMemo(() => generateMockLogs(), []);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return allLogs.filter(log => {
      const matchesSearch = searchQuery === "" ||
        log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entityName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const matchesEntity = entityFilter === "all" || log.entityType === entityFilter;
      
      return matchesSearch && matchesAction && matchesEntity;
    });
  }, [allLogs, searchQuery, actionFilter, entityFilter]);

  // Paginate
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return language === "pt" ? "Agora mesmo" : "Just now";
    } else if (diffMins < 60) {
      return language === "pt" ? `${diffMins} min atrás` : `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return language === "pt" ? `${diffHours}h atrás` : `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return language === "pt" ? "Ontem" : "Yesterday";
    } else if (diffDays < 7) {
      return language === "pt" ? `${diffDays} dias atrás` : `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString(language === "pt" ? "pt-PT" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString(language === "pt" ? "pt-PT" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseDetails = (details: string) => {
    try {
      return JSON.parse(details);
    } catch {
      return {};
    }
  };

  // Stats
  const todayLogs = allLogs.filter(log => {
    const logDate = new Date(log.createdAt);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  const lightActions = allLogs.filter(log => log.entityType === "light").length;
  const scheduleActions = allLogs.filter(log => log.entityType === "schedule").length;
  const userActions = allLogs.filter(log => log.entityType === "user" || log.entityType === "invite").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("logs.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("logs.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            {language === "pt" ? "Exportar" : "Export"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "pt" ? "Ações Hoje" : "Actions Today"}
                </p>
                <p className="text-2xl font-bold">{todayLogs.length}</p>
              </div>
              <History className="w-8 h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "pt" ? "Luzes" : "Lights"}
                </p>
                <p className="text-2xl font-bold">{lightActions}</p>
              </div>
              <Lightbulb className="w-8 h-8 text-yellow-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "pt" ? "Agendamentos" : "Schedules"}
                </p>
                <p className="text-2xl font-bold">{scheduleActions}</p>
              </div>
              <Timer className="w-8 h-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "pt" ? "Utilizadores" : "Users"}
                </p>
                <p className="text-2xl font-bold">{userActions}</p>
              </div>
              <User className="w-8 h-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={language === "pt" ? "Pesquisar por utilizador ou entidade..." : "Search by user or entity..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t("logs.filterByAction")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === "pt" ? "Todas as ações" : "All actions"}</SelectItem>
                <SelectItem value="light_on">{actionLabels.light_on[language]}</SelectItem>
                <SelectItem value="light_off">{actionLabels.light_off[language]}</SelectItem>
                <SelectItem value="brightness_changed">{actionLabels.brightness_changed[language]}</SelectItem>
                <SelectItem value="color_changed">{actionLabels.color_changed[language]}</SelectItem>
                <SelectItem value="schedule_created">{actionLabels.schedule_created[language]}</SelectItem>
                <SelectItem value="schedule_deleted">{actionLabels.schedule_deleted[language]}</SelectItem>
                <SelectItem value="user_created">{actionLabels.user_created[language]}</SelectItem>
                <SelectItem value="user_invited">{actionLabels.user_invited[language]}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={language === "pt" ? "Tipo de entidade" : "Entity type"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === "pt" ? "Todas" : "All"}</SelectItem>
                <SelectItem value="light">{entityTypeLabels.light[language]}</SelectItem>
                <SelectItem value="schedule">{entityTypeLabels.schedule[language]}</SelectItem>
                <SelectItem value="user">{entityTypeLabels.user[language]}</SelectItem>
                <SelectItem value="invite">{entityTypeLabels.invite[language]}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">{t("logs.timestamp")}</TableHead>
                <TableHead>{t("logs.user")}</TableHead>
                <TableHead>{t("logs.action")}</TableHead>
                <TableHead>{t("logs.entity")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("logs.details")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t("logs.noLogs")}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => {
                  const details = parseDetails(log.details);
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{formatDate(log.createdAt)}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(log.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold uppercase">
                            {log.username.charAt(0)}
                          </div>
                          <span className="font-medium">{log.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {actionIcons[log.action]}
                          <span>{actionLabels[log.action]?.[language] || log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {entityTypeLabels[log.entityType]?.[language] || log.entityType}
                          </Badge>
                          <span className="text-sm">{log.entityName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="text-xs text-muted-foreground">
                          {log.action === "brightness_changed" && details.from !== undefined && (
                            <span>{details.from}% → {details.to}%</span>
                          )}
                          {log.action === "color_changed" && details.from && (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: details.from }}
                              />
                              <span>→</span>
                              <div
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: details.to }}
                              />
                            </div>
                          )}
                          {log.action === "schedule_created" && details.time && (
                            <span>{details.time} - {details.action}</span>
                          )}
                          {log.action === "user_created" && details.role && (
                            <Badge variant="secondary" className="text-xs">{details.role}</Badge>
                          )}
                          {log.action === "user_invited" && details.role && (
                            <Badge variant="secondary" className="text-xs">{details.role}</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {language === "pt" 
              ? `A mostrar ${(page - 1) * itemsPerPage + 1}-${Math.min(page * itemsPerPage, filteredLogs.length)} de ${filteredLogs.length}`
              : `Showing ${(page - 1) * itemsPerPage + 1}-${Math.min(page * itemsPerPage, filteredLogs.length)} of ${filteredLogs.length}`
            }
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
