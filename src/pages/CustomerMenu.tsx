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
import { CustomizeItemDialog } from '@/components/dialogs/CustomizeItemDialog';
import { useCEP } from '@/hooks/useCEP';
import { useDeliveryFee } from '@/hooks/useDeliveryFee';
import { CustomerAddressForm } from '@/components/delivery/CustomerAddressForm';

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
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
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
    city: '',
    state: '',
    zipcode: '',
    complement: '',
    reference: ''
  });
  const [observations, setObservations] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [customerLoyalty, setCustomerLoyalty] = useState<any>(null);
  const { buscarCEP, loading: cepLoading } = useCEP();
  const { calculateFromAddress, loading: deliveryLoading } = useDeliveryFee();
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState(0);

  useEffect(() => {
    loadData();
    loadRestaurantSettings();
    // Load saved customer data
    const savedName = localStorage.getItem('customer_name');
    const savedPhone = localStorage.getItem('customer_phone');
    const savedCPF = localStorage.getItem('customer_cpf');
    if (savedName) setCustomerName(savedName);
    if (savedPhone) {
      setCustomerPhone(savedPhone);
      loadCustomerLoyalty(savedPhone);
    }
    if (savedCPF) setCustomerCPF(savedCPF);
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

  const loadCustomerLoyalty = async (phone: string) => {
    if (!phone) return;
    
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();
      
      if (data) {
        setCustomerLoyalty(data);
        setLoyaltyPoints(data.loyalty_points || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar fidelidade:', error);
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

  const handleAddToCart = async (item: MenuItem) => {
    // Check if item has variations
    const { data: variations } = await supabase
      .from('item_variations')
      .select('*')
      .eq('menu_item_id', item.id)
      .eq('is_active', true);

    if (variations && variations.length > 0) {
      // Open customization dialog
      setSelectedItem(item);
      setCustomizeDialogOpen(true);
    } else {
      // Add directly to cart
      addToCart(item);
    }
  };

  const addToCart = (item: MenuItem, customizations: any[] = []) => {
    // Calculate price with variations
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

  const cartTotal = cart.reduce((sum, item: any) => {
    const price = item.finalPrice || item.promotional_price || item.price;
    return sum + (price * item.quantity);
  }, 0);

  const couponDiscount = appliedCoupon 
    ? appliedCoupon.type === 'percentage' 
      ? (cartTotal * appliedCoupon.discount_value) / 100
      : appliedCoupon.discount_value
    : 0;

  // Pontos: cada ponto vale conforme configuração (padrão R$ 0.01)
  const loyaltyDiscount = useLoyaltyPoints && pointsToUse > 0
    ? pointsToUse * (restaurantSettings?.loyalty_redemption_value || 0.01)
    : 0;

  const deliveryFee = deliveryType === 'delivery' ? calculatedDeliveryFee : 0;
  const total = Math.max(0, cartTotal + deliveryFee - couponDiscount - loyaltyDiscount);

  const handleCEPSearch = async () => {
    if (!address.zipcode) {
      toast.error('Digite um CEP');
      return;
    }

    const cepData = await buscarCEP(address.zipcode);
    if (cepData) {
      setAddress({
        ...address,
        street: cepData.street,
        neighborhood: cepData.neighborhood,
        city: cepData.city,
        state: cepData.state
      });
      toast.success('Endereço encontrado!');
    }
  };

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

      // Auto-create or update customer
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', customerPhone)
        .maybeSingle();

      let customerId = existingCustomer?.id;
      const earnedPoints = restaurantSettings?.loyalty_enabled 
        ? Math.floor(total * (restaurantSettings.loyalty_points_per_real || 1))
        : 0;

      if (!existingCustomer) {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            name: customerName,
            phone: customerPhone,
            cpf: customerCPF || null,
            address: deliveryType === 'delivery' ? address : null,
            loyalty_points: 0 // Pontos serão creditados quando o pedido for concluído
          })
          .select()
          .single();
        customerId = newCustomer?.id;
      } else {
        // Update customer info (não credita pontos aqui)
        await supabase
          .from('customers')
          .update({
            name: customerName,
            cpf: customerCPF || existingCustomer.cpf,
            address: deliveryType === 'delivery' ? address : existingCustomer.address
          })
          .eq('id', existingCustomer.id);
        customerId = existingCustomer.id;
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
          discount: loyaltyDiscount,
          coupon_discount: couponDiscount,
          coupon_code: appliedCoupon?.code || null,
          total: total,
          payment_method: paymentMethod,
          delivery_address: deliveryType === 'delivery' ? address : null,
          notes: observations || null,
          loyalty_points_earned: earnedPoints,
          loyalty_points_used: pointsToUse
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

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update coupon usage
      if (appliedCoupon) {
        await supabase
          .from('coupons')
          .update({ current_uses: appliedCoupon.current_uses + 1 })
          .eq('id', appliedCoupon.id);
      }


      // Create loyalty transaction for redeemed points only (earned points are added when order is completed)
      if (customerId && restaurantSettings?.loyalty_enabled && pointsToUse > 0) {
        // Deduct used points
        const updatedPoints = Math.max(0, (existingCustomer?.loyalty_points || 0) - pointsToUse);
        await supabase
          .from('customers')
          .update({ loyalty_points: updatedPoints })
          .eq('id', customerId);
        
        await supabase
          .from('loyalty_transactions')
          .insert({
            customer_id: customerId,
            order_id: order.id,
            points: -pointsToUse,
            type: 'redeemed',
            description: `Pontos usados no pedido ${orderNumber}`
          });
      }

      // Save customer data
      localStorage.setItem('customer_name', customerName);
      localStorage.setItem('customer_phone', customerPhone);
      if (customerCPF) localStorage.setItem('customer_cpf', customerCPF);

      toast.success(`Pedido realizado! ${earnedPoints > 0 ? `Você ganhará ${earnedPoints} pontos quando o pedido for concluído!` : ''}`);
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      setObservations('');
      setAppliedCoupon(null);
      setCouponCode('');
      setUseLoyaltyPoints(false);
      setPointsToUse(0);
      if (pointsToUse > 0) {
        setLoyaltyPoints(prev => Math.max(0, prev - pointsToUse));
      }
      if (deliveryType === 'delivery') {
        setAddress({ 
          street: '', 
          number: '', 
          neighborhood: '', 
          city: '', 
          state: '', 
          zipcode: '', 
          complement: '', 
          reference: '' 
        });
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
    if (!restaurantSettings) {
      toast.error('Configurações do restaurante não disponíveis');
      return;
    }
    
    // Montar endereço completo para o Maps
    const parts = [];
    if (restaurantSettings.street) parts.push(restaurantSettings.street);
    if (restaurantSettings.number) parts.push(restaurantSettings.number);
    if (restaurantSettings.neighborhood) parts.push(restaurantSettings.neighborhood);
    if (restaurantSettings.city) parts.push(restaurantSettings.city);
    if (restaurantSettings.state) parts.push(restaurantSettings.state);
    if (restaurantSettings.zipcode) parts.push(restaurantSettings.zipcode);
    
    if (parts.length === 0) {
      toast.error('Endereço do restaurante não configurado');
      return;
    }
    
    const endereco = encodeURIComponent(parts.join(', '));
    window.open(`https://www.google.com/maps/search/?api=1&query=${endereco}`, '_blank');
  };

  const openWhatsApp = () => {
    if (!restaurantSettings?.phone) {
      toast.error('Telefone do restaurante não configurado');
      return;
    }
    
    let phone = restaurantSettings.phone;
    // Remove all non-numeric characters
    phone = phone.replace(/\D/g, '');
    // If doesn't start with country code, add Brazil's
    if (!phone.startsWith('55')) {
      phone = '55' + phone;
    }
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
                <div className="p-4 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-lg mx-4 my-2">
                  <div className="flex items-center gap-3 mb-2">
                    <Gift className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-semibold">Pontos de Fidelidade</p>
                      <p className="text-2xl font-bold text-primary">{loyaltyPoints} pontos</p>
                    </div>
                  </div>
                  {restaurantSettings?.loyalty_enabled && (
                    <p className="text-xs text-muted-foreground">
                      Ganhe {restaurantSettings.loyalty_points_per_real || 1} ponto(s) por real gasto
                    </p>
                  )}
                </div>
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
                     onClick={() => handleAddToCart(item)}
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
              {cart.map((item: any, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center gap-3 pb-3 border-b">
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
                      R$ {(item.finalPrice || item.promotional_price || item.price).toFixed(2)} cada
                    </p>
                    {item.customizationsText && (
                      <p className="text-xs text-muted-foreground mt-1">
                        + {item.customizationsText}
                      </p>
                    )}
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
                    <Label>CEP *</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="00000-000"
                        value={address.zipcode}
                        onChange={(e) => setAddress({...address, zipcode: e.target.value})}
                        maxLength={9}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={handleCEPSearch}
                        disabled={cepLoading}
                      >
                        {cepLoading ? "..." : "Buscar"}
                      </Button>
                    </div>
                  </div>
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
                  <div>
                    <Label>Cidade *</Label>
                    <Input
                      placeholder="Cidade"
                      value={address.city}
                      onChange={(e) => setAddress({...address, city: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Estado *</Label>
                    <Input
                      placeholder="SP"
                      maxLength={2}
                      value={address.state}
                      onChange={(e) => setAddress({...address, state: e.target.value.toUpperCase()})}
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

            {/* Coupon Section */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Cupom de Desconto
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite o código do cupom"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                />
                <Button onClick={applyCoupon} variant="outline">
                  Aplicar
                </Button>
              </div>
              {appliedCoupon && (
                <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/20 rounded text-sm">
                  <span className="font-medium text-green-800 dark:text-green-200">
                    ✓ Cupom "{appliedCoupon.code}" aplicado! Desconto de R$ {couponDiscount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Loyalty Points Section */}
            {restaurantSettings?.loyalty_enabled && loyaltyPoints > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Pontos de Fidelidade
                </h3>
                <div className="p-3 bg-primary/10 rounded-lg mb-3">
                  <p className="text-sm font-medium">
                    Você tem {loyaltyPoints} pontos disponíveis
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cada ponto vale R$ {(restaurantSettings.loyalty_redemption_value || 0.01).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="useLoyalty"
                    checked={useLoyaltyPoints}
                    onChange={(e) => {
                      setUseLoyaltyPoints(e.target.checked);
                      if (e.target.checked) {
                        setPointsToUse(loyaltyPoints);
                      } else {
                        setPointsToUse(0);
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="useLoyalty" className="flex-1 cursor-pointer">
                    Usar meus pontos neste pedido
                  </Label>
                </div>
                {useLoyaltyPoints && (
                  <div className="mt-3">
                    <Label>Quantos pontos usar? (máx: {loyaltyPoints})</Label>
                    <Input
                      type="number"
                      min="0"
                      max={loyaltyPoints}
                      value={pointsToUse}
                      onChange={(e) => setPointsToUse(Math.min(loyaltyPoints, Math.max(0, parseInt(e.target.value) || 0)))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Desconto: R$ {loyaltyDiscount.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Order Summary */}
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>R$ {cartTotal.toFixed(2)}</span>
              </div>
              {deliveryType === 'delivery' && (
                <div className="flex justify-between text-sm">
                  <span>Taxa de Entrega:</span>
                  <span>R$ {deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto (Cupom):</span>
                  <span>- R$ {couponDiscount.toFixed(2)}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto (Pontos):</span>
                  <span>- R$ {loyaltyDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span className="text-green-600">R$ {total.toFixed(2)}</span>
              </div>
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

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <Button
          size="lg"
          className="fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full shadow-2xl hover:scale-110 transition-transform"
          onClick={() => setCartOpen(true)}
        >
          <div className="relative">
            <ShoppingCart className="h-6 w-6" />
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
        </Button>
      )}

      {/* Customize Item Dialog */}
      <CustomizeItemDialog
        open={customizeDialogOpen}
        onOpenChange={setCustomizeDialogOpen}
        item={selectedItem}
        onAddToCart={addToCart}
      />
    </div>
  );
}
