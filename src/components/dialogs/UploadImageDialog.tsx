import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Link as LinkIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";

interface UploadImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageSelected: (url: string) => void;
}

export function UploadImageDialog({ open, onOpenChange, onImageSelected }: UploadImageDialogProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUrlSubmit = () => {
    if (!imageUrl.trim()) {
      toast.error("Insira uma URL válida");
      return;
    }
    onImageSelected(imageUrl);
    setImageUrl("");
    onOpenChange(false);
    toast.success("Imagem adicionada!");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error("Selecione apenas arquivos de imagem");
      return;
    }

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      // Upload para Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);

      onImageSelected(publicUrl);
      setImageUrl("");
      onOpenChange(false);
      toast.success("Imagem carregada com sucesso!");
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error(error.message || "Erro ao fazer upload da imagem");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Imagem</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="url" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url">URL da Imagem</TabsTrigger>
            <TabsTrigger value="upload">Upload de Arquivo</TabsTrigger>
          </TabsList>
          
          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">URL da Imagem</Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              {imageUrl && (
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <img 
                    src={imageUrl} 
                    alt="Preview" 
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23ddd" width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">Erro ao carregar</text></svg>';
                    }}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUrlSubmit} className="gap-2">
                <LinkIcon className="h-4 w-4" />
                Adicionar
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="image-file">Selecione uma Imagem</Label>
              <Input
                id="image-file"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: JPG, PNG, GIF, WEBP (máx. 5MB)
              </p>
            </div>
            {uploading && (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
