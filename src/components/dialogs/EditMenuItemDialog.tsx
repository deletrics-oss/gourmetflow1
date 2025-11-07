import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ManageVariationsDialog } from "./ManageVariationsDialog";
import { Settings } from "lucide-react";

interface EditMenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  categories: any[];
  onSuccess: () => void;
}

export function EditMenuItemDialog({
  open,
  onOpenChange,
  item,
  categories,
  onSuccess
}: EditMenuItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [showVariations, setShowVariations] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    promotional_price: null as number | null,
    category_id: "",
    image_url: "",
    is_available: true
  });

  useEffect(() => {
    if (item && open) {
      setFormData({
        name: item.name || "",
        description: item.description || "",
        price: item.price || 0,
        promotional_price: item.promotional_price || null,
        category_id: item.category_id || "",
        image_url: item.image_url || "",
        is_available: item.is_available ?? true
      });
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.category_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('menu_items')
        .update(formData)
        .eq('id', item.id);

      if (error) throw error;

      toast.success("Item atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast.error("Erro ao atualizar item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Item *</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="promotional_price">Preço Promocional (R$)</Label>
              <Input
                id="promotional_price"
                type="number"
                step="0.01"
                value={formData.promotional_price || ""}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  promotional_price: e.target.value ? parseFloat(e.target.value) : null 
                })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select 
              value={formData.category_id} 
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">URL da Imagem</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_available"
              checked={formData.is_available}
              onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="is_available" className="cursor-pointer">
              Item disponível para venda
            </Label>
          </div>

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowVariations(true)}
              className="flex-1"
            >
              <Settings className="h-4 w-4 mr-2" />
              Gerenciar Variações
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {item && (
      <ManageVariationsDialog
        open={showVariations}
        onOpenChange={setShowVariations}
        menuItemId={item.id}
        menuItemName={item.name}
      />
    )}
    </>
  );
}
