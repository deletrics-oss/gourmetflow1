import { useState, useEffect } from 'react';
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
  ArrowRight,
  ArrowLeft,
  Check,
  UtensilsCrossed,
  User,
  CreditCard,
  Package,
  Home
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomizeItemDialog } from '@/components/dialogs/CustomizeItemDialog';
import { Textarea } from '@/components/ui/textarea';

type TotemStep = 'start' | 'customer' | 'menu' | 'cart' | 'payment' | 'confirmation';

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

export default function CustomerMenuTotem() {
  const [step, setStep] = useState<TotemStep>('start');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
  
  // Customer data
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [observations, setObservations] = useState('');
  const [existingCustomer, setExistingCustomer] = useState<any>(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  
  // Payment
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixCopyPaste, setPixCopyPaste] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, [step]);

  const resetInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    
    const timer = setTimeout(() => {
      if (step !== 'start') {
        toast.info('Sessão expirada por inatividade');
        resetTotem();
      }
    }, 120000); // 2 minutos
    
    setInactivityTimer(timer);
  };

  const resetTotem = () => {
    setStep('start');
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setObservations('');
    setPixQrCode('');
    setPixCopyPaste('');
    setOrderNumber('');
    setSelectedCategory('all');
    setExistingCustomer(null);
    setShowWelcomeBack(false);
  };

  const searchCustomer = async (phone: string) => {
    if (!phone || phone.length < 10) return;
    
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (data) {
        setExistingCustomer(data);
        setCustomerName(data.name);
        setShowWelcomeBack(true);
      } else {
        setExistingCustomer(null);
        setShowWelcomeBack(false);
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
    }
  };

  const loadData = async () => {
    try {
      const [categoriesRes, itemsRes, settingsRes] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('menu_items').select('*').eq('is_available', true).order('sort_order'),
        supabase.from('restaurant_settings').select('*').single()
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (itemsRes.data) setMenuItems(itemsRes.data);
      if (settingsRes.data) setRestaurantSettings(settingsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar o cardápio');
    }
  };

  const filteredItems = menuItems.filter(item => 
    selectedCategory === 'all' || item.category_id === selectedCategory
  );

  const handleAddToCart = async (item: MenuItem) => {
    resetInactivityTimer();
    
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
    resetInactivityTimer();
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

  const handleProcessPayment = async () => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio');
      return;
    }

    try {
      const genOrderNumber = `TOTEM-${Date.now().toString().slice(-6)}`;
      setOrderNumber(genOrderNumber);
      
      // Criar ou buscar cliente
      let customerId = existingCustomer?.id || null;
      
      if (!customerId && customerPhone) {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            name: customerName || 'Cliente Totem',
            phone: customerPhone,
            loyalty_points: 0
          })
          .select()
          .single();
        customerId = newCustomer?.id;
      }

      // Criar pedido - vai direto para preparing (cozinha)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: genOrderNumber,
          customer_name: customerName || 'Cliente Totem',
          customer_phone: customerPhone || null,
          customer_id: customerId,
          delivery_type: 'pickup',
          status: 'preparing', // Direto para cozinha
          payment_method: 'pix',
          subtotal: cartTotal,
          total: cartTotal,
          notes: observations || null
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Inserir itens
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

      // Gerar PIX real com PagSeguro
      if (restaurantSettings?.pagseguro_enabled && restaurantSettings?.pagseguro_token) {
        try {
          const { data: pixData, error: pixError } = await supabase.functions.invoke('pagseguro-payment', {
            body: {
              amount: cartTotal,
              orderId: order.id,
              customerEmail: customerPhone ? `${customerPhone}@totem.com` : 'totem@example.com'
            }
          });

          if (pixError) throw pixError;
          
          setPixQrCode(pixData.qrCode || '');
          setPixCopyPaste(pixData.copyPaste || '');
        } catch (pixError) {
          console.error('Erro ao gerar PIX:', pixError);
          toast.error('Erro ao gerar PIX. Tente novamente.');
          return;
        }
      } else {
        setPixQrCode('Configurar PagSeguro em Integrações');
        setPixCopyPaste('Configure o PagSeguro para pagamento automático');
      }

      setStep('payment');

    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error('Erro ao processar pedido');
    }
  };

  // Renderização por etapa
  if (step === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center p-8">
        <div className="text-center animate-fade-in">
          <UtensilsCrossed className="h-32 w-32 text-primary-foreground mx-auto mb-8" />
          <h1 className="text-6xl font-bold text-primary-foreground mb-6">
            {restaurantSettings?.name || 'Restaurante'}
          </h1>
          <p className="text-3xl text-primary-foreground/90 mb-12">
            Autoatendimento
          </p>
          <Button 
            size="lg"
            variant="secondary"
            className="text-3xl px-16 py-12 rounded-2xl hover:scale-105 transition-transform"
            onClick={() => setStep('customer')}
          >
            Toque para Iniciar
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'customer') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => setStep('start')}
            className="mb-4"
          >
            <ArrowLeft className="h-6 w-6 mr-2" />
            Voltar
          </Button>

          <div className="text-center mb-8">
            <User className="h-20 w-20 text-primary mx-auto mb-4" />
            <h2 className="text-4xl font-bold mb-2">Identificação</h2>
            <p className="text-xl text-muted-foreground">
              {restaurantSettings?.loyalty_enabled 
                ? 'Informe seu telefone para acumular pontos'
                : 'Opcional - facilita o atendimento'
              }
            </p>
          </div>
          
          <Card className="p-8">
            {showWelcomeBack && existingCustomer && (
              <div className="mb-6 p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20 animate-fade-in">
                <h3 className="text-3xl font-bold text-primary mb-2">
                  🎉 Bem-vindo de volta, {existingCustomer.name}!
                </h3>
                {restaurantSettings?.loyalty_enabled && (
                  <div className="space-y-2 text-xl">
                    <p className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        ⭐ {existingCustomer.loyalty_points || 0} pontos
                      </Badge>
                    </p>
                    {existingCustomer.loyalty_points > 0 && (
                      <p className="text-lg text-muted-foreground">
                        Valor disponível: R$ {((existingCustomer.loyalty_points || 0) * (restaurantSettings?.loyalty_redemption_value || 0.01)).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <Label className="text-2xl">Telefone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    if (e.target.value.length >= 10) {
                      searchCustomer(e.target.value);
                    }
                  }}
                  placeholder="(00) 00000-0000"
                  className="text-2xl h-16 mt-2"
                  type="tel"
                  maxLength={15}
                />
              </div>
              <div>
                <Label className="text-2xl">Nome</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Seu nome"
                  className="text-2xl h-16 mt-2"
                  disabled={!!existingCustomer}
                />
              </div>
            </div>
            
            <div className="flex gap-4 mt-8">
              <Button 
                size="lg"
                variant="outline"
                className="flex-1 text-xl h-16"
                onClick={() => {
                  setCustomerName('');
                  setCustomerPhone('');
                  setExistingCustomer(null);
                  setShowWelcomeBack(false);
                  setStep('menu');
                }}
              >
                Pular
              </Button>
              <Button 
                size="lg"
                className="flex-1 text-xl h-16"
                onClick={() => setStep('menu')}
              >
                Continuar
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="bg-primary text-primary-foreground p-6 shadow-xl">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setStep('customer')}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-3xl font-bold">Escolha seus itens</h1>
            </div>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setStep('cart')}
              disabled={cart.length === 0}
              className="gap-2 text-xl px-8"
            >
              <ShoppingCart className="h-6 w-6" />
              Revisar ({cart.length})
            </Button>
          </div>
        </div>

        <div className="container mx-auto p-6">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="w-full grid grid-cols-5 h-20 mb-6">
              <TabsTrigger value="all" className="text-xl">Todos</TabsTrigger>
              {categories.slice(0, 4).map(cat => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xl">
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <Card 
                key={item.id} 
                className="cursor-pointer hover:shadow-2xl transition-all duration-200 overflow-hidden"
                onClick={() => handleAddToCart(item)}
              >
                {item.image_url && (
                  <div className="relative h-48">
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {item.promotional_price && (
                      <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-base">
                        Promoção
                      </Badge>
                    )}
                  </div>
                )}
                <div className="p-6">
                  <h3 className="font-bold text-2xl mb-2">{item.name}</h3>
                  {item.description && (
                    <p className="text-base text-muted-foreground mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      {item.promotional_price ? (
                        <div>
                          <p className="text-sm text-muted-foreground line-through">
                            R$ {item.price.toFixed(2)}
                          </p>
                          <p className="text-3xl font-bold text-primary">
                            R$ {item.promotional_price.toFixed(2)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-3xl font-bold text-primary">
                          R$ {item.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Button size="lg" className="h-16 w-16 rounded-full">
                      <Plus className="h-8 w-8" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
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

  if (step === 'cart') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Package className="h-20 w-20 text-primary mx-auto mb-4" />
            <h2 className="text-4xl font-bold mb-2">Revise seu Pedido</h2>
          </div>

          <Card className="p-8 mb-6">
            <div className="space-y-4 mb-6">
              {cart.map((item, index) => (
                <Card key={index} className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-bold text-2xl">{item.name}</p>
                      {item.customizationsText && (
                        <p className="text-lg text-muted-foreground mt-1">
                          {item.customizationsText}
                        </p>
                      )}
                      <p className="text-xl font-bold text-primary mt-2">
                        R$ {((item.finalPrice || item.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => updateQuantity(index, -1)}
                        className="h-16 w-16"
                      >
                        <Minus className="h-6 w-6" />
                      </Button>
                      <span className="text-3xl font-bold w-16 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => updateQuantity(index, 1)}
                        className="h-16 w-16"
                      >
                        <Plus className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div>
              <Label className="text-2xl">Observações</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Alguma observação?"
                className="mt-2 min-h-[120px] text-xl"
              />
            </div>

            <div className="border-t pt-6 mt-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-3xl font-bold">Total</span>
                <span className="text-5xl font-bold text-primary">
                  R$ {cartTotal.toFixed(2)}
                </span>
              </div>

              <div className="flex gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 text-2xl h-20"
                  onClick={() => setStep('menu')}
                >
                  <ArrowLeft className="mr-2 h-6 w-6" />
                  Voltar
                </Button>
                <Button
                  size="lg"
                  className="flex-1 text-2xl h-20"
                  onClick={handleProcessPayment}
                >
                  Ir para Pagamento
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  const handleConfirmPayment = async () => {
    try {
      // Buscar o pedido pelo order_number
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .single();

      if (!order) {
        toast.error('Pedido não encontrado');
        return;
      }

      // 1. Atualizar pedido para completed
      await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          payment_method: 'pix'
        })
        .eq('id', order.id);

      // 2. Registrar no caixa (cash_movements)
      await supabase.from('cash_movements').insert({
        type: 'income',
        category: 'sale',
        description: `Pedido ${orderNumber} - TOTEM`,
        amount: cartTotal,
        payment_method: 'PIX',
        movement_date: new Date().toISOString().split('T')[0]
      });

      // 3. Adicionar pontos de fidelidade se cliente existir
      if (existingCustomer && restaurantSettings?.loyalty_enabled) {
        const pointsEarned = Math.floor(cartTotal * (restaurantSettings.loyalty_points_per_real || 1));
        
        if (pointsEarned > 0) {
          // Atualizar pontos do cliente
          await supabase
            .from('customers')
            .update({ 
              loyalty_points: (existingCustomer.loyalty_points || 0) + pointsEarned 
            })
            .eq('id', existingCustomer.id);

          // Registrar transação de fidelidade
          await supabase.from('loyalty_transactions').insert({
            customer_id: existingCustomer.id,
            order_id: order.id,
            type: 'earn',
            points: pointsEarned,
            description: `Compra no Totem #${orderNumber}`
          });
        }
      }

      // 4. Log da ação
      console.log('[TOTEM] Pedido finalizado com sucesso:', {
        order_number: orderNumber,
        total: cartTotal,
        customer: existingCustomer?.name || customerName
      });

      setConfirmedOrderId(order.id);
      setStep('confirmation');
      toast.success('Pagamento confirmado!');

    } catch (error) {
      console.error('[TOTEM] Erro ao confirmar pagamento:', error);
      toast.error('Erro ao confirmar pagamento');
    }
  };

  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <CreditCard className="h-20 w-20 text-primary mx-auto mb-4" />
            <h2 className="text-4xl font-bold mb-2">Pagamento via PIX</h2>
            <p className="text-2xl text-muted-foreground">
              Escaneie o QR Code ou copie o código
            </p>
          </div>

          <Card className="p-8 text-center">
            <div className="bg-white p-8 rounded-lg inline-block mb-6">
              {pixQrCode && pixQrCode.startsWith('http') ? (
                <img src={pixQrCode} alt="QR Code PIX" className="h-80 w-80" />
              ) : (
                <div className="h-80 w-80 bg-muted flex items-center justify-center">
                  <p className="text-muted-foreground text-center px-4">{pixQrCode || 'QR Code PIX'}</p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <Label className="text-xl mb-2 block">Código Copia e Cola</Label>
              <Input
                value={pixCopyPaste}
                readOnly
                className="text-center text-sm font-mono"
              />
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => {
                  navigator.clipboard.writeText(pixCopyPaste);
                  toast.success('Código copiado!');
                }}
              >
                Copiar Código
              </Button>
            </div>

            <div className="bg-primary/10 p-6 rounded-lg mb-6">
              <p className="text-3xl font-bold text-primary mb-2">
                R$ {cartTotal.toFixed(2)}
              </p>
              <p className="text-xl text-muted-foreground">
                Pedido #{orderNumber}
              </p>
            </div>

            <Button
              size="lg"
              className="w-full text-2xl h-20"
              onClick={handleConfirmPayment}
            >
              <Check className="mr-2 h-6 w-6" />
              Confirmar Pagamento
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'confirmation') {
    const pointsEarned = existingCustomer && restaurantSettings?.loyalty_enabled
      ? Math.floor(cartTotal * (restaurantSettings.loyalty_points_per_real || 1))
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-8 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="bg-green-500 rounded-full h-32 w-32 flex items-center justify-center mx-auto mb-8">
            <Check className="h-20 w-20 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-green-700 dark:text-green-300 mb-4">
            Pedido Confirmado!
          </h1>
          <p className="text-3xl text-muted-foreground mb-8">
            Seu pedido está sendo preparado
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-8 inline-block">
            <p className="text-2xl text-muted-foreground mb-2">Número do Pedido</p>
            <p className="text-6xl font-bold text-primary">
              {orderNumber}
            </p>
            {pointsEarned > 0 && (
              <p className="text-xl text-green-600 mt-4">
                🎉 Você ganhou {pointsEarned} pontos de fidelidade!
              </p>
            )}
          </div>
          <p className="text-2xl text-muted-foreground mb-8">
            Retire seu pedido no balcão quando chamarmos
          </p>
          <Button
            size="lg"
            variant="outline"
            className="text-2xl px-12 py-8"
            onClick={resetTotem}
          >
            <Home className="mr-2 h-6 w-6" />
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
