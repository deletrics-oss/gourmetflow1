import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  ShoppingCart, 
  Search, 
  Menu as MenuIcon, 
  X, 
  Plus, 
  Minus,
  MapPin,
  CreditCard,
  Banknote,
  Smartphone,
  Home,
  ShoppingBag,
  User,
  MessageCircle,
  LogOut,
  Gift,
  Package
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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
  description: string | null;
}

interface CartItem extends MenuItem {
  quantity: number;
}

export default function CustomerMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [ordersDialogOpen, setOrdersDialogOpen] = useState(false);
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  
  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCPF, setCustomerCPF] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'cash'>('pix');
  const [address, setAddress] = useState({
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    reference: ''
  });
  const [observations, setObservations] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  useEffect(() => {
    loadData();
    loadRestaurantSettings();
    // Load saved customer data
    const savedName = localStorage.getItem('customer_name');
    const savedPhone = localStorage.getItem('customer_phone');
    const savedCPF = localStorage.getItem('customer_cpf');
    if (savedName) setCustomerName(savedName);
    if (savedPhone) setCustomerPhone(savedPhone);
    if (savedCPF) setCustomerCPF(savedCPF);
    
    // Promotion dialog removed - will be sent via chatbot/WhatsApp
  }, []);

  const loadData = async () => {
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('menu_items').select('*').eq('is_available', true).order('sort_order')
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (itemsRes.data) setMenuItems(itemsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar o cardápio');
    }
  };

  const loadRestaurantSettings = async () => {
    try {
      const { data } = await supabase
        .from('restaurant_settings')
        .select('*')
        .single();
      
      if (data) setRestaurantSettings(data);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const loadCustomerOrders = async () => {
    if (!customerPhone) {
      toast.error('Informe seu telefone para ver seus pedidos');
      return;
    }
    
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_phone', customerPhone)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) {
        setCustomerOrders(data);
        setOrdersDialogOpen(true);
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      toast.error('Erro ao carregar pedidos');
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast.success(`${item.name} adicionado ao carrinho!`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
      return updated;
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const applyCoupon = async () => {
    if (!couponCode) return;

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast.error('Cupom inválido ou expirado');
        return;
      }

      if (data.current_uses >= data.max_uses) {
        toast.error('Cupom esgotado');
        return;
      }

      if (cartTotal < data.min_order_value) {
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

  const cartTotal = cart.reduce((sum, item) => {
    const price = item.promotional_price || item.price;
    return sum + (price * item.quantity);
  }, 0);

  const couponDiscount = appliedCoupon 
    ? appliedCoupon.type === 'percentage' 
      ? (cartTotal * appliedCoupon.discount_value) / 100
      : appliedCoupon.discount_value
    : 0;

  const deliveryFee = deliveryType === 'delivery' ? 5.00 : 0;
  const total = cartTotal + deliveryFee - couponDiscount;

  const handleCheckout = async () => {
    if (!customerName || !customerPhone) {
      toast.error('Preencha seu nome e telefone');
      return;
    }

    if (deliveryType === 'delivery' && (!address.street || !address.number || !address.neighborhood)) {
      toast.error('Preencha o endereço de entrega');
      return;
    }

    try {
      const orderNumber = `PED${Date.now().toString().slice(-6)}`;

      console.log('🛒 Criando pedido:', {
        orderNumber,
        customerName,
        customerPhone,
        deliveryType,
        cart,
        total
      });

      // Auto-create or update customer
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', customerPhone)
        .maybeSingle();

      if (!existingCustomer) {
        console.log('📝 Criando novo cliente automaticamente');
        await supabase
          .from('customers')
          .insert({
            name: customerName,
            phone: customerPhone,
            cpf: customerCPF || null,
            address: deliveryType === 'delivery' ? address : null
          });
      } else {
        console.log('✅ Cliente já existe:', existingCustomer.id);
        // Update customer info if needed
        await supabase
          .from('customers')
          .update({
            name: customerName,
            cpf: customerCPF || existingCustomer.cpf,
            address: deliveryType === 'delivery' ? address : existingCustomer.address
          })
          .eq('id', existingCustomer.id);
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_cpf: customerCPF || null,
          delivery_type: deliveryType === 'delivery' ? 'delivery' : 'pickup',
          status: 'new',
          subtotal: cartTotal,
          delivery_fee: deliveryFee,
          service_fee: 0,
          discount: 0,
          total: total,
          payment_method: paymentMethod,
          delivery_address: deliveryType === 'delivery' ? address : null,
          notes: observations || null,
        })
        .select()
        .single();

      if (orderError) {
        console.error('❌ Erro ao criar pedido:', orderError);
        throw orderError;
      }

      console.log('✅ Pedido criado:', order);

      // Insert order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.promotional_price || item.price,
        total_price: (item.promotional_price || item.price) * item.quantity,
      }));

      console.log('📦 Inserindo itens:', orderItems);

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('❌ Erro ao inserir itens:', itemsError);
        throw itemsError;
      }

      console.log('✅ Itens inseridos com sucesso!');

      // Save customer data
      localStorage.setItem('customer_name', customerName);
      localStorage.setItem('customer_phone', customerPhone);
      if (customerCPF) localStorage.setItem('customer_cpf', customerCPF);

      toast.success(`Pedido realizado com sucesso! Número: ${orderNumber}`);
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      setObservations('');
      if (deliveryType === 'delivery') {
        setAddress({ street: '', number: '', neighborhood: '', complement: '', reference: '' });
      }
    } catch (error) {
      console.error('❌ Erro geral ao criar pedido:', error);
      toast.error('Erro ao finalizar pedido. Tente novamente.');
    }
  };

  const saveProfile = () => {
    if (!customerName || !customerPhone) {
      toast.error('Preencha seu nome e telefone');
      return;
    }
    
    localStorage.setItem('customer_name', customerName);
    localStorage.setItem('customer_phone', customerPhone);
    if (customerCPF) localStorage.setItem('customer_cpf', customerCPF);
    
    toast.success('Dados salvos com sucesso!');
    setProfileDialogOpen(false);
  };

  const openMap = () => {
    if (!restaurantSettings?.zipcode && !restaurantSettings?.street) {
      toast.error('Endereço do restaurante não configurado');
      return;
    }
    
    const fullAddress = `${restaurantSettings.street || ''}, ${restaurantSettings.number || ''}, ${restaurantSettings.neighborhood || ''}, ${restaurantSettings.city || ''}, ${restaurantSettings.state || ''}, ${restaurantSettings.zipcode || ''}`;
    const encodedAddress = encodeURIComponent(fullAddress);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const openWhatsApp = () => {
    const phone = restaurantSettings?.phone?.replace(/\D/g, '') || '5511999999999';
    const message = encodeURIComponent('Olá! Gostaria de fazer um pedido.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    const statusMap: any = {
      new: { label: 'Novo', className: 'bg-blue-500' },
      confirmed: { label: 'Confirmado', className: 'bg-green-500' },
      preparing: { label: 'Preparando', className: 'bg-yellow-500' },
      ready: { label: 'Pronto', className: 'bg-purple-500' },
      out_for_delivery: { label: 'Saiu para entrega', className: 'bg-indigo-500' },
      completed: { label: 'Concluído', className: 'bg-green-600' },
      cancelled: { label: 'Cancelado', className: 'bg-red-500' },
    };
    return statusMap[status] || { label: status, className: 'bg-gray-500' };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 via-purple-600 to-purple-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <MenuIcon className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <div className="bg-gradient-to-b from-primary to-primary/80 text-white p-6">
                <h2 className="text-2xl font-bold mb-2">Menu</h2>
                <p className="text-sm opacity-90">Faça seu pedido online</p>
              </div>
              <nav className="p-4 space-y-2">
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => window.location.reload()}>
                  <ShoppingBag className="h-5 w-5" />
                  Fazer Pedido
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={loadCustomerOrders}>
                  <ShoppingCart className="h-5 w-5" />
                  Meus Pedidos
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3">
                  <Gift className="h-5 w-5" />
                  Cartão Fidelidade
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => setProfileDialogOpen(true)}>
                  <User className="h-5 w-5" />
                  Meu Cadastro
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={openWhatsApp}>
                  <MessageCircle className="h-5 w-5" />
                  Chamar no WhatsApp
                </Button>
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={openMap}>
                  <MapPin className="h-5 w-5" />
                  Endereço no Mapa
                </Button>
                <div className="border-t my-4" />
                <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50">
                  <LogOut className="h-5 w-5" />
                  Sair
                </Button>
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-3">
            <ShoppingBag className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Cardápio Digital</h1>
              <p className="text-sm opacity-90">Faça seu pedido online</p>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20 relative"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="h-6 w-6" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Search */}
      <div className="container mx-auto px-4 py-6">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 pb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('all')}
            className="whitespace-nowrap"
          >
            Todos
          </Button>
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category.id)}
              className="whitespace-nowrap"
            >
              {category.name}
              {menuItems.some(item => item.category_id === category.id && item.promotional_price) && (
                <Badge variant="destructive" className="ml-2">Promoção!</Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gray-200 relative overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ShoppingBag className="h-16 w-16 text-gray-400" />
                  </div>
                )}
                {item.promotional_price && (
                  <Badge className="absolute top-2 right-2 bg-red-500">Promoção!</Badge>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    {item.promotional_price ? (
                      <div>
                        <p className="text-xs text-muted-foreground line-through">
                          R$ {item.price.toFixed(2)}
                        </p>
                        <p className="text-xl font-bold text-green-600">
                          R$ {item.promotional_price.toFixed(2)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xl font-bold">R$ {item.price.toFixed(2)}</p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    onClick={() => addToCart(item)}
                    className="rounded-full h-12 w-12"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart Dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Seu Carrinho ({cart.reduce((sum, item) => sum + item.quantity, 0)} {cart.reduce((sum, item) => sum + item.quantity, 0) === 1 ? 'item' : 'itens'})
            </DialogTitle>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Seu carrinho está vazio
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 pb-3 border-b">
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-200 rounded overflow-hidden">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ShoppingBag className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      R$ {(item.promotional_price || item.price).toFixed(2)} cada
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-500"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>R$ {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de Entrega:</span>
                  <span>R$ 5.00</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-green-600">R$ {(cartTotal + 5).toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full h-12"
                onClick={() => {
                  setCartOpen(false);
                  setCheckoutOpen(true);
                }}
              >
                Continuar para Pagamento →
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalizar Pedido</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Data */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Seus Dados
              </h3>
              <div className="space-y-3">
                <div>
                  <Label>Seu nome *</Label>
                  <Input
                    placeholder="Nome completo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Seu telefone (WhatsApp) *</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label>CPF (opcional)</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={customerCPF}
                    onChange={(e) => setCustomerCPF(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Delivery Type */}
            <div>
              <h3 className="font-semibold mb-3">Tipo de Pedido</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={deliveryType === 'delivery' ? 'default' : 'outline'}
                  onClick={() => setDeliveryType('delivery')}
                  className="gap-2"
                >
                  <MapPin className="h-4 w-4" />
                  Entrega
                </Button>
                <Button
                  variant={deliveryType === 'pickup' ? 'default' : 'outline'}
                  onClick={() => setDeliveryType('pickup')}
                  className="gap-2"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Retirada
                </Button>
              </div>
            </div>

            {/* Delivery Address */}
            {deliveryType === 'delivery' && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço de Entrega
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Rua *</Label>
                    <Input
                      placeholder="Nome da rua"
                      value={address.street}
                      onChange={(e) => setAddress({...address, street: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Número *</Label>
                    <Input
                      placeholder="123"
                      value={address.number}
                      onChange={(e) => setAddress({...address, number: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Bairro *</Label>
                    <Input
                      placeholder="Bairro"
                      value={address.neighborhood}
                      onChange={(e) => setAddress({...address, neighborhood: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Complemento</Label>
                    <Input
                      placeholder="Apto, bloco, etc."
                      value={address.complement}
                      onChange={(e) => setAddress({...address, complement: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Ponto de referência</Label>
                    <Input
                      placeholder="Próximo a..."
                      value={address.reference}
                      onChange={(e) => setAddress({...address, reference: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Forma de Pagamento
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant={paymentMethod === 'pix' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('pix')}
                  className="gap-2"
                >
                  <Smartphone className="h-4 w-4" />
                  PIX
                </Button>
                <Button
                  variant={paymentMethod === 'credit_card' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('credit_card')}
                  className="gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Cartão
                </Button>
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                  className="gap-2"
                >
                  <Banknote className="h-4 w-4" />
                  Dinheiro
                </Button>
              </div>
            </div>

            {/* Observations */}
            <div>
              <h3 className="font-semibold mb-3">Observações</h3>
              <Textarea
                placeholder="Alguma observação sobre seu pedido?"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              className="w-full h-12"
              onClick={handleCheckout}
            >
              Finalizar Pedido - R$ {total.toFixed(2)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promotion Dialog */}
      <Dialog open={promotionDialogOpen} onOpenChange={setPromotionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Gift className="h-5 w-5" />
              CHECK-IN DE PROMOÇÕES
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-primary font-medium">
              QUER VERIFICAR SE TEM ALGUMA PROMOÇÃO PARA VOCÊ HOJE?
            </p>
            <div>
              <Label>Informe seu WhatsApp</Label>
              <Input placeholder="(00) 00000-0000" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setPromotionDialogOpen(false)}>
                NÃO QUERO PROMOÇÃO!
              </Button>
              <Button className="flex-1" onClick={() => {
                toast.success('Promoções verificadas!');
                setPromotionDialogOpen(false);
              }}>
                Verificar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Meu Cadastro</DialogTitle>
            <DialogDescription>
              Salve seus dados para pedidos mais rápidos (opcional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome completo</Label>
              <Input
                placeholder="Seu nome"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <Label>Telefone (WhatsApp)</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div>
              <Label>CPF (opcional)</Label>
              <Input
                placeholder="000.000.000-00"
                value={customerCPF}
                onChange={(e) => setCustomerCPF(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={saveProfile}>
              Salvar Dados
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Orders Dialog */}
      <Dialog open={ordersDialogOpen} onOpenChange={setOrdersDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meus Pedidos</DialogTitle>
          </DialogHeader>
          {customerOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum pedido encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {customerOrders.map((order: any) => {
                const status = getStatusBadge(order.status);
                return (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg">#{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <Badge className={status.className}>{status.label}</Badge>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      {order.order_items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          <span>R$ {item.total_price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-3 flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-green-600">R$ {order.total.toFixed(2)}</span>
                    </div>
                    
                    {order.notes && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        <strong>Obs:</strong> {order.notes}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
