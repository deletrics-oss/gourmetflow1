import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ShoppingCart, 
  Plus, 
  Minus,
  Send,
  X,
  UtensilsCrossed,
  User,
  Phone,
  ArrowLeft,
  QrCode,
  Gift,
  CheckCircle,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomizeItemDialog } from '@/components/dialogs/CustomizeItemDialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

interface CartItem extends MenuItem {
  quantity: number;
  customizations?: any[];
  finalPrice?: number;
  customizationsText?: string;
}

type FlowStep = 'menu' | 'identification' | 'payment' | 'confirmation';

export default function CustomerMenuTablet() {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('tableId');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
  const [table, setTable] = useState<any>(null);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(true);
  const [useFullFlow, setUseFullFlow] = useState(false);

  // Full flow states
  const [step, setStep] = useState<FlowStep>('menu');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [existingCustomer, setExistingCustomer] = useState<any>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [paymentQrCode, setPaymentQrCode] = useState<string | null>(null);
  const [pixCopyPaste, setPixCopyPaste] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentOrderNumber, setCurrentOrderNumber] = useState<string | null>(null);
  const [earnedPoints, setEarnedPoints] = useState(0);

  useEffect(() => {
    if (tableId) {
      loadData();
    } else {
      toast.error('Mesa não identificada');
      setLoading(false);
    }
  }, [tableId]);

  const loadData = async () => {
    try {
      // First get table to find restaurant_id
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('*, restaurant_id')
        .eq('id', tableId)
        .single();

      if (tableError || !tableData) {
        console.error('Table not found:', tableError);
        setLoading(false);
        return;
      }

      setTable(tableData);
      const restaurantId = tableData.restaurant_id;

      // Now load all data filtered by restaurant_id
      const [categoriesRes, itemsRes, settingsRes, orderRes] = await Promise.all([
        supabase.from('categories').select('*').eq('restaurant_id', restaurantId).eq('is_active', true).order('sort_order'),
        supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).eq('is_available', true).order('sort_order'),
        supabase.from('restaurant_settings').select('*').eq('restaurant_id', restaurantId).single(),
        supabase.from('orders').select('*').eq('table_id', tableId).in('status', ['new', 'preparing']).maybeSingle()
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (itemsRes.data) setMenuItems(itemsRes.data);
      if (settingsRes.data) {
        setRestaurantSettings(settingsRes.data);
        setUseFullFlow(settingsRes.data.tablet_full_flow || false);
      }
      if (orderRes.data) setCurrentOrder(orderRes.data);

      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar o cardápio');
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => 
    selectedCategory === 'all' || item.category_id === selectedCategory
  );

  const handleAddToCart = async (item: MenuItem) => {
    const { data: variations } = await supabase
      .from('item_variations')
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

    const cartItem: any = {
      ...item,
      quantity: 1,
      customizations,
      finalPrice,
      customizationsText: customizations.map(c => c.name).join(', ')
    };

    setCart(prev => {
      const existingIndex = prev.findIndex((i: any) => 
        i.id === item.id && 
        JSON.stringify(i.customizations) === JSON.stringify(customizations)
      );
      
      if (existingIndex >= 0) {
        const newCart = [...prev];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + 1
        };
        return newCart;
      }
      return [...prev, cartItem];
    });
    
    toast.success(`${item.name} adicionado!`);
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      updated[index].quantity += delta;
      if (updated[index].quantity <= 0) {
        updated.splice(index, 1);
      }
      return updated;
    });
  };

  const cartTotal = cart.reduce((sum, item: any) => {
    const price = item.finalPrice || item.promotional_price || item.price;
    return sum + (price * item.quantity);
  }, 0);

  // Search customer by phone
  const searchCustomer = async () => {
    if (!customerPhone || customerPhone.length < 10) return;

    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', customerPhone)
        .maybeSingle();

      if (data) {
        setExistingCustomer(data);
        setCustomerName(data.name);
        setLoyaltyPoints(data.loyalty_points || 0);
        toast.success(`Bem-vindo de volta, ${data.name}!`);
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
    }
  };

  // Handle flow navigation
  const handleProceedToIdentification = () => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }
    setStep('identification');
  };

  const handleProceedToPayment = async () => {
    if (!customerName || !customerPhone) {
      toast.error('Preencha nome e telefone');
      return;
    }

    setProcessingPayment(true);
    
    try {
      // Create or update customer
      let customerId = existingCustomer?.id;
      
      if (!existingCustomer) {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            name: customerName,
            phone: customerPhone,
            loyalty_points: 0
          })
          .select()
          .single();
        customerId = newCustomer?.id;
      }

      // Calculate earned points
      const points = restaurantSettings?.loyalty_enabled 
        ? Math.floor(cartTotal * (restaurantSettings.loyalty_points_per_real || 1))
        : 0;
      setEarnedPoints(points);

      // Create order
      const orderNumber = `MESA-${table.number}-${Date.now().toString().slice(-6)}`;
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          table_id: tableId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_id: customerId,
          delivery_type: 'dine_in',
          status: 'new',
          payment_method: 'pix',
          subtotal: cartTotal,
          total: cartTotal,
          notes: observations || null,
          loyalty_points_earned: points
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItems = cart.map((item: any) => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.finalPrice || item.promotional_price || item.price,
        total_price: (item.finalPrice || item.promotional_price || item.price) * item.quantity,
        notes: item.customizationsText || null
      }));

      await supabase.from('order_items').insert(orderItems);

      // Update table status
      await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', tableId);

      setCurrentOrderId(order.id);
      setCurrentOrderNumber(orderNumber);

      // Call PagSeguro for PIX
      if (restaurantSettings?.pagseguro_enabled) {
        const { data: paymentData, error } = await supabase.functions.invoke(
          'pagseguro-payment',
          {
            body: {
              amount: cartTotal,
              orderId: order.id,
              customerEmail: `${customerPhone}@temp.com`,
              customerPhone: customerPhone,
              paymentMethod: 'pix'
            }
          }
        );

        if (error) throw error;

        if (paymentData?.qrCode) {
          setPaymentQrCode(paymentData.qrCode);
          setPixCopyPaste(paymentData.pixCopyPaste || '');
          setStep('payment');
        }
      } else {
        toast.error('Gateway de pagamento não configurado');
      }
    } catch (error) {
      console.error('Erro ao processar:', error);
      toast.error('Erro ao processar pagamento');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!currentOrderId) return;

    try {
      // 1. Update order to completed
      await supabase
        .from('orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          payment_method: 'pix'
        })
        .eq('id', currentOrderId);

      // 2. Register cash_movements
      await supabase
        .from('cash_movements')
        .insert({
          type: 'income',
          category: 'sale',
          description: `Pedido Tablet Mesa ${table?.number} - ${currentOrderNumber}`,
          amount: cartTotal,
          payment_method: 'PIX',
          movement_date: new Date().toISOString()
        });

      // 3. Award loyalty points
      if (existingCustomer?.id && earnedPoints > 0 && restaurantSettings?.loyalty_enabled) {
        const newPoints = (existingCustomer.loyalty_points || 0) + earnedPoints;
        
        await supabase
          .from('customers')
          .update({ loyalty_points: newPoints })
          .eq('id', existingCustomer.id);

        await supabase
          .from('loyalty_transactions')
          .insert({
            customer_id: existingCustomer.id,
            order_id: currentOrderId,
            points: earnedPoints,
            type: 'earn',
            description: `Pontos ganhos no pedido ${currentOrderNumber}`
          });
      }

      setStep('confirmation');
      toast.success('Pagamento confirmado!');
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
      toast.error('Erro ao confirmar pagamento');
    }
  };

  const handleNewOrder = () => {
    setStep('menu');
    setCart([]);
    setObservations('');
    setCustomerName('');
    setCustomerPhone('');
    setExistingCustomer(null);
    setLoyaltyPoints(0);
    setPaymentQrCode(null);
    setPixCopyPaste('');
    setCurrentOrderId(null);
    setCurrentOrderNumber(null);
    setEarnedPoints(0);
    loadData();
  };

  // Simple flow (no payment on tablet)
  const handleFinishOrderSimple = async () => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }

    if (!tableId) {
      toast.error('Mesa não identificada');
      return;
    }

    try {
      let orderId = currentOrder?.id;

      if (!orderId) {
        const orderNumber = `MESA-${table.number}-${Date.now().toString().slice(-6)}`;
        
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            table_id: tableId,
            delivery_type: 'dine_in',
            status: 'new',
            payment_method: 'pending',
            subtotal: cartTotal,
            total: cartTotal,
            notes: observations || null
          })
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = order.id;

        await supabase
          .from('tables')
          .update({ status: 'occupied' })
          .eq('id', tableId);
      }

      const orderItems = cart.map((item: any) => ({
        order_id: orderId,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.finalPrice || item.promotional_price || item.price,
        total_price: (item.finalPrice || item.promotional_price || item.price) * item.quantity,
        notes: item.customizationsText || null
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      await supabase
        .from('orders')
        .update({ 
          subtotal: cartTotal,
          total: cartTotal,
          notes: observations || null
        })
        .eq('id', orderId);

      toast.success('✅ Pedido enviado para a cozinha!');
      setCart([]);
      setObservations('');
      loadData();

    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      toast.error('Erro ao enviar pedido');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Código copiado!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (!tableId || !table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-destructive/5 to-destructive/10">
        <div className="text-center">
          <X className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Mesa não encontrada</h1>
          <p className="text-muted-foreground">Por favor, escaneie o QR Code novamente</p>
        </div>
      </div>
    );
  }

  // Full Flow - Identification Step
  if (useFullFlow && step === 'identification') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
        <div className="max-w-lg mx-auto">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => setStep('menu')}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Voltar ao Cardápio
          </Button>

          <Card className="p-8">
            <div className="text-center mb-8">
              <User className="h-16 w-16 text-primary mx-auto mb-4" />
              <h1 className="text-3xl font-bold">Identificação</h1>
              <p className="text-muted-foreground mt-2">Informe seus dados para continuar</p>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-lg">Telefone</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="text-lg h-14"
                  />
                  <Button 
                    variant="outline" 
                    className="h-14"
                    onClick={searchCustomer}
                  >
                    Buscar
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-lg">Nome</Label>
                <Input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Seu nome"
                  className="text-lg h-14 mt-2"
                />
              </div>

              {existingCustomer && (
                <Card className="p-4 bg-primary/10 border-primary">
                  <div className="flex items-center gap-3">
                    <Gift className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-semibold">Bem-vindo de volta!</p>
                      <p className="text-lg text-primary font-bold">
                        {loyaltyPoints} pontos de fidelidade
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <div className="border-t pt-6 mt-6">
                <div className="flex justify-between text-lg mb-4">
                  <span>Total do Pedido:</span>
                  <span className="font-bold text-primary">R$ {cartTotal.toFixed(2)}</span>
                </div>
                
                <Button 
                  className="w-full h-16 text-xl"
                  onClick={handleProceedToPayment}
                  disabled={!customerName || !customerPhone || processingPayment}
                >
                  {processingPayment ? 'Processando...' : 'Continuar para Pagamento'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Full Flow - Payment Step
  if (useFullFlow && step === 'payment') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
        <div className="max-w-lg mx-auto">
          <Card className="p-8">
            <div className="text-center mb-8">
              <QrCode className="h-16 w-16 text-primary mx-auto mb-4" />
              <h1 className="text-3xl font-bold">Pagamento PIX</h1>
              <p className="text-muted-foreground mt-2">Escaneie o QR Code ou copie o código</p>
            </div>

            {paymentQrCode && (
              <div className="flex flex-col items-center gap-6">
                <img 
                  src={paymentQrCode} 
                  alt="QR Code PIX" 
                  className="w-64 h-64 border rounded-lg"
                />
                
                <div className="w-full">
                  <Label>Código Copia e Cola</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={pixCopyPaste}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(pixCopyPaste)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    R$ {cartTotal.toFixed(2)}
                  </p>
                  {earnedPoints > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      +{earnedPoints} pontos após confirmação
                    </p>
                  )}
                </div>

                <Button 
                  className="w-full h-16 text-xl bg-green-600 hover:bg-green-700"
                  onClick={handleConfirmPayment}
                >
                  <CheckCircle className="h-6 w-6 mr-2" />
                  Confirmar Pagamento
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Full Flow - Confirmation Step
  if (useFullFlow && step === 'confirmation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 p-6 flex items-center justify-center">
        <Card className="p-12 text-center max-w-lg">
          <CheckCircle className="h-24 w-24 text-green-600 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">Pedido Confirmado!</h1>
          <p className="text-xl text-muted-foreground mb-2">
            Número do pedido:
          </p>
          <p className="text-3xl font-bold text-primary mb-6">
            {currentOrderNumber}
          </p>
          
          {earnedPoints > 0 && (
            <Card className="p-4 bg-primary/10 border-primary mb-6">
              <div className="flex items-center justify-center gap-3">
                <Gift className="h-8 w-8 text-primary" />
                <p className="text-lg font-bold text-primary">
                  +{earnedPoints} pontos de fidelidade!
                </p>
              </div>
            </Card>
          )}

          <p className="text-muted-foreground mb-8">
            Seu pedido foi enviado para a cozinha.
            <br />Aguarde ser chamado!
          </p>

          <Button 
            className="w-full h-16 text-xl"
            onClick={handleNewOrder}
          >
            Fazer Novo Pedido
          </Button>
        </Card>
      </div>
    );
  }

  // Custom color styles based on restaurant settings
  const primaryColor = restaurantSettings?.primary_color || undefined;
  const accentColor = restaurantSettings?.accent_color || undefined;
  const headerStyle = primaryColor ? { backgroundColor: primaryColor } : undefined;
  const buttonStyle = accentColor ? { backgroundColor: accentColor } : undefined;

  // Menu Step (both flows)
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header fixo */}
      <div 
        className="bg-primary text-primary-foreground shadow-xl sticky top-0 z-50"
        style={headerStyle}
      >
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <UtensilsCrossed className="h-10 w-10" />
              <div>
                <h1 className="text-3xl font-bold">{restaurantSettings?.name || 'Restaurante'}</h1>
                <p className="text-lg opacity-90">Mesa {table.number}</p>
              </div>
            </div>
            <Button 
              size="lg"
              variant="secondary"
              className="gap-2 text-lg px-6 py-6"
              style={buttonStyle}
              onClick={useFullFlow ? handleProceedToIdentification : handleFinishOrderSimple}
              disabled={cart.length === 0}
            >
              <Send className="h-6 w-6" />
              {useFullFlow ? 'Continuar' : 'Enviar Pedido'} ({cart.length})
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu - 2 colunas em paisagem */}
          <div className="lg:col-span-2">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="w-full grid grid-cols-3 lg:grid-cols-5 h-16 mb-6">
                <TabsTrigger value="all" className="text-lg">Todos</TabsTrigger>
                {categories.slice(0, 4).map(cat => (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-lg">
                    {cat.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-2 gap-6">
              {filteredItems.map(item => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer hover:shadow-xl transition-all duration-200 overflow-hidden group"
                  onClick={() => handleAddToCart(item)}
                >
                  {item.image_url && (
                    <div className="relative h-56 overflow-hidden">
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {item.promotional_price && (
                        <Badge className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-lg px-3 py-1">
                          Promoção
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-bold text-xl mb-2">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        {item.promotional_price ? (
                          <div>
                            <p className="text-sm text-muted-foreground line-through">
                              R$ {item.price.toFixed(2)}
                            </p>
                            <p className="text-2xl font-bold text-primary">
                              R$ {item.promotional_price.toFixed(2)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-2xl font-bold text-primary">
                            R$ {item.price.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <Button size="lg" className="h-14 w-14 rounded-full">
                        <Plus className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Carrinho lateral - 1 coluna */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 shadow-xl">
              <div className="p-6 border-b bg-muted/50">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <ShoppingCart className="h-7 w-7" />
                  Seu Pedido
                </h2>
              </div>
              <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-3 opacity-30" />
                    <p className="text-lg text-muted-foreground">Carrinho vazio</p>
                    <p className="text-sm text-muted-foreground">Selecione itens do cardápio</p>
                  </div>
                ) : (
                  <>
                    {cart.map((item, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-lg">{item.name}</p>
                            {item.customizationsText && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.customizationsText}
                              </p>
                            )}
                          </div>
                          <p className="text-lg font-bold text-primary ml-3">
                            R$ {((item.finalPrice || item.price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => updateQuantity(index, -1)}
                            className="h-12 w-12"
                          >
                            <Minus className="h-5 w-5" />
                          </Button>
                          <span className="text-xl font-bold w-12 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => updateQuantity(index, 1)}
                            className="h-12 w-12"
                          >
                            <Plus className="h-5 w-5" />
                          </Button>
                        </div>
                      </Card>
                    ))}

                    <div className="border-t pt-4 mt-4">
                      <Label className="text-base">Observações</Label>
                      <Textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Alguma observação sobre o pedido?"
                        className="mt-2 min-h-[80px] text-base"
                      />
                    </div>
                  </>
                )}
              </div>
              {cart.length > 0 && (
                <div className="p-6 border-t bg-muted/50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-semibold">Total</span>
                    <span className="text-3xl font-bold text-primary">
                      R$ {cartTotal.toFixed(2)}
                    </span>
                  </div>
                  <Button 
                    onClick={useFullFlow ? handleProceedToIdentification : handleFinishOrderSimple}
                    className="w-full h-16 text-xl"
                    size="lg"
                  >
                    <Send className="h-6 w-6 mr-2" />
                    {useFullFlow ? 'Continuar' : 'Enviar para Cozinha'}
                  </Button>
                </div>
              )}
            </Card>
          </div>
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