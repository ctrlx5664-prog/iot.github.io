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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Film,
  Image,
  Upload,
  Search,
  Trash2,
  Edit,
  Play,
  Clock,
  FileVideo,
  FileImage,
  Folder,
  Grid,
  List,
  Download,
  Eye,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// Mock media content
const mockContent = [
  { id: "1", name: "Promo Verão 2026.mp4", type: "video", size: "45.2 MB", duration: "00:30", uploadedAt: "2026-01-15", usedIn: 3 },
  { id: "2", name: "Logo Animado.mp4", type: "video", size: "12.8 MB", duration: "00:05", uploadedAt: "2026-01-14", usedIn: 8 },
  { id: "3", name: "Banner Principal.png", type: "image", size: "2.4 MB", duration: null, uploadedAt: "2026-01-13", usedIn: 5 },
  { id: "4", name: "Campanha Natal.mp4", type: "video", size: "78.5 MB", duration: "01:00", uploadedAt: "2025-12-20", usedIn: 2 },
  { id: "5", name: "Slideshow Produtos.mp4", type: "video", size: "34.1 MB", duration: "00:45", uploadedAt: "2026-01-10", usedIn: 4 },
  { id: "6", name: "Fundo Vitrine.jpg", type: "image", size: "1.8 MB", duration: null, uploadedAt: "2026-01-08", usedIn: 6 },
  { id: "7", name: "Anúncio Flash Sale.mp4", type: "video", size: "22.3 MB", duration: "00:15", uploadedAt: "2026-01-05", usedIn: 1 },
  { id: "8", name: "QR Code Loja.png", type: "image", size: "0.5 MB", duration: null, uploadedAt: "2026-01-02", usedIn: 12 },
];

export default function MediaContent() {
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredContent = mockContent.filter((content) => {
    if (filterType !== "all" && content.type !== filterType) return false;
    if (searchTerm && !content.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: mockContent.length,
    videos: mockContent.filter((c) => c.type === "video").length,
    images: mockContent.filter((c) => c.type === "image").length,
    totalSize: mockContent.reduce((acc, c) => acc + parseFloat(c.size), 0).toFixed(1),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {tr("Biblioteca de Conteúdos", "Content Library")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tr("Gestão de vídeos e imagens para os ecrãs", "Management of videos and images for screens")}
          </p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              {tr("Carregar Ficheiro", "Upload File")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tr("Carregar Conteúdo", "Upload Content")}</DialogTitle>
              <DialogDescription>
                {tr("Adicione vídeos ou imagens à biblioteca", "Add videos or images to the library")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  {tr("Arraste ficheiros para aqui ou", "Drag files here or")}
                </p>
                <Button variant="outline" size="sm">
                  {tr("Escolher Ficheiro", "Choose File")}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {tr("MP4, MOV, PNG, JPG até 100MB", "MP4, MOV, PNG, JPG up to 100MB")}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{tr("Pasta", "Folder")}</Label>
                <Select defaultValue="root">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">{tr("Raiz", "Root")}</SelectItem>
                    <SelectItem value="promos">{tr("Promoções", "Promotions")}</SelectItem>
                    <SelectItem value="logos">{tr("Logos", "Logos")}</SelectItem>
                    <SelectItem value="backgrounds">{tr("Fundos", "Backgrounds")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                {tr("Cancelar", "Cancel")}
              </Button>
              <Button onClick={() => setIsUploadOpen(false)}>
                {tr("Carregar", "Upload")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Total Ficheiros", "Total Files")}</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Folder className="w-8 h-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Vídeos", "Videos")}</p>
                <p className="text-2xl font-bold text-blue-500">{stats.videos}</p>
              </div>
              <FileVideo className="w-8 h-8 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Imagens", "Images")}</p>
                <p className="text-2xl font-bold text-green-500">{stats.images}</p>
              </div>
              <FileImage className="w-8 h-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{tr("Espaço Usado", "Used Space")}</p>
                <p className="text-2xl font-bold">{stats.totalSize} MB</p>
              </div>
              <Download className="w-8 h-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={tr("Pesquisar ficheiros...", "Search files...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("all")}
                >
                  {tr("Todos", "All")}
                </Button>
                <Button
                  variant={filterType === "video" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("video")}
                >
                  <FileVideo className="w-4 h-4 mr-1" />
                  {tr("Vídeos", "Videos")}
                </Button>
                <Button
                  variant={filterType === "image" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType("image")}
                >
                  <FileImage className="w-4 h-4 mr-1" />
                  {tr("Imagens", "Images")}
                </Button>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid/List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            {tr("Ficheiros", "Files")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filteredContent.map((content) => (
                <Card key={content.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted flex items-center justify-center relative">
                    {content.type === "video" ? (
                      <>
                        <FileVideo className="w-12 h-12 text-muted-foreground" />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                          {content.duration}
                        </div>
                      </>
                    ) : (
                      <FileImage className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm truncate">{content.name}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{content.size}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {content.usedIn} {tr("usos", "uses")}
                      </Badge>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContent.map((content) => (
                <div key={content.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50">
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    {content.type === "video" ? (
                      <FileVideo className="w-6 h-6 text-blue-500" />
                    ) : (
                      <FileImage className="w-6 h-6 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{content.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {content.size} • {content.duration || tr("Imagem", "Image")} • {content.uploadedAt}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {content.usedIn} {tr("usos", "uses")}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {filteredContent.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {tr("Nenhum ficheiro encontrado", "No files found")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
