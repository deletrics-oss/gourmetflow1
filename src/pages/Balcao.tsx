import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShoppingCart, Plus, Minus, Trash2, DollarSign, Maximize, Bike, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { generatePrintReceipt } from "@/components/PrintReceipt";
import { toast as sonnerToast } from "sonner";
import { CustomizeItemDialog } from "@/components/dialogs/CustomizeItemDialog";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useRestaurant } from "@/hooks/useRestaurant";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: any[];
  finalPrice?: number;
  customizationsText?: string;
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
  const [customerCpf, setCustomerCpf] = useState("");
  const [restaurantName, setRestaurantName] = useState("Restaurante");
  const [printOnClose, setPrintOnClose] = useState(true);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [loyaltyPointsPerReal, setLoyaltyPointsPerReal] = useState(1);
  const [motoboys, setMotoboys] = useState<any[]>([]);
  const [selectedMotoboy, setSelectedMotoboy] = useState<string>("");
  const [notifyingMotoboy, setNotifyingMotoboy] = useState(false);
  const [isFinalizingSale, setIsFinalizingSale] = useState(false);
  const { toast } = useToast();
  const { sendMessage } = useWhatsApp();
  const { restaurant } = useRestaurant();

  // Busca automática de cliente por telefone (com debounce)
  useEffect(() => {
    const searchCustomer = async () => {
      if (!customerPhone || customerPhone.length < 10) {
        setCustomerId(null);
        setLoyaltyPoints(0);
        setIsSuspicious(false);
        return;
      }

      setSearchingCustomer(true);
      
      try {
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', customerPhone)
          .single();

        if (customer) {
          setCustomerId(customer.id);
          setCustomerName(customer.name || '');
          setCustomerCpf(customer.cpf || '');
          setLoyaltyPoints(customer.loyalty_points || 0);
          setIsSuspicious(customer.is_suspicious || false);

          if (customer.is_suspicious) {
            sonnerToast.warning('⚠️ Cliente marcado como suspeito!', {
              description: customer.notes || 'Verificar histórico antes de prosseguir'
            });
          }
        } else {
          setCustomerId(null);
          setLoyaltyPoints(0);
          setIsSuspicious(false);
        }
      } catch (error) {
        console.error('Erro ao buscar cliente:', error);
      } finally {
        setSearchingCustomer(false);
      }
    };

    const debounce = setTimeout(searchCustomer, 1000);
    return () => clearTimeout(debounce);
  }, [customerPhone]);

  useEffect(() => {
    loadCategories();
    loadMenuItems();
    loadRestaurantSettings();
    loadMotoboys();
  }, []);

  const loadRestaurantSettings = async () => {
    try {
      const { data } = await supabase
        .from('restaurant_settings' as any)
        .select('name, loyalty_enabled, loyalty_points_per_real')
        .maybeSingle();

      if (data) {
        setRestaurantName(data.name || 'Restaurante');
        setLoyaltyEnabled(data.loyalty_enabled || false);
        setLoyaltyPointsPerReal(data.loyalty_points_per_real || 1);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories' as any)
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    if (data) setCategories(data);
  };

  const loadMenuItems = async () => {
    const { data } = await supabase
      .from('menu_items' as any)
      .select('*')
      .eq('is_available', true)
      .order('sort_order');
    
    if (data) setMenuItems(data);
  };

  const loadMotoboys = async () => {
    try {
      const { data } = await supabase
        .from('motoboys' as any)
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (data) setMotoboys(data);
    } catch (error) {
      console.error('Erro ao carregar motoboys:', error);
    }
  };

  const handleAddToCart = async (item: MenuItem) => {
    const { data: variations } = await supabase
      .from('item_variations' as any)
      .select('*')
      .eq('menu_item_id', item.id)
      .eq('is_active', true);

    if (variations && variations.length > 0) {
      setSelectedItem(item);
      setCustomizeDialogOpen(true);
    } else {
      addToCart(item);
    }
  };

  const addToCart = (item: MenuItem, customizations: any[] = []) => {
    const variationsPrice = customizations.reduce((sum, v) => sum + (v.price_adjustment || 0), 0);
    const finalPrice = (item.promotional_price || item.price) + variationsPrice;

    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.promotional_price || item.price,
      quantity: 1,
      customizations,
      finalPrice,
      customizationsText: customizations.map(c => c.name).join(', ')
    };

    setCart(prev => {
      const existingIndex = prev.findIndex(i => 
        i.id === item.id && 
        JSON.stringify(i.customizations) === JSON.stringify(customizations)
      );
      
      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex].quantity += 1;
        return newCart;
      }
      return [...prev, cartItem];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const newCart = [...prev];
      newCart[index].quantity = Math.max(1, newCart[index].quantity + delta);
      return newCart;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const notifyMotoboy = async (orderId: string, orderNumber: string, orderTotal: number) => {
    if (!selectedMotoboy || selectedMotoboy === "none") return;

    setNotifyingMotoboy(true);
    
    try {
      const { data: motoboy } = await supabase
        .from('motoboys' as any)
        .select('*')
        .eq('id', selectedMotoboy)
        .single();
      
      if (!motoboy || !motoboy.phone) {
        sonnerToast.error('Motoboy sem telefone cadastrado');
        return;
      }

      const message = `🛵 *NOVA ENTREGA DISPONÍVEL*\n\n` +
        `📦 Pedido: #${orderNumber}\n` +
        `👤 Cliente: ${customerName}\n` +
        `📱 Telefone: ${customerPhone}\n` +
        `💰 Valor: R$ ${orderTotal.toFixed(2)}\n\n` +
        `📍 Aguardando coleta no balcão`;

      const success = await sendMessage(motoboy.phone, message);
      
      if (success) {
        sonnerToast.success(`Motoboy ${motoboy.name} notificado!`);
      }
      
    } catch (error) {
      console.error('Erro ao notificar motoboy:', error);
      sonnerToast.error('Erro ao notificar motoboy');
    } finally {
      setNotifyingMotoboy(false);
    }
  };

  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      sonnerToast.error('Adicione itens ao carrinho');
      return;
    }

    if (!customerName || !customerPhone) {
      sonnerToast.error('Preencha nome e telefone do cliente');
      return;
    }

    setIsFinalizingSale(true);
    
    try {
      const orderNumber = `BAL-${Date.now().toString().slice(-6)}`;
      const subtotal = cart.reduce((sum, item) => sum + (item.finalPrice || item.price) * item.quantity, 0);
      const total = subtotal;

      let customerId = null;
      if (customerCpf) {
        const { data: existingCustomer } = await supabase
          .from('customers' as any)
          .select('id, loyalty_points')
          .eq('cpf', customerCpf)
          .eq('restaurant_id', restaurant?.id)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer } = await supabase
            .from('customers' as any)
            .insert({
              name: customerName,
              phone: customerPhone,
              cpf: customerCpf,
              loyalty_points: 0,
              restaurant_id: restaurant?.id
            })
            .select()
            .single();
          customerId = newCustomer?.id;
        }
      }

      const { data: order, error: orderError } = await supabase
        .from('orders' as any)
        .insert({
          order_number: orderNumber,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_cpf: customerCpf || null,
          customer_id: customerId,
          delivery_type: 'counter',
          payment_method: paymentMethod,
          motoboy_id: selectedMotoboy && selectedMotoboy !== "none" ? selectedMotoboy : null,
          status: 'completed',
          subtotal: subtotal,
          total: total,
          completed_at: new Date().toISOString(),
          restaurant_id: restaurant?.id
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: (item.finalPrice || item.price) * item.quantity,
        notes: item.customizationsText || null
      }));

      const { error: itemsError } = await supabase
        .from('order_items' as any)
        .insert(orderItems);

      if (itemsError) throw itemsError;

      if (loyaltyEnabled && customerId) {
        const pointsEarned = Math.floor(total * loyaltyPointsPerReal);
        
        await supabase.from('loyalty_transactions' as any).insert({
          customer_id: customerId,
          order_id: order.id,
          type: 'earn',
          points: pointsEarned,
          description: `Compra no balcão - Pedido ${orderNumber}`
        });

        const { data: customer } = await supabase
          .from('customers' as any)
          .select('loyalty_points')
          .eq('id', customerId)
          .single();

        if (customer) {
          await supabase
            .from('customers' as any)
            .update({ loyalty_points: (customer.loyalty_points || 0) + pointsEarned })
            .eq('id', customerId);
        }
      }

      const paymentMethodMap: any = {
        'cash': 'Dinheiro',
        'credit_card': 'Cartão',
        'debit_card': 'Cartão',
        'pix': 'PIX'
      };

      await supabase
        .from('cash_movements' as any)
        .insert({
          type: 'entrada',
          amount: total,
          category: 'Venda',
          description: `Venda Balcão ${orderNumber}`,
          payment_method: paymentMethodMap[paymentMethod] || 'Dinheiro',
          movement_date: new Date().toISOString().split('T')[0],
          restaurant_id: restaurant?.id
        });

      try {
        await supabase.rpc('log_action', {
          p_action: 'BALCAO_SALE',
          p_entity_type: 'order',
          p_entity_id: order.id,
          p_details: {
            total,
            items: cart.length,
            customer: customerName,
            cashback: loyaltyEnabled,
            motoboy: selectedMotoboy ? motoboys.find(m => m.id === selectedMotoboy)?.name : null
          }
        });
      } catch (logError) {
        console.warn('Log failed (non-critical):', logError);
      }

      if (printOnClose) {
        generatePrintReceipt(order, restaurantName, undefined, 'customer');
      }

      sonnerToast.success(`Venda ${orderNumber} finalizada!`);
      
      if (selectedMotoboy && selectedMotoboy !== "none") {
        setTimeout(() => {
          notifyMotoboy(order.id, orderNumber, total);
        }, 500);
      }
      
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerCpf('');
      setCustomerId(null);
      setLoyaltyPoints(0);
      setIsSuspicious(false);
      setSelectedMotoboy('none');
      
    } catch (error: any) {
      console.error('Erro ao finalizar venda:', error);
      sonnerToast.error('Erro ao finalizar venda');
    } finally {
      setIsFinalizingSale(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const filteredItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems.filter(item => item.category_id === selectedCategory);

  const total = cart.reduce((sum, item) => sum + (item.finalPrice || item.price) * item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Balcão</h1>
            <p className="text-sm text-muted-foreground">Atendimento rápido</p>
          </div>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            <Maximize className="h-4 w-4 mr-2" />
            Tela Inteira
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        <div className="lg:col-span-2">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">Todos</TabsTrigger>
              {categories.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                {filteredItems.map(item => (
                  <Card key={item.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleAddToCart(item)}>
                    {item.image_url && (
                      <div className="h-32 overflow-hidden">
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          {item.promotional_price ? (
                            <>
                              <span className="text-lg font-bold text-primary">R$ {item.promotional_price.toFixed(2)}</span>
                              <span className="text-sm text-muted-foreground line-through ml-2">R$ {item.price.toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="text-lg font-bold text-primary">R$ {item.price.toFixed(2)}</span>
                          )}
                        </div>
                        <Button size="sm"><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Carrinho
            </h2>

            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {cart.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    {item.customizationsText && (
                      <p className="text-xs text-muted-foreground truncate">{item.customizationsText}</p>
                    )}
                    <p className="text-xs text-muted-foreground">R$ {(item.finalPrice || item.price).toFixed(2)} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => updateQuantity(index, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button size="sm" variant="outline" onClick={() => updateQuantity(index, 1)}><Plus className="h-3 w-3" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => removeFromCart(index)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t pt-4">
              <div>
                <Label>Nome do Cliente *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome completo" />
              </div>

              <div>
                <Label>Telefone *</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(00) 00000-0000" />
              </div>

              {loyaltyEnabled && (
                <div>
                  <Label>CPF (para cashback)</Label>
                  <Input value={customerCpf} onChange={(e) => setCustomerCpf(e.target.value)} placeholder="000.000.000-00" />
                </div>
              )}

              <div>
                <Label className="flex items-center gap-2">
                  <Bike className="h-4 w-4" />
                  Motoboy (Opcional)
                </Label>
                <Select value={selectedMotoboy} onValueChange={setSelectedMotoboy}>
                  <SelectTrigger><SelectValue placeholder="Selecione o motoboy..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {motoboys.map(motoboy => (
                      <SelectItem key={motoboy.id} value={motoboy.id}>{motoboy.name} - {motoboy.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMotoboy && selectedMotoboy !== "none" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Motoboy será notificado após finalizar venda
                  </div>
                )}
              </div>

              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="print" checked={printOnClose} onCheckedChange={(checked) => setPrintOnClose(checked as boolean)} />
                <Label htmlFor="print" className="cursor-pointer">Imprimir recibo</Label>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              {selectedMotoboy && selectedMotoboy !== "none" && (
                <div className="flex items-center justify-between py-2 mb-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Bike className="h-4 w-4" />
                    Motoboy
                  </span>
                  <Badge variant="secondary">{motoboys.find(m => m.id === selectedMotoboy)?.name || 'Selecionado'}</Badge>
                </div>
              )}

              <div className="flex justify-between text-2xl font-bold mb-4">
                <span>Total:</span>
                <span className="text-primary">R$ {total.toFixed(2)}</span>
              </div>

              <Button className="w-full" size="lg" onClick={handleFinalizeSale} disabled={cart.length === 0 || isFinalizingSale}>
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
          </Card>
        </div>
      </div>

      <CustomizeItemDialog
        open={customizeDialogOpen}
        onOpenChange={setCustomizeDialogOpen}
        item={selectedItem}
        onAddToCart={(item, customizations) => {
          addToCart(item, customizations);
          setCustomizeDialogOpen(false);
        }}
      />
    </div>
  );
}
