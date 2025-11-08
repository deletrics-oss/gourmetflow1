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
import { UploadImageDialog } from "./UploadImageDialog";
import { ImagePlus } from "lucide-react";

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
  const [preparationTime, setPreparationTime] = useState("20");
  const [availableHours, setAvailableHours] = useState({
    start: "00:00",
    end: "23:59",
    days: [0, 1, 2, 3, 4, 5, 6]
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVariations, setShowVariations] = useState(false);
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);
  const [createdItemName, setCreatedItemName] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

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
          is_available: true,
          preparation_time: parseInt(preparationTime),
          available_hours: availableHours
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
      setPreparationTime("20");
      setAvailableHours({
        start: "00:00",
        end: "23:59",
        days: [0, 1, 2, 3, 4, 5, 6]
      });
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
            <Label htmlFor="item-image">Imagem do Item</Label>
            <div className="flex gap-2">
              <Input
                id="item-image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="URL ou Base64 da imagem"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadDialogOpen(true)}
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
            </div>
            {image && (
              <div className="mt-2 border rounded-lg p-2">
                <img src={image} alt="Preview" className="h-24 w-24 object-cover rounded" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="prep-time">Tempo de Preparo (minutos)</Label>
            <Input
              id="prep-time"
              type="number"
              min="1"
              value={preparationTime}
              onChange={(e) => setPreparationTime(e.target.value)}
              placeholder="20"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Horário de Disponibilidade</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAvailableHours({
                  start: "00:00",
                  end: "23:59",
                  days: [0, 1, 2, 3, 4, 5, 6]
                })}
              >
                Sempre Disponível
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Início</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={availableHours.start}
                  onChange={(e) => setAvailableHours({...availableHours, start: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">Fim</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={availableHours.end}
                  onChange={(e) => setAvailableHours({...availableHours, end: e.target.value})}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                <Button
                  key={index}
                  type="button"
                  size="sm"
                  variant={availableHours.days.includes(index) ? "default" : "outline"}
                  onClick={() => {
                    const newDays = availableHours.days.includes(index)
                      ? availableHours.days.filter(d => d !== index)
                      : [...availableHours.days, index];
                    setAvailableHours({...availableHours, days: newDays});
                  }}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Adicionando...' : 'Adicionar e Gerenciar Variações'}
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

    <UploadImageDialog
      open={uploadDialogOpen}
      onOpenChange={setUploadDialogOpen}
      onImageSelected={setImage}
    />
    </>
  );
}
