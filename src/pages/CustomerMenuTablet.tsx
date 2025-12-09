import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShoppingCart, 
  Plus, 
  Minus,
  Send,
  User,
  Phone,
  ArrowLeft,
  QrCode,
  Gift,
  CheckCircle,
  Copy,
  Bell,
  Receipt,
  Clock,
  Sparkles,
  UtensilsCrossed,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { CustomizeItemDialog } from '@/components/dialogs/CustomizeItemDialog';
import { TableNotFound } from '@/components/TableNotFound';
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
  image_url?: string | null;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showCallWaiter, setShowCallWaiter] = useState(false);

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
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('*, restaurant_id')
        .eq('id', tableId)
        .single();

      if (tableError || !tableData) {
        setLoading(false);
        return;
      }

      setTable(tableData);
      const restaurantId = tableData.restaurant_id;

      const [categoriesRes, itemsRes, settingsRes, orderRes] = await Promise.all([
        supabase.from('categories').select('*').eq('restaurant_id', restaurantId).eq('is_active', true).order('sort_order'),
        supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).eq('is_available', true).order('sort_order'),
        supabase.from('restaurant_settings').select('*').eq('restaurant_id', restaurantId).single(),
        supabase.from('orders').select('*, order_items(*)').eq('table_id', tableId).in('status', ['new', 'preparing']).maybeSingle()
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

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

    const cartItem: CartItem = {
      ...item,
      quantity: 1,
      customizations,
      finalPrice,
      customizationsText: customizations.map(c => c.name).join(', ')
    };

    setCart(prev => {
      const existingIndex = prev.findIndex((i) => 
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
    
    toast.success(`${item.name} adicionado!`, { duration: 1500 });
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

  const cartTotal = cart.reduce((sum, item) => {
    const price = item.finalPrice || item.promotional_price || item.price;
    return sum + (price * item.quantity);
  }, 0);

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Call waiter function
  const handleCallWaiter = async () => {
    setShowCallWaiter(true);
    toast.success('🔔 Garçom chamado! Aguarde um momento...', { duration: 3000 });
    setTimeout(() => setShowCallWaiter(false), 3000);
  };

  // View current order / bill
  const handleViewBill = () => {
    if (currentOrder) {
      toast.info(`Conta atual: R$ ${currentOrder.total?.toFixed(2) || '0,00'}`, { duration: 3000 });
    } else {
      toast.info('Nenhum pedido em andamento', { duration: 2000 });
    }
  };

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

      const points = restaurantSettings?.loyalty_enabled 
        ? Math.floor(cartTotal * (restaurantSettings.loyalty_points_per_real || 1))
        : 0;
      setEarnedPoints(points);

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

      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.finalPrice || item.promotional_price || item.price,
        total_price: (item.finalPrice || item.promotional_price || item.price) * item.quantity,
        notes: item.customizationsText || null
      }));

      await supabase.from('order_items').insert(orderItems);

      await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', tableId);

      setCurrentOrderId(order.id);
      setCurrentOrderNumber(orderNumber);

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
      await supabase
        .from('orders')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          payment_method: 'pix'
        })
        .eq('id', currentOrderId);

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

      const orderItems = cart.map((item) => ({
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

  // Custom styles
  const primaryColor = restaurantSettings?.primary_color || '#e53e3e';
  const accentColor = restaurantSettings?.accent_color || '#f59e0b';
  const backgroundColor = restaurantSettings?.background_color || '#f8fafc';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${primaryColor}10 0%, ${accentColor}10 100%)` }}>
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
            <div className="absolute inset-2 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            <UtensilsCrossed className="absolute inset-0 m-auto h-10 w-10 text-primary" />
          </div>
          <p className="text-xl font-medium text-muted-foreground">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (!tableId || !table) {
    return (
      <TableNotFound 
        restaurantPhone={restaurantSettings?.phone}
        onRetry={() => {
          setLoading(true);
          loadData();
        }}
      />
    );
  }

  // Full Flow Steps
  if (useFullFlow && step === 'identification') {
    return (
      <div className="min-h-screen p-8" style={{ background: `linear-gradient(135deg, ${primaryColor}10 0%, ${accentColor}10 100%)` }}>
        <div className="max-w-xl mx-auto">
          <Button variant="ghost" size="lg" className="mb-8 text-lg" onClick={() => setStep('menu')}>
            <ArrowLeft className="h-6 w-6 mr-3" />
            Voltar ao Cardápio
          </Button>

          <Card className="p-10 shadow-2xl">
            <div className="text-center mb-10">
              <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                <User className="h-10 w-10" style={{ color: primaryColor }} />
              </div>
              <h1 className="text-4xl font-bold mb-2">Identificação</h1>
              <p className="text-xl text-muted-foreground">Informe seus dados para continuar</p>
            </div>

            <div className="space-y-8">
              <div>
                <Label className="text-lg font-semibold">Telefone</Label>
                <div className="flex gap-3 mt-3">
                  <Input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="text-xl h-16"
                  />
                  <Button variant="outline" className="h-16 px-6" onClick={searchCustomer}>
                    Buscar
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-lg font-semibold">Nome</Label>
                <Input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Seu nome"
                  className="text-xl h-16 mt-3"
                />
              </div>

              {existingCustomer && (
                <Card className="p-6 border-2" style={{ backgroundColor: `${primaryColor}10`, borderColor: primaryColor }}>
                  <div className="flex items-center gap-4">
                    <Gift className="h-10 w-10" style={{ color: primaryColor }} />
                    <div>
                      <p className="font-bold text-lg">Bem-vindo de volta!</p>
                      <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                        {loyaltyPoints} pontos de fidelidade
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <div className="border-t pt-8 mt-8">
                <div className="flex justify-between items-center text-xl mb-6">
                  <span>Total do Pedido:</span>
                  <span className="text-3xl font-bold" style={{ color: primaryColor }}>R$ {cartTotal.toFixed(2)}</span>
                </div>
                
                <Button 
                  className="w-full h-20 text-2xl font-bold"
                  style={{ backgroundColor: primaryColor }}
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

  if (useFullFlow && step === 'payment') {
    return (
      <div className="min-h-screen p-8" style={{ background: `linear-gradient(135deg, ${primaryColor}10 0%, ${accentColor}10 100%)` }}>
        <div className="max-w-xl mx-auto">
          <Card className="p-10 shadow-2xl">
            <div className="text-center mb-10">
              <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                <QrCode className="h-10 w-10" style={{ color: primaryColor }} />
              </div>
              <h1 className="text-4xl font-bold mb-2">Pagamento PIX</h1>
              <p className="text-xl text-muted-foreground">Escaneie o QR Code ou copie o código</p>
            </div>

            {paymentQrCode && (
              <div className="flex flex-col items-center gap-8">
                <div className="p-4 bg-white rounded-2xl shadow-lg">
                  <img src={paymentQrCode} alt="QR Code PIX" className="w-72 h-72" />
                </div>
                
                <div className="w-full">
                  <Label className="text-lg">Código Copia e Cola</Label>
                  <div className="flex gap-3 mt-3">
                    <Input value={pixCopyPaste} readOnly className="font-mono text-sm h-14" />
                    <Button variant="outline" className="h-14 px-6" onClick={() => copyToClipboard(pixCopyPaste)}>
                      <Copy className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-5xl font-bold" style={{ color: primaryColor }}>R$ {cartTotal.toFixed(2)}</p>
                  {earnedPoints > 0 && (
                    <p className="text-lg text-muted-foreground mt-2">
                      +{earnedPoints} pontos após confirmação
                    </p>
                  )}
                </div>

                <Button 
                  className="w-full h-20 text-2xl font-bold bg-green-600 hover:bg-green-700"
                  onClick={handleConfirmPayment}
                >
                  <CheckCircle className="h-8 w-8 mr-3" />
                  Confirmar Pagamento
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (useFullFlow && step === 'confirmation') {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/30">
        <Card className="p-14 text-center max-w-xl shadow-2xl">
          <div className="w-28 h-28 rounded-full bg-green-100 dark:bg-green-900/50 mx-auto mb-8 flex items-center justify-center">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-5xl font-bold mb-6">Pedido Confirmado!</h1>
          <p className="text-2xl text-muted-foreground mb-2">Número do pedido:</p>
          <p className="text-4xl font-bold mb-8" style={{ color: primaryColor }}>{currentOrderNumber}</p>
          
          {earnedPoints > 0 && (
            <Card className="p-6 mb-8 border-2" style={{ backgroundColor: `${primaryColor}10`, borderColor: primaryColor }}>
              <div className="flex items-center justify-center gap-4">
                <Gift className="h-10 w-10" style={{ color: primaryColor }} />
                <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                  +{earnedPoints} pontos de fidelidade!
                </p>
              </div>
            </Card>
          )}

          <p className="text-xl text-muted-foreground mb-10">
            Seu pedido foi enviado para a cozinha.<br />Aguarde ser chamado!
          </p>

          <Button 
            className="w-full h-20 text-2xl font-bold"
            style={{ backgroundColor: primaryColor }}
            onClick={handleNewOrder}
          >
            <Sparkles className="h-7 w-7 mr-3" />
            Fazer Novo Pedido
          </Button>
        </Card>
      </div>
    );
  }

  // Main Menu View - Premium Design
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor }}>
      {/* Premium Header */}
      <header 
        className="sticky top-0 z-50 shadow-lg"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {restaurantSettings?.logo_url ? (
                <img src={restaurantSettings.logo_url} alt="Logo" className="h-14 w-14 rounded-full object-cover bg-white p-1" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center">
                  <UtensilsCrossed className="h-7 w-7 text-white" />
                </div>
              )}
              <div className="text-white">
                <h1 className="text-2xl font-bold">{restaurantSettings?.name || 'Restaurante'}</h1>
                <div className="flex items-center gap-2 text-white/80">
                  <Clock className="h-4 w-4" />
                  <span>Mesa {table.number}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="lg"
                className="gap-2 h-14 px-5"
                onClick={handleCallWaiter}
              >
                <Bell className="h-5 w-5" />
                <span className="hidden sm:inline">Chamar Garçom</span>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="gap-2 h-14 px-5"
                onClick={handleViewBill}
              >
                <Receipt className="h-5 w-5" />
                <span className="hidden sm:inline">Ver Conta</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Call Waiter Toast */}
      {showCallWaiter && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-bounce">
          <Card className="px-8 py-4 shadow-2xl border-2" style={{ borderColor: primaryColor }}>
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 animate-pulse" style={{ color: primaryColor }} />
              <span className="text-xl font-bold">Garçom chamado!</span>
            </div>
          </Card>
        </div>
      )}

      <div className="flex-1 flex">
        {/* Categories Sidebar */}
        <aside className="w-28 lg:w-36 border-r bg-card flex-shrink-0">
          <ScrollArea className="h-[calc(100vh-88px)]">
            <div className="p-2 space-y-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full p-3 rounded-xl text-center transition-all ${
                  selectedCategory === 'all' 
                    ? 'shadow-lg scale-105' 
                    : 'hover:bg-muted'
                }`}
                style={selectedCategory === 'all' ? { backgroundColor: primaryColor, color: 'white' } : {}}
              >
                <Sparkles className="h-8 w-8 mx-auto mb-2" />
                <span className="text-sm font-medium block">Todos</span>
              </button>
              
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full p-3 rounded-xl text-center transition-all ${
                    selectedCategory === cat.id 
                      ? 'shadow-lg scale-105' 
                      : 'hover:bg-muted'
                  }`}
                  style={selectedCategory === cat.id ? { backgroundColor: primaryColor, color: 'white' } : {}}
                >
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.name} className="h-10 w-10 mx-auto mb-2 rounded-lg object-cover" />
                  ) : (
                    <div className="h-10 w-10 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
                      <UtensilsCrossed className="h-5 w-5" />
                    </div>
                  )}
                  <span className="text-xs font-medium block line-clamp-2">{cat.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Menu Items */}
        <main className="flex-1 overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 border-b bg-card">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar no cardápio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 text-lg"
              />
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-88px-73px)]">
            <div className="p-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map(item => (
                  <Card 
                    key={item.id} 
                    className="overflow-hidden cursor-pointer group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    onClick={() => handleAddToCart(item)}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      {item.promotional_price && (
                        <Badge className="absolute top-2 right-2 bg-destructive text-white text-sm px-3 py-1">
                          Promoção
                        </Badge>
                      )}
                      <div 
                        className="absolute bottom-0 right-0 w-14 h-14 rounded-tl-2xl flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: accentColor }}
                      >
                        <Plus className="h-7 w-7 text-white" />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-1 line-clamp-1">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-end gap-2">
                        {item.promotional_price ? (
                          <>
                            <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                              R$ {item.promotional_price.toFixed(2)}
                            </span>
                            <span className="text-sm text-muted-foreground line-through">
                              R$ {item.price.toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                            R$ {item.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </ScrollArea>
        </main>

        {/* Cart Sidebar */}
        <aside className="w-80 lg:w-96 border-l bg-card flex-shrink-0 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <ShoppingCart className="h-6 w-6" />
              Seu Pedido
              {cartItemsCount > 0 && (
                <Badge style={{ backgroundColor: primaryColor }}>{cartItemsCount}</Badge>
              )}
            </h2>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Carrinho vazio</p>
                  <p className="text-sm text-muted-foreground">Selecione itens do cardápio</p>
                </div>
              ) : (
                <>
                  {cart.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{item.name}</p>
                          {item.customizationsText && (
                            <p className="text-sm text-muted-foreground truncate">{item.customizationsText}</p>
                          )}
                        </div>
                        <p className="font-bold ml-3" style={{ color: primaryColor }}>
                          R$ {((item.finalPrice || item.price) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => updateQuantity(index, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-xl font-bold w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => updateQuantity(index, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}

                  <div className="pt-3">
                    <Label>Observações</Label>
                    <Textarea
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Alguma observação?"
                      className="mt-2 min-h-[80px]"
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {cart.length > 0 && (
            <div className="p-4 border-t bg-muted/50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium">Total</span>
                <span className="text-3xl font-bold" style={{ color: primaryColor }}>
                  R$ {cartTotal.toFixed(2)}
                </span>
              </div>
              <Button 
                onClick={useFullFlow ? handleProceedToIdentification : handleFinishOrderSimple}
                className="w-full h-16 text-xl font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                <Send className="h-6 w-6 mr-3" />
                {useFullFlow ? 'Continuar' : 'Enviar para Cozinha'}
              </Button>
            </div>
          )}
        </aside>
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
