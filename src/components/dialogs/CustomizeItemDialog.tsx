import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Plus, ChefHat } from 'lucide-react';

interface ItemVariation {
  id: string;
  name: string;
  type: string;
  price_adjustment: number;
  is_required: boolean;
}

interface CustomizeItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  onAddToCart: (item: any, customizations: any[]) => void;
}

export function CustomizeItemDialog({ open, onOpenChange, item, onAddToCart }: CustomizeItemDialogProps) {
  const [variations, setVariations] = useState<ItemVariation[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && item) {
      loadVariations();
    }
  }, [open, item]);

  const loadVariations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('item_variations')
        .select('*')
        .eq('menu_item_id', item.id)
        .eq('is_active', true)
        .order('type');

      if (error) throw error;
      setVariations(data || []);
    } catch (error) {
      console.error('Erro ao carregar variações:', error);
      toast.error('Erro ao carregar opções');
    } finally {
      setLoading(false);
    }
  };

  const toggleVariation = (variationId: string) => {
    setSelectedVariations(prev =>
      prev.includes(variationId)
        ? prev.filter(id => id !== variationId)
        : [...prev, variationId]
    );
  };

  const getVariationsByType = (type: string) => {
    return variations.filter(v => v.type === type);
  };

  const calculateTotal = () => {
    const basePrice = item.promotional_price || item.price;
    const variationsPrice = variations
      .filter(v => selectedVariations.includes(v.id))
      .reduce((sum, v) => sum + v.price_adjustment, 0);
    return basePrice + variationsPrice;
  };

  const handleAddToCart = () => {
    const customizations = variations.filter(v => selectedVariations.includes(v.id));
    onAddToCart(item, customizations);
    setSelectedVariations([]);
    onOpenChange(false);
  };

  const typeLabels: Record<string, string> = {
    sauce: '🧂 Molhos',
    border: '🍕 Bordas',
    extra: '➕ Extras',
    size: '📏 Tamanho',
    custom: '⚙️ Personalização',
  };

  const uniqueTypes = [...new Set(variations.map(v => v.type))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Personalize seu {item?.name}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando opções...</div>
        ) : variations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Este item não possui opções de personalização
            </p>
            <Button onClick={() => {
              onAddToCart(item, []);
              onOpenChange(false);
            }}>
              Adicionar ao Carrinho
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {uniqueTypes.map(type => (
              <div key={type} className="space-y-3">
                <h3 className="font-semibold text-lg">{typeLabels[type] || type}</h3>
                <div className="space-y-2">
                  {getVariationsByType(type).map(variation => (
                    <div
                      key={variation.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={variation.id}
                          checked={selectedVariations.includes(variation.id)}
                          onCheckedChange={() => toggleVariation(variation.id)}
                        />
                        <Label htmlFor={variation.id} className="cursor-pointer flex-1">
                          <div className="flex items-center gap-2">
                            <span>{variation.name}</span>
                            {variation.is_required && (
                              <Badge variant="destructive" className="text-xs">
                                Obrigatório
                              </Badge>
                            )}
                          </div>
                        </Label>
                      </div>
                      {variation.price_adjustment > 0 && (
                        <span className="text-sm font-medium text-green-600">
                          + R$ {variation.price_adjustment.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">R$ {calculateTotal().toFixed(2)}</span>
              </div>

              <Button
                className="w-full h-12 gap-2"
                onClick={handleAddToCart}
              >
                <Plus className="h-5 w-5" />
                Adicionar ao Carrinho
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
