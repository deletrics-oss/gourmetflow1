import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Plus, Minus, Trash2, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  promotional_price: number | null;
  description: string | null;
  category_id: string;
  is_available: boolean;
}
interface CartItem extends MenuItem {
  quantity: number;
  finalPrice: number;
}
export default function Balcao() {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit_card" | "debit_card" | "pix">("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Carregar restaurante ao montar componente
  useEffect(() => {
    loadRestaurant();
  }, []);

  useEffect(() => {
    if (restaurant) {
      loadMenuItems();
    }
  }, [restaurant]);

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setRestaurant(data);
    } catch (error) {
      console.error('Erro ao carregar restaurante:', error);
      toast.error('Erro ao carregar dados do restaurante');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }
  const loadMenuItems = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurant?.id).eq('is_available', true).order('name');
      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      toast.error('Erro ao carregar cardápio');
    }
  };
  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find(i => i.id === item.id);
    const price = item.promotional_price || item.price;
    if (existingItem) {
      setCart(cart.map(i => i.id === item.id ? {
        ...i,
        quantity: i.quantity + 1,
        finalPrice: price * (i.quantity + 1)
      } : i));
    } else {
      setCart([...cart, {
        ...item,
        quantity: 1,
        finalPrice: price
      }]);
    }
    toast.success(`${item.name} adicionado`);
  };
  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        const price = item.promotional_price || item.price;
        return {
          ...item,
          quantity: newQuantity,
          finalPrice: price * newQuantity
        };
      }
      return item;
    }));
  };
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(i => i.id !== itemId));
  };
  const total = cart.reduce((sum, item) => sum + item.finalPrice, 0);
  const finalizeSale = async () => {
    if (cart.length === 0) {
      toast.error('Adicione itens ao carrinho');
      return;
    }
    if (!customerName || !customerPhone) {
      toast.error('Informe nome e telefone do cliente');
      return;
    }
    try {
      const orderNumber = `BAL-${Date.now().toString().slice(-6)}`;
      const {
        data: order,
        error: orderError
      } = await supabase.from('orders').insert({
        restaurant_id: restaurant?.id,
        order_number: orderNumber,
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_type: 'pickup',
        payment_method: paymentMethod,
        status: 'completed',
        total: total,
        subtotal: total
      }).select().single();
      if (orderError) throw orderError;
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.promotional_price || item.price,
        total_price: item.finalPrice
      }));
      const {
        error: itemsError
      } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Log action
      await supabase.rpc('log_action', {
        p_action: 'BALCAO_SALE',
        p_entity_type: 'order',
        p_entity_id: order.id,
        p_details: {
          total,
          items: cart.length,
          customer: customerName
        }
      });
      toast.success('Venda finalizada!');
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
    } catch (error) {
      console.error('Erro ao finalizar venda:', error);
      toast.error('Erro ao finalizar venda');
    }
  };
  const filteredItems = menuItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  return <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-red-600">Balcão - Atendimento Rápido</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Buscar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredItems.map(item => <Card key={item.id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => addToCart(item)}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        {item.promotional_price ? <>
                            <span className="text-lg font-bold text-primary">
                              R$ {item.promotional_price.toFixed(2)}
                            </span>
                            <span className="text-sm line-through text-muted-foreground">
                              R$ {item.price.toFixed(2)}
                            </span>
                          </> : <span className="text-lg font-bold text-primary">
                            R$ {item.price.toFixed(2)}
                          </span>}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>)}
            </div>
          </div>

          {/* Cart */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="h-5 w-5" />
                <h2 className="text-xl font-bold">Carrinho</h2>
                <Badge variant="secondary">{cart.length}</Badge>
              </div>

              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                {cart.map(item => <div key={item.id} className="flex justify-between items-center border-b pb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        R$ {(item.promotional_price || item.price).toFixed(2)} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" onClick={() => updateQuantity(item.id, -1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button size="icon" variant="outline" onClick={() => updateQuantity(item.id, 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>)}
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Nome do Cliente</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nome completo" />
                </div>

                <div>
                  <Label>Telefone</Label>
                  <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>

                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="credit_card">Cartão Crédito</SelectItem>
                      <SelectItem value="debit_card">Cartão Débito</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold mb-4">
                    <span>Total:</span>
                    <span className="text-primary">R$ {total.toFixed(2)}</span>
                  </div>

                  <Button className="w-full" size="lg" onClick={finalizeSale} disabled={cart.length === 0}>
                    <DollarSign className="mr-2 h-5 w-5" />
                    Finalizar Venda
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>;
}