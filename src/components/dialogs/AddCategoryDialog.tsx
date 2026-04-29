import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/lib/supabase";
import { UploadImageDialog } from "./UploadImageDialog";
import { toast } from "sonner";

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddCategoryDialog({ open, onOpenChange, onSuccess }: AddCategoryDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { restaurantId } = useRestaurant();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    if (!restaurantId) {
      toast.error("Restaurante não identificado. Faça login novamente.");
      return;
    }

    setLoading(true);
    try {
      console.log('[AddCategory] Inserindo categoria:', { name: name.trim(), restaurantId });
      
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          image_url: image.trim() || null,
          restaurant_id: restaurantId,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('[AddCategory] Erro Supabase:', error);
        throw error;
      }

      console.log('[AddCategory] Categoria criada com sucesso:', data);
      toast.success("Categoria adicionada com sucesso!");

      setName("");
      setDescription("");
      setImage("");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Erro ao adicionar categoria:", error);
      toast.error(`Erro ao salvar: ${error.message || 'Falha no banco de dados'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pizzas"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da categoria"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image">URL da Imagem</Label>
            <div className="flex gap-2">
              <Input
                id="image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setUploadDialogOpen(true)}
              >
                Upload
              </Button>
            </div>
            {image && (
              <div className="mt-2 border rounded-lg overflow-hidden">
                <img 
                  src={image} 
                  alt="Preview" 
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23ddd" width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">Erro ao carregar</text></svg>';
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>

        <UploadImageDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onImageSelected={(url) => {
            setImage(url);
            setUploadDialogOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
