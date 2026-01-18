import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Play,
  Plus,
  Edit,
  Trash2,
  Clock,
  Film,
  Monitor,
  Pause,
  List,
  Copy,
  Search,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// Mock playlists
const mockPlaylists = [
  {
    id: "1",
    name: "Main Playlist",
    itemCount: 8,
    duration: "04:30",
    screens: 12,
    status: "active",
    createdAt: "2026-01-10",
    loop: true,
  },
  {
    id: "2",
    name: "January Promotions",
    itemCount: 5,
    duration: "02:15",
    screens: 8,
    status: "active",
    createdAt: "2026-01-05",
    loop: true,
  },
  {
    id: "3",
    name: "Special Showcase",
    itemCount: 3,
    duration: "01:30",
    screens: 4,
    status: "active",
    createdAt: "2026-01-08",
    loop: true,
  },
  {
    id: "4",
    name: "Holiday Campaign (Archived)",
    itemCount: 10,
    duration: "05:00",
    screens: 0,
    status: "inactive",
    createdAt: "2025-12-01",
    loop: false,
  },
  {
    id: "5",
    name: "New Store Demo",
    itemCount: 4,
    duration: "02:00",
    screens: 2,
    status: "draft",
    createdAt: "2026-01-15",
    loop: true,
  },
];

export default function MediaPlaylists() {
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPlaylists = mockPlaylists.filter((playlist) => {
    if (searchTerm && !playlist.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: mockPlaylists.length,
    active: mockPlaylists.filter((p) => p.status === "active").length,
    screens: mockPlaylists.reduce((acc, p) => acc + p.screens, 0),
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: { pt: string; en: string } } = {
      active: { pt: "Ativa", en: "Active" },
      inactive: { pt: "Inativa", en: "Inactive" },
      draft: { pt: "Rascunho", en: "Draft" },
    };
    return tr(labels[status]?.pt || status, labels[status]?.en || status);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "draft":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {tr("Playlists", "Playlists")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr("Gestão de sequências de conteúdo para os ecrãs", "Management of content sequences for screens")}
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {tr("Nova Playlist", "New Playlist")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tr("Criar Playlist", "Create Playlist")}</DialogTitle>
              <DialogDescription>
                {tr("Crie uma nova sequência de conteúdo", "Create a new content sequence")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{tr("Nome", "Name")}</Label>
                <Input placeholder={tr("Ex: Playlist Principal", "Ex: Main Playlist")} />
              </div>
              <div className="space-y-2">
                <Label>{tr("Descrição", "Description")}</Label>
                <Input placeholder={tr("Opcional...", "Optional...")} />
              </div>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Film className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {tr("Adicione conteúdos após criar a playlist", "Add content after creating the playlist")}
                </p>
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
                <p className="text-sm text-muted-foreground">{tr("Total Playlists", "Total Playlists")}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <List className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Ativas", "Active")}</p>
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
                <p className="text-sm text-muted-foreground">{tr("Ecrãs Usando", "Screens Using")}</p>
                <p className="text-2xl font-bold text-blue-500">{stats.screens}</p>
              </div>
              <Monitor className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={tr("Pesquisar playlists...", "Search playlists...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Playlists Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            {tr("Lista de Playlists", "Playlist List")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tr("Nome", "Name")}</TableHead>
                <TableHead>{tr("Itens", "Items")}</TableHead>
                <TableHead>{tr("Duração", "Duration")}</TableHead>
                <TableHead>{tr("Ecrãs", "Screens")}</TableHead>
                <TableHead>{tr("Estado", "Status")}</TableHead>
                <TableHead className="text-right">{tr("Ações", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlaylists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {tr("Nenhuma playlist encontrada", "No playlists found")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlaylists.map((playlist) => (
                  <TableRow key={playlist.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Play className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{playlist.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tr("Criada em", "Created on")} {playlist.createdAt}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Film className="w-4 h-4 text-muted-foreground" />
                        {playlist.itemCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {playlist.duration}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Monitor className="w-4 h-4 text-muted-foreground" />
                        {playlist.screens}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(playlist.status) as any}>
                        {getStatusLabel(playlist.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon">
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Copy className="w-4 h-4" />
                        </Button>
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
