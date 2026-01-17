import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Play, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Video } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";

export default function Videos() {
  const { toast } = useToast();
  const { language } = useTranslation();
  const tr = (pt: string, en: string) => (language === "pt" ? pt : en);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: videos = [] } = useQuery<Video[]>({
    queryKey: ['/api/videos'],
  });

  const createVideoMutation = useMutation({
    mutationFn: async (data: { name: string; url: string; duration?: number }) => {
      return await apiRequest<Video>('POST', '/api/videos', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      setIsDialogOpen(false);
      setIsUploading(false);
      toast({
        title: tr("Sucesso", "Success"),
        description: tr("Vídeo adicionado com sucesso", "Video added successfully"),
      });
    },
    onError: () => {
      setIsUploading(false);
      toast({
        title: tr("Erro", "Error"),
        description: tr("Falha ao adicionar vídeo", "Failed to add video"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsUploading(true);

    const durationStr = formData.get('duration') as string;
    const duration = durationStr ? parseInt(durationStr, 10) : undefined;

    createVideoMutation.mutate({
      name: formData.get('name') as string,
      url: formData.get('url') as string,
      duration,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
            {tr("Biblioteca de Vídeos", "Video Library")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tr("Gerir vídeos para as suas TVs", "Manage videos for your TV displays")}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-video">
              <Upload className="w-4 h-4 mr-2" />
              {tr("Adicionar Vídeo", "Add Video")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tr("Adicionar Vídeo", "Add Video")}</DialogTitle>
              <DialogDescription>
                {tr("Adicione um vídeo à biblioteca para usar nas TVs", "Add a video to your library for use on TV displays")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="video-name">{tr("Nome do Vídeo *", "Video Name *")}</Label>
                <Input
                  id="video-name"
                  name="name"
                  placeholder={tr("ex: Mensagem de Boas-Vindas", "e.g., Welcome Message")}
                  required
                  data-testid="input-video-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="video-url">{tr("URL do Vídeo *", "Video URL *")}</Label>
                <Input
                  id="video-url"
                  name="url"
                  type="url"
                  placeholder="https://example.com/video.mp4"
                  required
                  data-testid="input-video-url"
                />
                <p className="text-xs text-muted-foreground">
                  {tr("Link direto para o ficheiro de vídeo (MP4, WebM, etc.)", "Direct link to video file (MP4, WebM, etc.)")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="video-duration">{tr("Duração (segundos)", "Duration (seconds)")}</Label>
                <Input
                  id="video-duration"
                  name="duration"
                  type="number"
                  min="1"
                  placeholder={tr("ex: 60", "e.g., 60")}
                  data-testid="input-video-duration"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isUploading}
                >
                  {tr("Cancelar", "Cancel")}
                </Button>
                <Button type="submit" disabled={isUploading} data-testid="button-submit-video">
                  {isUploading ? tr("A adicionar...", "Adding...") : tr("Adicionar Vídeo", "Add Video")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{tr("Ainda sem vídeos", "No videos yet")}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {tr("Adicione o seu primeiro vídeo para começar a mostrar conteúdo nas TVs", "Add your first video to start displaying content on TVs")}
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-video">
              <Upload className="w-4 h-4 mr-2" />
              {tr("Adicionar Vídeo", "Add Video")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <Card key={video.id} data-testid={`card-video-${video.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-medium truncate">
                      {video.name}
                    </CardTitle>
                    <CardDescription className="mt-1 truncate text-xs">
                      {video.url}
                    </CardDescription>
                  </div>
                  <Play className="w-5 h-5 text-primary flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {video.duration && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {tr("Adicionado", "Added")} {new Date(video.uploadedAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
