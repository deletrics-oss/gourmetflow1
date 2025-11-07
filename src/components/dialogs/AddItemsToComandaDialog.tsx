import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus, ShoppingCart, Gift } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface AddItemsToComandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  onSuccess: () => void;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export function AddItemsToComandaDialog({
  open,
  onOpenChange,
  orderId,
  onSuccess
}: AddItemsToComandaDialogProps) {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  useEffect(() => {
    if (open) {
      loadMenuItems();
    }
  }, [open]);

  const loadMenuItems = async () => {
    try {
      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('name');

      if (itemsError) throw itemsError;
      setMenuItems(items || []);

      const { data: cats, error: catsError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (catsError) throw catsError;
      setCategories(cats || []);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      toast.error('Erro ao carregar itens do menu');
    }
  };

  const addToCart = async (item: any) => {
    // Check if item has variations
    const { data: variations } = await supabase
      .from('item_variations')
      .select('*')
      .eq('menu_item_id', item.id)
      .eq('is_active', true);

    if (variations && variations.length > 0) {
      toast.info('Este item possui variações. Funcionalidade em desenvolvimento.');
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { 
        id: item.id, 
        name: item.name, 
        price: item.promotional_price || item.price, 
        quantity: 1 
      }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const handleAddItems = async () => {
    if (cart.length === 0) {
      toast.error('Adicione itens ao carrinho');
      return;
    }

    setLoading(true);
    try {
      // Insert new order items
      const orderItems = cart.map(item => ({
        order_id: orderId,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update order total
      const { data: existingItems } = await supabase
        .from('order_items')
        .select('total_price')
        .eq('order_id', orderId);

      const newTotal = (existingItems || []).reduce((sum: number, item: any) => sum + item.total_price, 0);

      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          total: newTotal,
          subtotal: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      toast.success('Itens adicionados com sucesso!');
      setCart([]);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao adicionar itens:', error);
      toast.error('Erro ao adicionar itens');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const applyCoupon = async () => {
    if (!couponCode) return;

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        toast.error('Cupom inválido ou expirado');
        return;
      }

      if (data.current_uses >= data.max_uses) {
        toast.error('Cupom esgotado');
        return;
      }

      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      
      if (subtotal < data.min_order_value) {
        toast.error(`Pedido mínimo de R$ ${data.min_order_value.toFixed(2)}`);
        return;
      }

      setAppliedCoupon(data);
      toast.success('Cupom aplicado!');
    } catch (error) {
      console.error('Erro ao aplicar cupom:', error);
      toast.error('Erro ao aplicar cupom');
    }
  };

  const subtotalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  const couponDiscount = appliedCoupon 
    ? appliedCoupon.type === 'percentage' 
      ? (subtotalAmount * appliedCoupon.discount_value) / 100
      : appliedCoupon.discount_value
    : 0;

  const totalAmount = subtotalAmount - couponDiscount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Adicionar Itens à Comanda</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 h-[70vh]">
          {/* Menu Items */}
          <div className="flex-1 overflow-auto">
            <Input
              placeholder="Buscar item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-4">
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                {categories.map(cat => (
                  <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="grid gap-3 md:grid-cols-2">
              {filteredItems.map((item) => (
                <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{item.name}</h4>
                      {item.promotional_price ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-green-600">
                            R$ {item.promotional_price.toFixed(2)}
                          </span>
                          <span className="text-sm text-muted-foreground line-through">
                            R$ {item.price.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold">R$ {item.price.toFixed(2)}</span>
                      )}
                    </div>
                    <Button size="sm" onClick={() => addToCart(item)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="w-80 border-l pl-6 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5" />
              <h3 className="font-semibold">Carrinho</h3>
            </div>

            <div className="flex-1 overflow-auto space-y-2">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Nenhum item adicionado
                </p>
              ) : (
                cart.map((item) => (
                  <Card key={item.id} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 text-sm">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-muted-foreground">
                          R$ {item.price.toFixed(2)} x {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold text-sm">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>

            <div className="border-t pt-4 mt-4 space-y-3">
              {/* Cupom Section */}
              <div>
                <label className="text-sm font-medium mb-2 block">Cupom de Desconto</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Código do cupom"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  />
                  <Button onClick={applyCoupon} variant="outline" size="sm">
                    Aplicar
                  </Button>
                </div>
                {appliedCoupon && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Cupom "{appliedCoupon.code}" aplicado! -R$ {couponDiscount.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {subtotalAmount.toFixed(2)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto</span>
                    <span>-R$ {couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold">R$ {totalAmount.toFixed(2)}</span>
                </div>
              </div>
              
              <Button
                className="w-full"
                onClick={handleAddItems}
                disabled={cart.length === 0 || loading}
              >
                {loading ? 'Adicionando...' : 'Adicionar Itens'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
