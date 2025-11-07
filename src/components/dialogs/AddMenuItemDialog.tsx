import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ManageVariationsDialog } from "./ManageVariationsDialog";

interface AddMenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMenuItemDialog({ open, onOpenChange }: AddMenuItemDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [promotionalPrice, setPromotionalPrice] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVariations, setShowVariations] = useState(false);
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);
  const [createdItemName, setCreatedItemName] = useState("");

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !price || !category) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          price: parseFloat(price),
          promotional_price: promotionalPrice ? parseFloat(promotionalPrice) : null,
          category_id: category,
          image_url: image.trim() || null,
          is_available: true
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Item adicionado! Deseja adicionar variações?");
      
      // Salvar ID e nome do item criado para gerenciar variações
      setCreatedItemId(data.id);
      setCreatedItemName(data.name);
      
      setName("");
      setDescription("");
      setPrice("");
      setPromotionalPrice("");
      setCategory("");
      setImage("");
      onOpenChange(false);
      
      // Abrir dialog de variações
      setShowVariations(true);
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast.error("Erro ao adicionar item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Item do Menu</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Nome *</Label>
              <Input
                id="item-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pizza Marguerita"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Selecione" />
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-description">Descrição</Label>
            <Textarea
              id="item-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do item"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-price">Preço Promocional</Label>
              <Input
                id="promo-price"
                type="number"
                step="0.01"
                value={promotionalPrice}
                onChange={(e) => setPromotionalPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-image">URL da Imagem</Label>
            <Input
              id="item-image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://exemplo.com/imagem.jpg"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {createdItemId && (
      <ManageVariationsDialog
        open={showVariations}
        onOpenChange={setShowVariations}
        menuItemId={createdItemId}
        menuItemName={createdItemName}
      />
    )}
    </>
  );
}
