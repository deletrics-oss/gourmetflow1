import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShoppingCart, Plus, Minus, Trash2, DollarSign, Printer, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/lib/supabase";
import { generatePrintReceipt } from "@/components/PrintReceipt";
import { toast as sonnerToast } from "sonner";
import { OrderDetailsDialog } from "@/components/dialogs/OrderDetailsDialog";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
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

export default function PDV() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup" | "dine_in" | "online" | "counter">("dine_in");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [tables, setTables] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit_card" | "debit_card" | "pix">("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [restaurantName, setRestaurantName] = useState("Restaurante");
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [recentlyClosedOrders, setRecentlyClosedOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"new" | "pending">("new");
  const [includeServiceFee, setIncludeServiceFee] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any | null>(null);
  const [printOnClose, setPrintOnClose] = useState(true);
  const [selectedClosedOrder, setSelectedClosedOrder] = useState<any | null>(null);
  const [closedOrderDialogOpen, setClosedOrderDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
    loadMenuItems();
    loadTables();
    loadRestaurantSettings();
    loadPendingOrders();
    loadRecentlyClosedOrders();

    // Atualizar pedidos pendentes em tempo real
    const channel = supabase
      .channel('orders_changes')
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        loadPendingOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRestaurantSettings = async () => {
    try {
      const { data } = await supabase
        .from('restaurant_settings' as any)
        .select('name')
        .maybeSingle();

      if (data?.name) {
        setRestaurantName(data.name);
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

  const loadTables = async () => {
    const { data } = await supabase
      .from('tables' as any)
      .select('*')
      .order('number');
    
    if (data) setTables(data);
  };

  const loadPendingOrders = async () => {
    try {
      const { data: orders } = await supabase
        .from('orders' as any)
        .select(`
          *,
          order_items:order_items(*),
          tables(number)
        `)
        .in('status', ['new', 'confirmed', 'preparing', 'ready'])
        .order('created_at', { ascending: false });

      if (orders) setPendingOrders(orders);
    } catch (error) {
      console.error('Erro ao carregar pedidos pendentes:', error);
    }
  };

  const loadRecentlyClosedOrders = async () => {
    try {
      const { data: orders } = await supabase
        .from('orders' as any)
        .select(`
          *,
          order_items:order_items(*),
          tables(number)
        `)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(5);

      if (orders) setRecentlyClosedOrders(orders);
    } catch (error) {
      console.error('Erro ao carregar pedidos fechados:', error);
    }
  };

  const handleSelectPendingOrder = (order: any) => {
    setCurrentOrder(order);
    sonnerToast.info(`Pedido ${order.order_number} carregado no caixa`);
  };

  const handleViewClosedOrder = (order: any) => {
    setSelectedClosedOrder(order);
    setClosedOrderDialogOpen(true);
  };

  const handleCloseCurrentOrder = async () => {
    if (!currentOrder) return;

    try {
      // Atualizar pedido como completo
      const { error: orderError } = await supabase
        .from('orders' as any)
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', currentOrder.id);

      if (orderError) throw orderError;

      // Liberar mesa se for pedido no local
      if (currentOrder.table_id) {
        await supabase
          .from('tables' as any)
          .update({ status: 'free' })
          .eq('id', currentOrder.table_id);
      }

      // Registrar entrada no caixa
      await supabase
        .from('cash_movements' as any)
        .insert({
          type: 'entry',
          amount: currentOrder.total,
          category: 'Venda',
          description: `Pedido ${currentOrder.order_number} - ${currentOrder.payment_method}`,
          payment_method: currentOrder.payment_method
        });

      sonnerToast.success(`Pedido ${currentOrder.order_number} fechado com sucesso!`);
      
      // Imprimir recibo se opção estiver marcada
      if (printOnClose) {
        const tableNum = currentOrder.table_id && currentOrder.tables
          ? currentOrder.tables.number 
          : undefined;
        generatePrintReceipt(currentOrder, restaurantName, tableNum, 'customer');
      }
      
      setCurrentOrder(null);
      loadPendingOrders();
      loadRecentlyClosedOrders();
      loadTables();
    } catch (error) {
      console.error('Erro ao fechar pedido:', error);
      sonnerToast.error('Erro ao fechar pedido');
    }
  };

  const filteredItems =
    selectedCategory === "all"
      ? menuItems
      : menuItems.filter((item) => item.category_id === selectedCategory);

  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find((cartItem) => cartItem.id === item.id);
    if (existingItem) {
      setCart(
        cart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: item.id,
          name: item.name,
          price: item.promotional_price || item.price,
          quantity: 1,
        },
      ]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const serviceFee = includeServiceFee ? subtotal * 0.1 : 0;
  const total = subtotal + serviceFee;

  const handleFinishOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione itens ao pedido antes de finalizar",
        variant: "destructive",
      });
      return;
    }

    if (deliveryType === "dine_in" && !selectedTable) {
      toast({
        title: "Mesa obrigatória",
        description: "Selecione uma mesa para pedido no local",
        variant: "destructive",
      });
      return;
    }

    if ((deliveryType === "online" || deliveryType === "delivery") && !customerPhone) {
      toast({
        title: "Telefone obrigatório",
        description: "Informe o telefone do cliente para pedidos online/entrega",
        variant: "destructive",
      });
      return;
    }

    try {
      // Criar pedido
      const orderNumber = `PDV${Date.now().toString().slice(-6)}`;
      const { data: orderData, error: orderError } = await supabase
        .from('orders' as any)
        .insert([{
          order_number: orderNumber,
          delivery_type: deliveryType === "online" ? "delivery" : deliveryType,
          table_id: deliveryType === "dine_in" ? selectedTable : null,
          status: 'new',
          payment_method: paymentMethod,
          subtotal: subtotal,
          service_fee: serviceFee,
          total: total,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Adicionar itens do pedido
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items' as any)
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Atualizar status da mesa se for pedido no local
      if (deliveryType === "dine_in" && selectedTable) {
        await supabase
          .from('tables' as any)
          .update({ status: 'occupied' })
          .eq('id', selectedTable);
      }

      toast({
        title: "Pedido finalizado!",
        description: `Pedido ${orderNumber} criado com sucesso`,
      });

      // Preparar dados para impressão
      const orderForPrint = {
        order_number: orderNumber,
        created_at: new Date().toISOString(),
        delivery_type: deliveryType,
        customer_name: customerName,
        customer_phone: customerPhone,
        subtotal: subtotal,
        service_fee: serviceFee,
        total: total,
        payment_method: paymentMethod,
        notes: null,
        order_items: cart.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        }))
      };

      // Imprimir recibo
      const tableNum = deliveryType === "dine_in" && selectedTable 
        ? tables.find(t => t.id === selectedTable)?.number 
        : undefined;
      generatePrintReceipt(orderForPrint, restaurantName, tableNum, 'customer');

      // Limpar formulário
      setCart([]);
      setSelectedTable("");
      setCustomerName("");
      setCustomerPhone("");
      loadTables();
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast({
        title: "Erro ao criar pedido",
        description: "Tente novamente",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">PDV - Ponto de Venda</h1>
        <p className="text-muted-foreground">Crie pedidos e finalize fechamentos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Todos</TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id}>
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory}>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
                {filteredItems.map((item) => (
                  <Card
                    key={item.id}
                    className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => addToCart(item)}
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-24 object-cover rounded-md mb-2"
                      />
                    )}
                    <h3 className="font-semibold text-sm mb-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {item.promotional_price ? (
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-green-600">
                            R$ {item.promotional_price.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground line-through">
                            R$ {item.price.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold">
                          R$ {item.price.toFixed(2)}
                        </span>
                      )}
                      <Button size="sm" variant="secondary">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-8">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="text-xl font-bold">Pedido Atual</h2>
            </div>

            <div className="space-y-2 mb-4">
              <Label>Tipo de Pedido</Label>
              <Select value={deliveryType} onValueChange={(v: any) => setDeliveryType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dine_in">Mesa (Consumo no Local)</SelectItem>
                  <SelectItem value="counter">Balcão</SelectItem>
                  <SelectItem value="online">Pedido Online (WhatsApp/Web)</SelectItem>
                  <SelectItem value="delivery">Entrega</SelectItem>
                  <SelectItem value="pickup">Retirada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {deliveryType === "dine_in" && (
              <div className="space-y-2 mb-4">
                <Label>Selecione a Mesa</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma mesa" />
                  </SelectTrigger>
                  <SelectContent>
                    {tables
                      .filter(t => t.status === 'free')
                      .map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          Mesa {table.number}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {tables.filter(t => t.status === 'free').length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma mesa disponível</p>
                )}
              </div>
            )}

            {(deliveryType === "online" || deliveryType === "delivery") && (
              <div className="space-y-4 mb-4">
                <div className="space-y-2">
                  <Label>Nome do Cliente</Label>
                  <Input
                    placeholder="Nome do cliente"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone *</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <Label>Forma de Pagamento</Label>
              <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash">Dinheiro</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="credit_card" id="credit_card" />
                  <Label htmlFor="credit_card">Cartão de Crédito</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="debit_card" id="debit_card" />
                  <Label htmlFor="debit_card">Cartão de Débito</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix">PIX</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="border-t pt-4 mb-4 max-h-[300px] overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Carrinho vazio
                </p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 mb-3 pb-3 border-b">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {item.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm font-bold w-20 text-right">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeServiceFee}
                      onChange={(e) => setIncludeServiceFee(e.target.checked)}
                      className="rounded"
                    />
                    Taxa de serviço 10%
                  </label>
                  {includeServiceFee && (
                    <span className="text-sm">R$ {serviceFee.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center mb-4 border-t pt-4">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold text-green-600">R$ {total.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  size="lg"
                  onClick={handleFinishOrder}
                  disabled={cart.length === 0}
                >
                  <DollarSign className="h-5 w-5" />
                  Finalizar Pedido
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Pedido Atual no Caixa */}
      {currentOrder && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-6 w-6" />
            <h2 className="text-2xl font-bold">Pedido Atual no Caixa</h2>
          </div>
          
          <Card className="p-6 border-2 border-primary">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-2xl">#{currentOrder.order_number}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(currentOrder.created_at).toLocaleString('pt-BR')}
                </p>
                {currentOrder.tables && (
                  <Badge variant="outline" className="mt-2">
                    Mesa {currentOrder.tables.number}
                  </Badge>
                )}
              </div>
              <Badge variant="default" className="text-lg px-4 py-2">
                {currentOrder.delivery_type === 'online' && '🌐 Online'}
                {currentOrder.delivery_type === 'delivery' && '🚚 Entrega'}
                {currentOrder.delivery_type === 'pickup' && '🏪 Retirada'}
                {currentOrder.delivery_type === 'dine_in' && '🍽️ Local'}
                {currentOrder.delivery_type === 'counter' && '🏪 Balcão'}
              </Badge>
            </div>

            {currentOrder.customer_name && (
              <p className="text-sm mb-2">
                <strong>Cliente:</strong> {currentOrder.customer_name}
              </p>
            )}

            {currentOrder.customer_phone && (
              <p className="text-sm mb-4">
                <strong>Telefone:</strong> {currentOrder.customer_phone}
              </p>
            )}

            <div className="bg-muted/50 rounded-lg p-4 mb-4">
              <p className="font-semibold mb-3">Itens do pedido:</p>
              <div className="space-y-2">
                {currentOrder.order_items && currentOrder.order_items.length > 0 ? (
                  currentOrder.order_items.map((item: any) => (
                    <div key={item.id} className="flex justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{item.quantity}x {item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {item.unit_price.toFixed(2)} cada
                        </p>
                      </div>
                      <span className="font-bold">R$ {item.total_price.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">Sem itens</p>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>R$ {currentOrder.subtotal.toFixed(2)}</span>
              </div>
              {currentOrder.service_fee > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Taxa de serviço:</span>
                  <span>R$ {currentOrder.service_fee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-xl font-semibold">Total:</span>
                <span className="text-3xl font-bold text-green-600">
                  R$ {currentOrder.total.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Pagamento: {currentOrder.payment_method === 'cash' && 'Dinheiro'}
                {currentOrder.payment_method === 'credit_card' && 'Cartão de Crédito'}
                {currentOrder.payment_method === 'debit_card' && 'Cartão de Débito'}
                {currentOrder.payment_method === 'pix' && 'PIX'}
              </p>
            </div>

            <div className="flex items-center gap-3 mb-4 p-3 bg-accent/50 rounded-lg">
              <input
                type="checkbox"
                id="printOnClose"
                checked={printOnClose}
                onChange={(e) => setPrintOnClose(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="printOnClose" className="cursor-pointer text-sm">
                Imprimir recibo ao fechar pedido
              </Label>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setCurrentOrder(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                size="lg"
                onClick={handleCloseCurrentOrder}
                className="flex-1 gap-2"
              >
                <CheckCircle className="h-5 w-5" />
                Fechar Pedido
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Pedidos Pendentes */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Pedidos Pendentes para Fechamento</h2>
          <Badge variant="secondary" className="ml-2">{pendingOrders.length}</Badge>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pendingOrders.length === 0 ? (
            <Card className="p-8 text-center col-span-full">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum pedido pendente</p>
            </Card>
          ) : (
            pendingOrders.map((order) => (
              <Card 
                key={order.id} 
                className="p-4 cursor-pointer hover:shadow-lg transition-all border-2 hover:border-primary"
                onClick={() => handleSelectPendingOrder(order)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">#{order.order_number}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleTimeString('pt-BR')}
                    </p>
                    {order.tables ? (
                      <Badge variant="outline" className="mt-1">
                        Mesa {order.tables.number}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="mt-1">
                        {order.delivery_type === 'online' && '🌐 Online'}
                        {order.delivery_type === 'delivery' && '🚚 Entrega'}
                        {order.delivery_type === 'pickup' && '🏪 Retirada'}
                        {order.delivery_type === 'dine_in' && '🍽️ Local'}
                        {order.delivery_type === 'counter' && '🏪 Balcão'}
                      </Badge>
                    )}
                  </div>
                  <Badge variant={
                    order.status === 'ready' ? 'default' : 
                    order.status === 'preparing' ? 'secondary' : 'outline'
                  }>
                    {order.status === 'new' && 'Novo'}
                    {order.status === 'confirmed' && 'Confirmado'}
                    {order.status === 'preparing' && 'Preparando'}
                    {order.status === 'ready' && 'Pronto'}
                  </Badge>
                </div>

                {order.customer_name && (
                  <p className="text-sm mb-2">
                    <strong>Cliente:</strong> {order.customer_name}
                  </p>
                )}

                {order.customer_phone && (
                  <p className="text-sm mb-2">
                    <strong>Telefone:</strong> {order.customer_phone}
                  </p>
                )}

                <div className="bg-muted/50 rounded-md p-2 mb-3">
                  <p className="text-xs font-semibold mb-1">Itens do pedido:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {order.order_items && order.order_items.length > 0 ? (
                      order.order_items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="truncate">{item.quantity}x {item.name}</span>
                          <span className="ml-2 flex-shrink-0">R$ {item.total_price.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sem itens</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Total:</span>
                    <span className="text-xl font-bold text-green-600">R$ {order.total.toFixed(2)}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Últimos Pedidos Fechados */}
      {recentlyClosedOrders.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h2 className="text-2xl font-bold">Últimos Pedidos Fechados</h2>
            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
              {recentlyClosedOrders.length}
            </Badge>
          </div>
          
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            {recentlyClosedOrders.map((order) => (
              <Card 
                key={order.id} 
                className="p-4 border-2 border-green-200 bg-green-50/50 cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={() => handleViewClosedOrder(order)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-sm">#{order.order_number}</h4>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.completed_at).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="font-bold text-green-600">R$ {order.total.toFixed(2)}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialog de Detalhes do Pedido Fechado */}
      <OrderDetailsDialog
        order={selectedClosedOrder}
        open={closedOrderDialogOpen}
        onOpenChange={setClosedOrderDialogOpen}
        restaurantName={restaurantName}
      />
    </div>
  );
}
