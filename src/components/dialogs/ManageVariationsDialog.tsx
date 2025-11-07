import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ManageVariationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItemId: string;
  menuItemName: string;
}

export function ManageVariationsDialog({
  open,
  onOpenChange,
  menuItemId,
  menuItemName
}: ManageVariationsDialogProps) {
  const [variations, setVariations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newVariation, setNewVariation] = useState({
    name: '',
    type: 'size',
    price_adjustment: 0,
    is_required: false
  });

  useEffect(() => {
    if (open && menuItemId) {
      loadVariations();
    }
  }, [open, menuItemId]);

  const loadVariations = async () => {
    try {
      const { data, error } = await supabase
        .from('item_variations')
        .select('*')
        .eq('menu_item_id', menuItemId)
        .order('type');

      if (error) throw error;
      setVariations(data || []);
    } catch (error) {
      console.error('Erro ao carregar variações:', error);
    }
  };

  const handleAddVariation = async () => {
    if (!newVariation.name) {
      toast.error('Preencha o nome da variação');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('item_variations')
        .insert({
          menu_item_id: menuItemId,
          ...newVariation
        });

      if (error) throw error;

      toast.success('Variação adicionada!');
      setNewVariation({
        name: '',
        type: 'size',
        price_adjustment: 0,
        is_required: false
      });
      loadVariations();
    } catch (error) {
      console.error('Erro ao adicionar variação:', error);
      toast.error('Erro ao adicionar variação');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVariation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('item_variations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Variação removida!');
      loadVariations();
    } catch (error) {
      console.error('Erro ao remover variação:', error);
      toast.error('Erro ao remover variação');
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      size: 'Tamanho',
      sauce: 'Molho',
      border: 'Borda',
      extra: 'Adicional',
      drink: 'Bebida'
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Variações: {menuItemName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Form para adicionar nova variação */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">Adicionar Nova Variação</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newVariation.type}
                  onValueChange={(value) => setNewVariation({ ...newVariation, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="size">Tamanho</SelectItem>
                    <SelectItem value="sauce">Molho</SelectItem>
                    <SelectItem value="border">Borda</SelectItem>
                    <SelectItem value="extra">Adicional</SelectItem>
                    <SelectItem value="drink">Bebida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome da Variação</Label>
                <Input
                  value={newVariation.name}
                  onChange={(e) => setNewVariation({ ...newVariation, name: e.target.value })}
                  placeholder="Ex: Grande, Catupiry, Coca-Cola"
                />
              </div>

              <div className="space-y-2">
                <Label>Ajuste de Preço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newVariation.price_adjustment}
                  onChange={(e) => setNewVariation({ 
                    ...newVariation, 
                    price_adjustment: parseFloat(e.target.value) || 0 
                  })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2 flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newVariation.is_required}
                    onChange={(e) => setNewVariation({ 
                      ...newVariation, 
                      is_required: e.target.checked 
                    })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Obrigatório</span>
                </label>
              </div>
            </div>

            <Button onClick={handleAddVariation} disabled={loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Variação
            </Button>
          </div>

          {/* Lista de variações existentes */}
          <div className="space-y-4">
            <h3 className="font-semibold">Variações Cadastradas</h3>
            
            {variations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma variação cadastrada ainda
              </p>
            ) : (
              <div className="space-y-2">
                {variations.map((variation) => (
                  <div
                    key={variation.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Badge variant="outline">{getTypeLabel(variation.type)}</Badge>
                      <span className="font-medium">{variation.name}</span>
                      {variation.price_adjustment !== 0 && (
                        <span className="text-sm text-muted-foreground">
                          {variation.price_adjustment > 0 ? '+' : ''}
                          R$ {variation.price_adjustment.toFixed(2)}
                        </span>
                      )}
                      {variation.is_required && (
                        <Badge variant="secondary">Obrigatório</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteVariation(variation.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
