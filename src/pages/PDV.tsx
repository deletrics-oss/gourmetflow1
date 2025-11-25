import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShoppingCart, Plus, Minus, Trash2, DollarSign, Printer, Clock, CheckCircle, Bike, Loader2, MapPin, Star, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/lib/supabase";
import { generatePrintReceipt } from "@/components/PrintReceipt";
import { toast as sonnerToast } from "sonner";
import { OrderDetailsDialog } from "@/components/dialogs/OrderDetailsDialog";
import { CustomizeItemDialog } from "@/components/dialogs/CustomizeItemDialog";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";
import { CustomerAddressForm } from "@/components/delivery/CustomerAddressForm";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { logActionWithContext } from "@/lib/logging";

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
  const [shouldPrint, setShouldPrint] = useState(true);
  const [selectedClosedOrder, setSelectedClosedOrder] = useState<any | null>(null);
  const [closedOrderDialogOpen, setClosedOrderDialogOpen] = useState(false);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [customerAddress, setCustomerAddress] = useState({
    street: "", number: "", complement: "",
    neighborhood: "", city: "", state: "", zipcode: "",
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  const { calculateFromAddress, loadDeliveryZones } = useDeliveryFee();
  const [motoboys, setMotoboys] = useState<any[]>([]);
  const [selectedMotoboy, setSelectedMotoboy] = useState<string>("none");
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);
  const [paymentGatewayDialogOpen, setPaymentGatewayDialogOpen] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentQrCode, setPaymentQrCode] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [searchOrderNumber, setSearchOrderNumber] = useState("");
  const [searchingOrder, setSearchingOrder] = useState(false);
  const [customerCpf, setCustomerCpf] = useState("");
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [pixCopyPaste, setPixCopyPaste] = useState('');
  const [customerLoyaltyPoints, setCustomerLoyaltyPoints] = useState(0);
  const [isCustomerSuspicious, setIsCustomerSuspicious] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
    loadMenuItems();
    loadTables();
    loadRestaurantSettings();
    loadPendingOrders();
    loadRecentlyClosedOrders();
    loadMotoboys();

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

  // Cálculo automático de taxa de entrega
  useEffect(() => {
    const autoCalculateFee = async () => {
      // SEMPRE zerar taxa para pickup, counter e dine_in
      if (deliveryType === 'pickup' || deliveryType === 'counter' || deliveryType === 'dine_in') {
        setDeliveryFee(0);
        setDeliveryDistance(null);
        return;
      }

      // Calcular APENAS para delivery e online
      if ((deliveryType === 'delivery' || deliveryType === 'online') && customerAddress.street && customerAddress.number) {
        try {
          const result = await calculateFromAddress(customerAddress);
          if (result.distance && result.isWithinRange) {
            setDeliveryFee(result.fee);
            setDeliveryDistance(result.distance);
            sonnerToast.success(`Taxa calculada: R$ ${result.fee.toFixed(2)} (${result.distance.toFixed(2)}km)`);
          } else if (result.distance && !result.isWithinRange) {
            setDeliveryFee(0);
            setDeliveryDistance(null);
            sonnerToast.error(`Endereço fora do raio de entrega`);
          }
        } catch (error) {
          console.error('Erro ao calcular taxa:', error);
          setDeliveryFee(0);
          setDeliveryDistance(null);
        }
      } else {
        setDeliveryFee(0);
        setDeliveryDistance(null);
      }
    };
    autoCalculateFee();
  }, [customerAddress.street, customerAddress.number, customerAddress.city, deliveryType]);

  const loadRestaurantSettings = async () => {
    try {
      const { data } = await supabase
        .from('restaurant_settings' as any)
        .select('name, street, number, neighborhood, city, state, zipcode, latitude, longitude, pagseguro_enabled, mercadopago_enabled, rede_enabled, stone_enabled, nubank_enabled')
        .maybeSingle();

      if (data) {
        setRestaurantName(data.name || 'Restaurante');
        setRestaurantSettings(data);
        
        // Carregar zonas de entrega se houver coordenadas
        if (data.latitude && data.longitude) {
          const { data: restaurantData } = await supabase
            .from('restaurants')
            .select('id')
            .maybeSingle();
          
          if (restaurantData?.id) {
            loadDeliveryZones(restaurantData.id);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const loadMotoboys = async () => {
    try {
      const { data } = await supabase
        .from('motoboys')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (data) setMotoboys(data);
    } catch (error) {
      console.error('Erro ao carregar motoboys:', error);
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
          tables(number),
          comandas_fixas(numero)
        `)
        .in('status', ['new', 'confirmed', 'preparing', 'ready', 'ready_for_payment'])
        .order('created_at', { ascending: false });

      if (orders) setPendingOrders(orders);
    } catch (error) {
      console.error('Erro ao carregar pedidos pendentes:', error);
    }
  };

  const searchOrderByNumber = async (orderNum: string) => {
    if (!orderNum || orderNum.length < 3) {
      return;
    }

    setSearchingOrder(true);
    try {
      const { data: order } = await supabase
        .from('orders' as any)
        .select(`
          *,
          order_items:order_items(*),
          tables(number)
        `)
        .ilike('order_number', `%${orderNum}%`)
        .in('status', ['confirmed', 'new', 'preparing', 'ready'])
        .maybeSingle();

      if (order) {
        handleSelectPendingOrder(order);
        sonnerToast.success(`Pedido ${order.order_number} encontrado e carregado!`);
        setSearchOrderNumber("");
      } else {
        sonnerToast.error(`Pedido não encontrado`);
      }
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      sonnerToast.error('Erro ao buscar pedido');
    } finally {
      setSearchingOrder(false);
    }
  };

  const searchCustomerByPhoneOrCpf = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 8) {
      return;
    }

    setSearchingCustomer(true);
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .or(`phone.eq.${searchTerm},cpf.eq.${searchTerm}`)
        .maybeSingle();

      if (customer) {
        setCustomerName(customer.name || "");
        setCustomerPhone(customer.phone || "");
        setCustomerCpf(customer.cpf || "");
        
        // ✅ Carregar pontos e status suspeito
        setCustomerLoyaltyPoints(customer.loyalty_points || 0);
        setIsCustomerSuspicious(customer.is_suspicious || false);
        
        if (customer.address) {
          const addr = customer.address as any;
          setCustomerAddress({
            street: addr.street || "",
            number: addr.number || "",
            complement: addr.complement || "",
            neighborhood: addr.neighborhood || "",
            city: addr.city || "",
            state: addr.state || "",
            zipcode: addr.zipcode || "",
            latitude: addr.latitude,
            longitude: addr.longitude
          });
        }
        
        // ✅ Toast com informações completas
        const warnings = [];
        if (customer.is_suspicious) warnings.push("⚠️ Cliente Suspeito");
        if (customer.loyalty_points > 0) warnings.push(`⭐ ${customer.loyalty_points} pontos`);
        
        sonnerToast.success(
          `Cliente ${customer.name} carregado!\n${warnings.join(' | ')}`,
          { duration: 5000 }
        );
      } else {
        sonnerToast.info('Cliente não encontrado. Será cadastrado ao finalizar pedido.');
        setCustomerLoyaltyPoints(0);
        setIsCustomerSuspicious(false);
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
    } finally {
      setSearchingCustomer(false);
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
    console.log("📋 [PDV] Carregando pedido pendente:", order);
    
    // 1. Definir pedido atual
    setCurrentOrder(order);
    
    // 2. Carregar items no carrinho VISUAL
    const cartItems = order.order_items.map((item: any) => ({
      id: item.menu_item_id,
      name: item.name,
      price: item.unit_price,
      quantity: item.quantity,
      finalPrice: item.unit_price,
      customizationsText: item.notes || '',
    }));
    setCart(cartItems);
    console.log("🛒 [PDV] Items carregados no carrinho:", cartItems);
    
    // 3. Carregar dados do cliente
    setCustomerName(order.customer_name || '');
    setCustomerPhone(order.customer_phone || '');
    setCustomerCpf(order.customer_cpf || '');
    console.log("👤 [PDV] Cliente:", order.customer_name, order.customer_phone);
    
    // ✅ Carregar dados do cliente se existir customer_id
    if (order.customer_id) {
      const loadCustomerData = async () => {
        const { data: customer } = await supabase
          .from('customers')
          .select('loyalty_points, is_suspicious')
          .eq('id', order.customer_id)
          .single();
        
        if (customer) {
          setCustomerLoyaltyPoints(customer.loyalty_points || 0);
          setIsCustomerSuspicious(customer.is_suspicious || false);
        }
      };
      
      loadCustomerData();
    }
    
    // 4. Carregar endereço (se delivery)
    if (order.delivery_address) {
      setCustomerAddress(order.delivery_address);
      console.log("📍 [PDV] Endereço carregado:", order.delivery_address);
    }
    
    // 5. Carregar taxa de entrega
    setDeliveryFee(order.delivery_fee || 0);
    setDeliveryDistance(null);
    console.log("💰 [PDV] Taxa de entrega: R$", order.delivery_fee || 0);
    
    // 6. Carregar tipo de entrega
    if (order.delivery_type === 'delivery') {
      setDeliveryType('delivery');
    } else if (order.delivery_type === 'pickup') {
      setDeliveryType('pickup');
    } else if (order.delivery_type === 'dine_in') {
      setDeliveryType('dine_in');
      setSelectedTable(order.table_id || '');
    }
    
    // 7. Mudar para aba de Pedido Atual
    setActiveTab("new");
    
    // 8. Toast informativo
    sonnerToast.info(
      `✅ Pedido ${order.order_number} carregado!\nTotal: R$ ${order.total.toFixed(2)}\nSelecione a forma de pagamento e clique em "Finalizar Pedido".`,
      { duration: 5000 }
    );
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
      const paymentMethodMap: any = {
        'cash': 'Dinheiro',
        'credit_card': 'Cartão',
        'debit_card': 'Cartão',
        'pix': 'PIX'
      };

      await supabase
        .from('cash_movements' as any)
        .insert({
          type: 'income',
          amount: currentOrder.total,
          category: 'sale',
          description: `Pedido ${currentOrder.order_number}`,
          payment_method: paymentMethodMap[currentOrder.payment_method] || 'Dinheiro',
          movement_date: new Date().toISOString().split('T')[0]
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

  const subtotal = cart.reduce((sum, item) => {
    const price = item.finalPrice || item.price;
    return sum + price * item.quantity;
  }, 0);
  const serviceFee = includeServiceFee ? subtotal * 0.1 : 0;
  const total = subtotal + serviceFee + deliveryFee;

  const handleFinishOrder = async () => {
    // Se há pedido atual carregado (de pendentes), permitir finalizar
    if (currentOrder && currentOrder.id) {
      console.log("💳 [PDV] Finalizando pedido existente:", currentOrder.order_number);
      setPaymentGatewayDialogOpen(true);
      return;
    }
    
    // Para novos pedidos, validar carrinho
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

    // Abrir dialog de seleção de gateway de pagamento
    setPaymentGatewayDialogOpen(true);
  };

  const processPayment = async (gateway: string) => {
    setPaymentGatewayDialogOpen(false);
    
    try {
      // Se há pedido existente, apenas fechar
      if (currentOrder) {
        // Atualizar status para completed
        await supabase
          .from('orders')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            payment_method: paymentMethod
          })
          .eq('id', currentOrder.id);

        // Registrar caixa
        const paymentMethodMap: any = {
          'cash': 'Dinheiro',
          'credit_card': 'Cartão',
          'debit_card': 'Cartão',
          'pix': 'PIX'
        };

        await supabase.from('cash_movements').insert([{
          type: 'income',
          description: `Pedido ${currentOrder.order_number}`,
          amount: currentOrder.total,
          movement_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethodMap[paymentMethod] || 'Dinheiro',
          category: 'sale',
          created_by: (await supabase.auth.getUser()).data.user?.id
        }]);

        // Imprimir
        if (printOnClose) {
          generatePrintReceipt(currentOrder, restaurantName, undefined, 'customer');
        }

        sonnerToast.success(`Pedido ${currentOrder.order_number} fechado!`);
        
        // Limpar estado completo
        setCurrentOrder(null);
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setCustomerCpf("");
        setCustomerAddress({
          street: "", number: "", complement: "",
          neighborhood: "", city: "", state: "", zipcode: "",
          latitude: undefined, longitude: undefined,
        });
        setDeliveryFee(0);
        setDeliveryDistance(null);
        setSelectedTable("");
        setSelectedMotoboy("none");
        setCustomerLoyaltyPoints(0);
        setIsCustomerSuspicious(false);
        
        loadPendingOrders();
        loadRecentlyClosedOrders();
        return;
      }

      // Criar novo pedido
      const orderNumber = `PDV${Date.now().toString().slice(-6)}`;
      let finalDeliveryType: 'delivery' | 'pickup' | 'dine_in' = 'dine_in';
      if (deliveryType === "online" || deliveryType === "delivery") {
        finalDeliveryType = "delivery";
      } else if (deliveryType === "pickup" || deliveryType === "counter") {
        finalDeliveryType = "pickup";
      }

      // Status inicial: completed para manual, pending_payment para gateways
      let initialStatus = 'completed';
      if (gateway !== 'manual') {
        initialStatus = 'pending_payment';
      }
      
      // Buscar ou criar cliente
      let customerId = null;
      if (customerPhone || customerCpf) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .or(`phone.eq.${customerPhone},cpf.eq.${customerCpf}`)
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else if (customerName && customerPhone) {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert({
              name: customerName,
              phone: customerPhone,
              cpf: customerCpf || null,
              address: (deliveryType === 'delivery' || deliveryType === 'online') ? customerAddress : null
            })
            .select('id')
            .single();
          
          if (newCustomer) {
            customerId = newCustomer.id;
          }
        }
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders' as any)
        .insert([{
          order_number: orderNumber,
          delivery_type: finalDeliveryType,
          table_id: deliveryType === "dine_in" ? selectedTable : null,
          status: initialStatus,
          payment_method: paymentMethod,
          subtotal: subtotal,
          service_fee: serviceFee,
          delivery_fee: deliveryFee,
          delivery_address: (deliveryType === 'delivery' || deliveryType === 'online') ? customerAddress : null,
          total: total,
          customer_id: customerId,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          customer_cpf: customerCpf || null,
          motoboy_id: selectedMotoboy && selectedMotoboy !== "none" ? selectedMotoboy : null,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Adicionar itens do pedido com variações
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.finalPrice || item.price,
        total_price: (item.finalPrice || item.price) * item.quantity,
        notes: item.customizationsText || null
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Erro ao inserir itens:', itemsError);
        throw itemsError;
      }

      // Processar pagamento via gateway
      if (gateway !== 'manual') {
        setProcessingPayment(true);
        
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
          `${gateway}-payment`,
          {
            body: {
              amount: total,
              orderId: orderData.id,
              customerEmail: customerPhone ? `${customerPhone}@temp.com` : 'cliente@temp.com',
              customerPhone: customerPhone,
              paymentMethod: paymentMethod === 'pix' ? 'pix' : 'credit_card'
            }
          }
        );

        setProcessingPayment(false);

        if (paymentError) throw paymentError;

        if (paymentData?.qrCode) {
          setPaymentQrCode(paymentData.qrCode);
          setPixCopyPaste(paymentData.pixCopyPaste || '');
          setQrDialogOpen(true);
          sonnerToast.success('QR Code PIX gerado! Aguardando pagamento...');
        } else if (paymentData?.paymentLink) {
          window.open(paymentData.paymentLink, '_blank');
          sonnerToast.success('Link de pagamento aberto!');
        }
      } else {
        // Pagamento manual: registrar caixa e completar pedido
        const paymentMethodMap: any = {
          'cash': 'Dinheiro',
          'credit_card': 'Cartão',
          'debit_card': 'Cartão',
          'pix': 'PIX'
        };

        await supabase.from('cash_movements').insert([{
          type: 'income',
          description: `Pedido ${orderNumber} - ${deliveryType === 'dine_in' ? 'Balcão' : deliveryType === 'online' ? 'Online' : 'Retirada'}`,
          amount: total,
          movement_date: new Date().toISOString().split('T')[0],
          payment_method: paymentMethodMap[paymentMethod] || 'Dinheiro',
          category: 'sale',
          created_by: (await supabase.auth.getUser()).data.user?.id
        }]);

        // Atualizar pedido para completed
        await supabase
          .from('orders')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', orderData.id);
        
        // ✅ FASE 2: Log de pedido processado
        await logActionWithContext(
          'order_processed',
          'orders',
          orderData.id,
          {
            order_number: orderNumber,
            delivery_type: finalDeliveryType,
            total: total,
            payment_method: paymentMethod,
            source: 'pdv_manual'
          }
        );
      }


      // Atualizar status da mesa se for pedido no local
      if (deliveryType === "dine_in" && selectedTable) {
        await supabase
          .from('tables')
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

      // Imprimir recibo apenas se checkbox estiver marcado
      if (shouldPrint) {
        const tableNum = deliveryType === "dine_in" && selectedTable 
          ? tables.find(t => t.id === selectedTable)?.number 
          : undefined;
        generatePrintReceipt(orderForPrint, restaurantName, tableNum, 'customer');
      }

      // Limpar formulário
      setCart([]);
      setSelectedTable("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerCpf("");
      setSelectedMotoboy("none");
      setCustomerAddress({
        street: "", number: "", complement: "",
        neighborhood: "", city: "", state: "", zipcode: "",
        latitude: undefined, longitude: undefined,
      });
      setShouldPrint(true);
      setDeliveryType("dine_in");
      setCustomerLoyaltyPoints(0);
      setIsCustomerSuspicious(false);
      loadTables();
      loadPendingOrders();
      loadRecentlyClosedOrders();
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
                    onClick={() => handleAddToCart(item)}
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

            {(deliveryType === "online" || deliveryType === "delivery" || deliveryType === "pickup" || deliveryType === "counter") && (
              <div className="space-y-4 mb-4 p-4 border rounded-lg bg-accent/10">
                <p className="text-sm font-semibold text-muted-foreground">Dados do Cliente</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Buscar por Telefone</Label>
                    <div className="flex gap-1">
                      <Input
                        placeholder="(00) 00000-0000"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        onBlur={() => customerPhone && searchCustomerByPhoneOrCpf(customerPhone)}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => searchCustomerByPhoneOrCpf(customerPhone)}
                        disabled={searchingCustomer || !customerPhone}
                      >
                        {searchingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : "🔍"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>ou CPF</Label>
                    <div className="flex gap-1">
                      <Input
                        placeholder="000.000.000-00"
                        value={customerCpf}
                        onChange={(e) => setCustomerCpf(e.target.value)}
                        onBlur={() => customerCpf && searchCustomerByPhoneOrCpf(customerCpf)}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => searchCustomerByPhoneOrCpf(customerCpf)}
                        disabled={searchingCustomer || !customerCpf}
                      >
                        {searchingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : "🔍"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nome do Cliente</Label>
                  <Input
                    placeholder="Nome do cliente"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                {/* ✅ Badges de Fidelidade e Status */}
                {customerName && (
                  <div className="flex gap-2 flex-wrap">
                    {customerLoyaltyPoints > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {customerLoyaltyPoints} pontos de fidelidade
                      </Badge>
                    )}
                    
                    {isCustomerSuspicious && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Cliente Suspeito
                      </Badge>
                    )}
                    
                    {!isCustomerSuspicious && customerName && (
                      <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Cliente Confiável
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}

            {deliveryType === 'delivery' && (
              <div className="space-y-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <Label className="font-semibold">Endereço de Entrega</Label>
                </div>
                <CustomerAddressForm
                  address={customerAddress}
                  onAddressChange={setCustomerAddress}
                  onDeliveryFeeChange={(fee, distance, coords) => {
                    setDeliveryFee(fee);
                    setDeliveryDistance(distance);
                    if (coords) {
                      setCustomerAddress(prev => ({
                        ...prev,
                        latitude: coords.latitude,
                        longitude: coords.longitude
                      }));
                    }
                  }}
                />
                {deliveryDistance && (
                  <Badge variant="secondary" className="text-sm">
                    📍 Distância: {deliveryDistance.toFixed(2)}km | Taxa: R$ {deliveryFee.toFixed(2)}
                  </Badge>
                )}
              </div>
            )}

            {(deliveryType === "online" || deliveryType === "delivery") && (
              <div className="space-y-2 mb-4">
                <Label>Motoboy (Opcional)</Label>
                <Select value={selectedMotoboy} onValueChange={setSelectedMotoboy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motoboy..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {motoboys.map(motoboy => (
                      <SelectItem key={motoboy.id} value={motoboy.id}>
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4" />
                          {motoboy.name} - {motoboy.phone}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMotoboy && selectedMotoboy !== "none" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Motoboy será notificado após finalizar venda
                  </div>
                )}
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
                    {item.customizationsText && (
                      <p className="text-xs text-muted-foreground">+ {item.customizationsText}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      R$ {(item.finalPrice || item.price).toFixed(2)}
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
                      R$ {((item.finalPrice || item.price) * item.quantity).toFixed(2)}
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
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="shouldPrint"
                  checked={shouldPrint}
                  onChange={(e) => setShouldPrint(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="shouldPrint" className="cursor-pointer text-sm">
                  Imprimir recibo ao finalizar
                </Label>
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
              <p className="text-sm mb-2">
                <strong>Telefone:</strong> {currentOrder.customer_phone}
              </p>
            )}

            {currentOrder.customer_cpf && (
              <p className="text-sm mb-2">
                <strong>CPF:</strong> {currentOrder.customer_cpf}
              </p>
            )}

            {/* ✅ Badges de Status do Cliente */}
            <div className="flex gap-2 flex-wrap mb-4">
              {currentOrder.loyalty_points_earned > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  +{currentOrder.loyalty_points_earned} pontos nesta compra
                </Badge>
              )}
              
              {currentOrder.loyalty_points_used > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Star className="h-3 w-3" />
                  {currentOrder.loyalty_points_used} pontos usados
                </Badge>
              )}
              
              {customerLoyaltyPoints > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  {customerLoyaltyPoints} pontos totais
                </Badge>
              )}
              
              {isCustomerSuspicious && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Cliente Suspeito
                </Badge>
              )}
            </div>

            {/* ✅ Endereço de entrega (se delivery) */}
            {currentOrder.delivery_type === 'delivery' && currentOrder.delivery_address && (
              <div className="bg-muted/50 rounded-lg p-3 mb-4">
                <p className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço de Entrega:
                </p>
                <p className="text-sm">
                  {currentOrder.delivery_address.street}, {currentOrder.delivery_address.number}
                  {currentOrder.delivery_address.complement && ` - ${currentOrder.delivery_address.complement}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentOrder.delivery_address.neighborhood} - {currentOrder.delivery_address.city}/{currentOrder.delivery_address.state}
                </p>
                <p className="text-sm text-muted-foreground">
                  CEP: {currentOrder.delivery_address.zipcode}
                </p>
              </div>
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
        
        {/* Campo de Busca por Número do Pedido */}
        <Card className="p-4 mb-4 bg-accent/10">
          <div className="flex items-center gap-3">
            <Label className="whitespace-nowrap">Buscar pedido online:</Label>
            <Input
              placeholder="Digite o número do pedido (ex: PED782821)"
              value={searchOrderNumber}
              onChange={(e) => setSearchOrderNumber(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && searchOrderByNumber(searchOrderNumber)}
            />
            <Button
              onClick={() => searchOrderByNumber(searchOrderNumber)}
              disabled={searchingOrder || !searchOrderNumber}
              className="gap-2"
            >
              {searchingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : '🔍'}
              Buscar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Pedidos do Customer Menu já pagos vão direto para cozinha. Pedidos "pagar depois" aparecem aqui.
          </p>
        </Card>
        
        <Tabs defaultValue="online" className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="online">
              Pedidos Online/Delivery ({pendingOrders.filter(o => o.delivery_type === 'delivery' || o.delivery_type === 'pickup').length})
            </TabsTrigger>
            <TabsTrigger value="mesa">
              Pedidos de Mesa ({pendingOrders.filter(o => o.delivery_type === 'dine_in').length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="online" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{pendingOrders.filter(order => 
                order.delivery_type === 'delivery' || 
                order.delivery_type === 'pickup' ||
                order.delivery_type === 'counter'
              ).length === 0 ? (
                <Card className="p-8 text-center col-span-full">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum pedido online/delivery pendente</p>
                </Card>
              ) : (
                pendingOrders
                  .filter(order => order.delivery_type === 'delivery' || order.delivery_type === 'pickup' || order.delivery_type === 'counter')
                  .map((order) => (
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
                          <Badge variant="secondary" className="mt-1">
                            {order.delivery_type === 'delivery' && '🚚 Entrega'}
                            {order.delivery_type === 'pickup' && '🏪 Retirada'}
                            {order.delivery_type === 'counter' && '🏪 Balcão'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={
                            order.status === 'ready_for_payment' ? 'default' :
                            order.status === 'ready' ? 'secondary' : 
                            order.status === 'preparing' ? 'outline' : 'outline'
                          } className={order.status === 'ready_for_payment' ? 'bg-green-600 dark:bg-green-700' : ''}>
                            {order.status === 'new' && 'Novo'}
                            {order.status === 'confirmed' && 'Confirmado'}
                            {order.status === 'preparing' && 'Preparando'}
                            {order.status === 'ready' && 'Pronto'}
                            {order.status === 'ready_for_payment' && '💰 Aguardando Pagamento'}
                            {order.status === 'pending_payment' && '💳 Pagar'}
                          </Badge>
                          
                          {/* Badge de origem do pedido */}
                          {order.table_id && order.tables && (
                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                              🏠 Mesa {order.tables.number}
                            </Badge>
                          )}
                          {order.comanda_fixa_id && order.comandas_fixas && (
                            <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                              🎫 Cartão {order.comandas_fixas.numero}
                            </Badge>
                          )}
                          {!order.table_id && !order.comanda_fixa_id && order.delivery_type === 'dine_in' && (
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                              🏪 Balcão
                            </Badge>
                          )}
                        </div>
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
          </TabsContent>

          <TabsContent value="mesa" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingOrders.filter(order => order.delivery_type === 'dine_in').length === 0 ? (
                <Card className="p-8 text-center col-span-full">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum pedido de mesa pendente</p>
                </Card>
              ) : (
                pendingOrders
                  .filter(order => order.delivery_type === 'dine_in')
                  .map((order) => (
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
                          {order.tables && (
                            <Badge variant="outline" className="mt-1">
                              Mesa {order.tables.number}
                            </Badge>
                          )}
                        </div>
                        <Badge variant={
                          order.status === 'ready_for_payment' ? 'default' :
                          order.status === 'ready' ? 'secondary' : 
                          order.status === 'preparing' ? 'outline' : 'outline'
                        } className={order.status === 'ready_for_payment' ? 'bg-green-600' : ''}>
                          {order.status === 'new' && 'Novo'}
                          {order.status === 'confirmed' && 'Confirmado'}
                          {order.status === 'preparing' && 'Preparando'}
                          {order.status === 'ready' && 'Pronto'}
                          {order.status === 'ready_for_payment' && '💰 Aguardando Pagamento'}
                        </Badge>
                        {order.status === 'ready_for_payment' && order.tables && (
                          <Badge variant="outline" className="mt-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                            ✅ Comanda Fechada
                          </Badge>
                        )}
                      </div>

                      {order.customer_name && (
                        <p className="text-sm mb-2">
                          <strong>Cliente:</strong> {order.customer_name}
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
          </TabsContent>
        </Tabs>
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

      {/* Dialog de Customização */}
      <CustomizeItemDialog
        open={customizeDialogOpen}
        onOpenChange={setCustomizeDialogOpen}
        item={selectedItem}
        onAddToCart={addToCart}
      />

      {/* Dialog de Seleção de Gateway de Pagamento */}
      <Dialog open={paymentGatewayDialogOpen} onOpenChange={setPaymentGatewayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecionar Forma de Pagamento</DialogTitle>
            <DialogDescription>
              Como deseja receber o pagamento?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {/* Pagamentos Manuais */}
            <Card className="p-4 cursor-pointer hover:border-primary border-2" onClick={() => processPayment('manual')}>
              <h4 className="font-semibold mb-2">💵 Pagamentos Manuais</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Dinheiro</p>
                <p>• Cartão na maquininha</p>
                <p className="text-xs mt-2">Confirmar manualmente após receber</p>
              </div>
            </Card>

            {/* ✅ FASE 5: PIX via Gateways - Renderizar TODOS os habilitados */}
            {paymentMethod === 'pix' && (
              <div className="space-y-3">
                {restaurantSettings?.mercadopago_enabled && (
                  <Card className="p-4 cursor-pointer hover:border-primary border-2" onClick={() => processPayment('mercadopago')}>
                    <h4 className="font-semibold">💳 PIX - Mercado Pago</h4>
                    <p className="text-xs text-muted-foreground">QR Code gerado automaticamente</p>
                  </Card>
                )}
                {restaurantSettings?.pagseguro_enabled && (
                  <Card className="p-4 cursor-pointer hover:border-primary border-2" onClick={() => processPayment('pagseguro')}>
                    <h4 className="font-semibold">📱 PIX - PagSeguro</h4>
                    <p className="text-xs text-muted-foreground">QR Code gerado automaticamente</p>
                  </Card>
                )}
                {restaurantSettings?.nubank_enabled && (
                  <Card className="p-4 cursor-pointer hover:border-primary border-2" onClick={() => processPayment('nubank')}>
                    <h4 className="font-semibold">💰 PIX - Nubank</h4>
                    <p className="text-xs text-muted-foreground">QR Code gerado automaticamente</p>
                  </Card>
                )}
                {!restaurantSettings?.mercadopago_enabled && 
                 !restaurantSettings?.pagseguro_enabled && 
                 !restaurantSettings?.nubank_enabled && (
                  <div className="text-center text-sm text-muted-foreground p-4">
                    Nenhum gateway PIX configurado.
                    <br/>
                    Configure em Configurações → Integrações de Pagamento
                  </div>
                )}
              </div>
            )}

            {/* Cartão via Gateways */}
            {(paymentMethod === 'credit_card' || paymentMethod === 'debit_card') && (
              <>
                {restaurantSettings?.mercadopago_enabled && (
                  <Card className="p-4 cursor-pointer hover:border-primary border-2" onClick={() => processPayment('mercadopago')}>
                    <h4 className="font-semibold">💳 Mercado Pago</h4>
                    <p className="text-xs text-muted-foreground">Link de pagamento seguro</p>
                  </Card>
                )}
                {restaurantSettings?.rede_enabled && (
                  <Card className="p-4 cursor-pointer hover:border-primary border-2" onClick={() => processPayment('rede')}>
                    <h4 className="font-semibold">💳 Rede</h4>
                    <p className="text-xs text-muted-foreground">Processamento via Rede</p>
                  </Card>
                )}
                {restaurantSettings?.stone_enabled && (
                  <Card className="p-4 cursor-pointer hover:border-primary border-2" onClick={() => processPayment('stone')}>
                    <h4 className="font-semibold">💳 Stone</h4>
                    <p className="text-xs text-muted-foreground">Processamento via Stone</p>
                  </Card>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de QR Code PIX */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar com PIX</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou aguarde confirmação automática
            </DialogDescription>
          </DialogHeader>
          
          {paymentQrCode && (
            <div className="flex flex-col items-center gap-4 p-6">
              <img src={paymentQrCode} alt="QR Code PIX" className="max-w-xs border rounded-lg" />
              
              {pixCopyPaste && (
                <div className="w-full space-y-2">
                  <Label className="text-xs text-muted-foreground">Código PIX Copia e Cola:</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={pixCopyPaste} 
                      readOnly 
                      className="text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(pixCopyPaste);
                        sonnerToast.success('Código PIX copiado!');
                      }}
                    >
                      📋 Copiar
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguardando confirmação do pagamento...
              </div>
              <p className="text-xs text-center text-muted-foreground">
                O pedido será confirmado automaticamente quando o pagamento for aprovado
              </p>
              <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          )}

          {processingPayment && (
            <div className="flex flex-col items-center gap-4 p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Processando pagamento...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
