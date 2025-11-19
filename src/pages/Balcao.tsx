import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShoppingCart, Plus, Minus, Trash2, DollarSign, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { z } from 'zod';

const customerSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome muito longo'),
  phone: z.string()
    .trim()
    .regex(/^\(?[1-9]{2}\)?\s?9?\d{4}-?\d{4}$/, 'Telefone inválido')
});

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  finalPrice: number;
  promotional_price?: number | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  promotional_price: number | null;
  description: string | null;
  image_url: string | null;
  category_id: string | null;
  is_available: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function Balcao() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit_card" | "debit_card" | "pix">("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isFinalizingSale, setIsFinalizingSale] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadCategories(), loadMenuItems()]);
    setIsLoading(false);
  };

  const loadCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (data) setCategories(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadMenuItems = async () => {
    try {
      const { data } = await supabase
        .from('menu_items' as any)
        .select('*')
        .eq('is_available', true)
        .order('sort_order');
      
      if (data) setMenuItems(data);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    }
  };

  const addToCart = (item: MenuItem) => {
    const price = item.promotional_price || item.price;
    const existingItem = cart.find(i => i.id === item.id);
    
    if (existingItem) {
      setCart(cart.map(i => 
        i.id === item.id 
          ? { ...i, quantity: i.quantity + 1, finalPrice: price * (i.quantity + 1) }
          : i
      ));
    } else {
      setCart([...cart, { 
        ...item, 
        quantity: 1, 
        finalPrice: price 
      }]);
    }
    toast({ title: "Item adicionado ao carrinho" });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        const price = item.promotional_price || item.price;
        return { ...item, quantity: newQuantity, finalPrice: price * newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(i => i.id !== itemId));
    toast({ title: "Item removido do carrinho" });
  };

  const finalizeSale = async () => {
    if (cart.length === 0) {
      toast({ title: "Carrinho vazio", description: "Adicione itens ao carrinho", variant: "destructive" });
      return;
    }

    const validation = customerSchema.safeParse({
      name: customerName,
      phone: customerPhone
    });

    if (!validation.success) {
      toast({ title: "Erro de validação", description: validation.error.errors[0].message, variant: "destructive" });
      return;
    }

    setIsFinalizingSale(true);
    
    try {
      const orderNumber = `BAL-${Date.now().toString().slice(-6)}`;
      const total = cart.reduce((sum, item) => sum + item.finalPrice, 0);
      
      const { data: order, error: orderError } = await supabase
        .from('orders' as any)
        .insert({
          order_number: orderNumber,
          customer_name: validation.data.name,
          customer_phone: validation.data.phone,
          delivery_type: 'counter',
          payment_method: paymentMethod,
          status: 'completed',
          total: total,
          subtotal: total,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.promotional_price || item.price,
        total_price: item.finalPrice
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items' as any)
        .insert(orderItems);
      
      if (itemsError) throw itemsError;

      try {
        await supabase.rpc('log_action', {
          p_action: 'BALCAO_SALE',
          p_entity_type: 'order',
          p_entity_id: order.id,
          p_details: {
            total,
            items: cart.length,
            customer: validation.data.name
          }
        });
      } catch (logError) {
        console.warn('Log failed (non-critical):', logError);
      }

      toast({ title: "Venda finalizada!", description: `Pedido ${orderNumber} concluído com sucesso` });
      
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      
    } catch (error: any) {
      console.error('Erro ao finalizar venda:', error);
      toast({ title: "Erro ao finalizar venda", description: "Tente novamente", variant: "destructive" });
    } finally {
      setIsFinalizingSale(false);
    }
  };

  const filteredItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems.filter(item => item.category_id === selectedCategory);

  const total = cart.reduce((sum, item) => sum + item.finalPrice, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary">Balcão</h1>
          <p className="text-muted-foreground">Atendimento rápido sem login</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PRODUTOS */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="all">Todos</TabsTrigger>
                {categories.map(cat => (
                  <TabsTrigger key={cat.id} value={cat.id}>
                    {cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-4">
                {filteredItems.length === 0 ? (
                  <Card className="p-8 text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
                    <p className="text-muted-foreground">Não há produtos cadastrados nesta categoria</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredItems.map(item => (
                      <Card 
                        key={item.id}
                        className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => addToCart(item)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {item.description}
                              </p>
                            )}
                            <div className="mt-2">
                              {item.promotional_price ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-bold text-primary">
                                    R$ {item.promotional_price.toFixed(2)}
                                  </span>
                                  <span className="text-sm text-muted-foreground line-through">
                                    R$ {item.price.toFixed(2)}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-lg font-bold text-primary">
                                  R$ {item.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button size="sm" className="ml-2">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* CARRINHO */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Carrinho
              </h2>

              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Carrinho vazio</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {(item.promotional_price || item.price).toFixed(2)} x {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Nome do Cliente</Label>
                      <Input
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Digite o nome"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerPhone">Telefone</Label>
                      <Input
                        id="customerPhone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Forma de Pagamento</Label>
                      <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                          <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between mb-4">
                        <span className="text-xl font-bold">Total:</span>
                        <span className="text-2xl font-bold text-primary">
                          R$ {total.toFixed(2)}
                        </span>
                      </div>

                      <Button 
                        className="w-full" 
                        size="lg" 
                        onClick={finalizeSale} 
                        disabled={cart.length === 0 || isFinalizingSale}
                      >
                        {isFinalizingSale ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Finalizando...
                          </>
                        ) : (
                          <>
                            <DollarSign className="mr-2 h-5 w-5" />
                            Finalizar Venda
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
