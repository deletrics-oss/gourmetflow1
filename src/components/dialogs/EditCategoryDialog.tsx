import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { UploadImageDialog } from "./UploadImageDialog";

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: any;
  onSuccess: () => void;
}

export function EditCategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess
}: EditCategoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    if (category && open) {
      setFormData({
        name: category.name || "",
        description: category.description || "",
        image_url: category.image_url || "",
        is_active: category.is_active ?? true,
        sort_order: category.sort_order || 0
      });
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update(formData)
        .eq('id', category.id);

      if (error) throw error;

      toast.success("Categoria atualizada com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      toast.error("Erro ao atualizar categoria");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Categoria</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">URL da Imagem</Label>
            <div className="flex gap-2">
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setUploadDialogOpen(true)}
              >
                Upload
              </Button>
            </div>
            {formData.image_url && (
              <div className="mt-2 border rounded-lg overflow-hidden">
                <img 
                  src={formData.image_url} 
                  alt="Preview" 
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23ddd" width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">Erro ao carregar</text></svg>';
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort_order">Ordem de Exibição</Label>
            <Input
              id="sort_order"
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Categoria ativa
            </Label>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>

        <UploadImageDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onImageSelected={(url) => {
            setFormData({ ...formData, image_url: url });
            setUploadDialogOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
