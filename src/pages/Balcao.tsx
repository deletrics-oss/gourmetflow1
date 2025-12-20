import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShoppingCart, Plus, Minus, Trash2, DollarSign, Maximize, Bike, CheckCircle, Loader2, AlertTriangle, Gift, Scale, Search, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { generatePrintReceipt } from "@/components/PrintReceipt";
import { toast as sonnerToast } from "sonner";
import { CustomizeItemDialog } from "@/components/dialogs/CustomizeItemDialog";
import { WeightInputDialog } from "@/components/dialogs/WeightInputDialog";
import { useWhatsApp } from "@/hooks/useWhatsApp";
import { useRestaurant } from "@/hooks/useRestaurant";
import { CustomerAddressForm } from "@/components/delivery/CustomerAddressForm";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";
import { logActionWithContext } from "@/lib/logging";
import { validateCustomerData, sanitizeInput } from "@/lib/validation";
import { useNavigate } from "react-router-dom";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: any[];
  finalPrice?: number;
  customizationsText?: string;
  weight?: number;
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
  sale_type?: string;
  price_per_kg?: number;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryType, setDeliveryType] = useState<"retirada" | "entrega">("retirada");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit_card" | "debit_card" | "pix">("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [isSuspicious, setIsSuspicious] = useState(false);

  // ✅ FASE 3: Estados para uso de pontos de fidelidade
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [restaurantName, setRestaurantName] = useState("Restaurante");
  const [printOnClose, setPrintOnClose] = useState(true);
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [loyaltyPointsPerReal, setLoyaltyPointsPerReal] = useState(1);
  const [loyaltyRedemptionValue, setLoyaltyRedemptionValue] = useState(0.01);
  const [motoboys, setMotoboys] = useState<any[]>([]);
  const [selectedMotoboy, setSelectedMotoboy] = useState<string>("none");
  const [notifyingMotoboy, setNotifyingMotoboy] = useState(false);
  const [isFinalizingSale, setIsFinalizingSale] = useState(false);
  const [customerAddress, setCustomerAddress] = useState({
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipcode: "",
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);
  // Weight dialog state
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [weightItem, setWeightItem] = useState<MenuItem | null>(null);
  // NFC-e settings
  const [nfceEnabled, setNfceEnabled] = useState(false);
  const [nfceSettings, setNfceSettings] = useState<any>(null);
  const { toast } = useToast();
  const { sendMessage } = useWhatsApp();
  const { restaurant } = useRestaurant();
  const { calculateFromAddress, loading: deliveryLoading } = useDeliveryFee();
  const navigate = useNavigate();

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

          // Carregar endereço salvo do cliente
          if (customer.address) {
            const addr = customer.address as any;
            setCustomerAddress({
              street: addr.street || '',
              number: addr.number || '',
              complement: addr.complement || '',
              neighborhood: addr.neighborhood || '',
              city: addr.city || '',
              state: addr.state || '',
              zipcode: addr.zipcode || '',
              latitude: addr.latitude,
              longitude: addr.longitude,
            });
          }

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

  // Calcular taxa automaticamente quando entrega for selecionada
  useEffect(() => {
    const autoCalculateFee = async () => {
      // SEMPRE zerar taxa para retirada
      if (deliveryType === 'retirada') {
        setDeliveryFee(0);
        setDeliveryDistance(null);
        return;
      }

      // Calcular APENAS para entrega com endereço completo
      if (deliveryType === 'entrega' && customerAddress.street && customerAddress.number) {
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
      }
    };
    autoCalculateFee();
  }, [customerAddress.street, customerAddress.number, customerAddress.city, deliveryType]);

  useEffect(() => {
    loadCategories();
    loadMenuItems();
    loadRestaurantSettings();
    loadMotoboys();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
    if (data) setCategories(data);
  };

  const loadMenuItems = async () => {
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .order("sort_order");
    if (data) setMenuItems(data);
  };

  const loadRestaurantSettings = async () => {
    const { data } = await supabase.from("restaurant_settings").select("*").single();
    if (data) {
      setRestaurantName(data.name || "Restaurante");
      setLoyaltyEnabled(data.loyalty_enabled || false);
      setLoyaltyPointsPerReal(data.loyalty_points_per_real || 1);
      setLoyaltyRedemptionValue(data.loyalty_redemption_value || 0.01);
    }

    // Load NFC-e settings
    const { data: nfceData } = await supabase
      .from("nfce_settings")
      .select("*")
      .maybeSingle();

    if (nfceData && nfceData.is_active) {
      setNfceEnabled(true);
      setNfceSettings(nfceData);
    }
  };

  const loadMotoboys = async () => {
    const { data } = await supabase
      .from("motoboys")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (data) setMotoboys(data);
  };

  const handleAddToCart = async (item: MenuItem) => {
    // Check if item is sold by weight
    if (item.sale_type === 'weight' && item.price_per_kg) {
      setWeightItem(item);
      setWeightDialogOpen(true);
      return;
    }

    const { data: variations } = await supabase
      .from("item_variations")
      .select("*")
      .eq("menu_item_id", item.id)
      .eq("is_active", true);

    if (variations && variations.length > 0) {
      setSelectedItem(item);
      setCustomizeDialogOpen(true);
    } else {
      addToCart(item);
    }
  };

  const handleWeightConfirm = (weight: number, totalPrice: number) => {
    if (!weightItem) return;

    setCart([...cart, {
      id: weightItem.id,
      name: weightItem.name,
      price: totalPrice,
      quantity: 1,
      finalPrice: totalPrice,
      customizationsText: `${weight.toFixed(3)} kg`,
      weight: weight
    }]);

    setWeightItem(null);
  };

  const addToCart = (item: MenuItem, customizations?: any[]) => {
    let finalPrice = item.promotional_price || item.price;
    let customizationsText = '';

    if (customizations && customizations.length > 0) {
      const customizationPrice = customizations.reduce((sum, c) => sum + (c.price_adjustment || 0), 0);
      finalPrice += customizationPrice;
      customizationsText = customizations.map(c => c.name).join(', ');
    }

    const existingIndex = cart.findIndex(
      c => c.id === item.id && c.customizationsText === customizationsText
    );

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity++;
      setCart(updated);
    } else {
      setCart([...cart, {
        id: item.id,
        name: item.name,
        price: item.promotional_price || item.price,
        quantity: 1,
        customizations,
        finalPrice,
        customizationsText
      }]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...cart];
    updated[index].quantity += delta;
    if (updated[index].quantity <= 0) {
      updated.splice(index, 1);
    }
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Calcular subtotal e total ANTES de usar em outras funções
  const subtotal = cart.reduce((sum, item) => sum + (item.finalPrice || item.price) * item.quantity, 0);

  // ✅ FASE 3: Calcular desconto por pontos
  useEffect(() => {
    if (usePoints && pointsToUse > 0 && loyaltyRedemptionValue > 0) {
      const discount = pointsToUse * loyaltyRedemptionValue;
      setPointsDiscount(Math.min(discount, subtotal)); // Não pode ser maior que subtotal
    } else {
      setPointsDiscount(0);
    }
  }, [usePoints, pointsToUse, loyaltyRedemptionValue, subtotal]);

  const total = subtotal + deliveryFee - pointsDiscount;

  // Cálculo de pontos em tempo real
  const calculatePointsToEarn = () => {
    if (!loyaltyEnabled || !customerCpf) return 0;
    return Math.floor(total * loyaltyPointsPerReal);
  };

  const pointsToEarn = calculatePointsToEarn();
  const newBalance = loyaltyPoints + pointsToEarn;

  const notifyMotoboy = async (orderId: string, orderNumber: string, orderTotal: number) => {
    if (!selectedMotoboy || selectedMotoboy === "none") return;

    setNotifyingMotoboy(true);

    try {
      const { data: motoboy } = await supabase
        .from("motoboys")
        .select("*")
        .eq("id", selectedMotoboy)
        .single();

      if (!motoboy || !motoboy.phone) {
        sonnerToast.error("Motoboy sem telefone cadastrado");
        return;
      }

      const message =
        `🛵 *NOVA ENTREGA DISPONÍVEL*\n\n` +
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
      console.error("Erro ao notificar motoboy:", error);
      sonnerToast.error("Erro ao notificar motoboy");
    } finally {
      setNotifyingMotoboy(false);
    }
  };

  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      toast({ title: "Erro", description: "Carrinho vazio", variant: "destructive" });
      return;
    }

    if (!customerName || !customerPhone) {
      toast({ title: "Erro", description: "Preencha nome e telefone do cliente", variant: "destructive" });
      return;
    }

    // Security: Validate and sanitize customer inputs
    const sanitizedName = sanitizeInput(customerName);
    const sanitizedPhone = sanitizeInput(customerPhone);
    const sanitizedCpf = sanitizeInput(customerCpf);

    const validation = validateCustomerData({
      name: sanitizedName,
      phone: sanitizedPhone,
      cpf: sanitizedCpf || undefined
    });

    if (!validation.valid) {
      toast({
        title: "Dados inválidos",
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }

    setIsFinalizingSale(true);

    try {
      const orderNumber = `BAL-${Date.now()}`;

      // Criar/atualizar cliente automaticamente
      let finalCustomerId = customerId;

      if (customerPhone) {
        if (customerId) {
          // Atualizar cliente existente se nome ou CPF mudaram
          const { data: existing } = await supabase
            .from('customers')
            .select('name, cpf')
            .eq('id', customerId)
            .single();

          if (existing && (existing.name !== customerName || existing.cpf !== customerCpf)) {
            await supabase
              .from('customers')
              .update({
                name: customerName,
                cpf: customerCpf || null,
                address: {
                  ...customerAddress,
                  latitude: customerAddress.latitude,
                  longitude: customerAddress.longitude,
                }
              })
              .eq('id', customerId);
          }
        } else {
          // Criar novo cliente
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert({
              name: customerName,
              phone: customerPhone,
              cpf: customerCpf || null,
              loyalty_points: 0,
              address: {
                ...customerAddress,
                latitude: customerAddress.latitude,
                longitude: customerAddress.longitude,
              }
            })
            .select('id')
            .single();

          if (newCustomer) {
            finalCustomerId = newCustomer.id;
            sonnerToast.success('✅ Novo cliente cadastrado!');
          }
        }
      }

      // Buscar restaurant_id do usuário
      const { data: userRestaurant } = await supabase
        .from('user_restaurants')
        .select('restaurant_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('is_active', true)
        .maybeSingle();

      const restaurantId = userRestaurant?.restaurant_id || restaurant?.id;

      // Status: pedidos de balcão com pagamento agora vão como 'new' para aparecerem em pendentes
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_cpf: customerCpf || null,
          customer_id: finalCustomerId,
          delivery_type: deliveryType === 'entrega' ? "delivery" : "pickup",
          delivery_address: deliveryType === 'entrega' && customerAddress.street ? customerAddress : null,
          delivery_fee: deliveryFee || 0,
          payment_method: 'pending',
          motoboy_id: selectedMotoboy && selectedMotoboy !== "none" ? selectedMotoboy : null,
          status: "new",
          subtotal: subtotal,
          total: total,
          restaurant_id: restaurantId
        })
        .select()
        .single();

      if (orderError) throw orderError;

      for (const item of cart) {
        await supabase.from("order_items").insert({
          order_id: order.id,
          menu_item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.finalPrice || item.price,
          total_price: (item.finalPrice || item.price) * item.quantity,
          notes: item.customizationsText || null
        });
      }

      // ✅ FASE 3: Registrar uso de pontos primeiro
      if (usePoints && pointsToUse > 0 && finalCustomerId) {
        await supabase
          .from('customers')
          .update({
            loyalty_points: loyaltyPoints - pointsToUse
          })
          .eq('id', finalCustomerId);

        await supabase
          .from('loyalty_transactions')
          .insert({
            customer_id: finalCustomerId,
            order_id: order.id,
            points: -pointsToUse,
            type: 'redeem',
            description: `Desconto no pedido ${orderNumber}`
          });
      }

      // Atualizar pontos de fidelidade (ganhos)
      if (loyaltyEnabled && customerCpf && finalCustomerId) {
        const pointsEarned = Math.floor(total * loyaltyPointsPerReal);

        // Buscar pontos atuais
        const { data: currentCustomer } = await supabase
          .from('customers')
          .select('loyalty_points')
          .eq('id', finalCustomerId)
          .single();

        const currentPoints = currentCustomer?.loyalty_points || 0;

        await supabase
          .from('customers')
          .update({
            loyalty_points: currentPoints + pointsEarned
          })
          .eq('id', finalCustomerId);

        await supabase
          .from('loyalty_transactions')
          .insert({
            customer_id: finalCustomerId,
            order_id: order.id,
            points: pointsEarned,
            type: 'earn',
            description: `Compra no balcão - Pedido ${orderNumber}`
          });
      }

      // NÃO registrar movimento de caixa agora - será feito quando pagar no PDV

      // ✅ FASE 2: Log de venda criada
      await logActionWithContext(
        'sale_created',
        'orders',
        order.id,
        {
          order_number: orderNumber,
          customer_name: customerName || 'Anônimo',
          total: total,
          items_count: cart.length,
          delivery_type: deliveryType,
          source: 'balcao'
        }
      );

      // ✅ Emissão automática de NFC-e se ativado
      let nfceData = null;
      if (nfceEnabled && nfceSettings) {
        try {
          const { data: nfceResult, error: nfceError } = await supabase.functions.invoke('emit-nfce', {
            body: {
              orderId: order.id,
              restaurantId: restaurantId,
              items: cart.map(item => ({
                nome: item.name,
                quantidade: item.quantity,
                valor_unitario: item.finalPrice || item.price,
                ncm: '21069090', // Código genérico para alimentos
                cfop: '5102'
              })),
              total: total,
              formaPagamento: paymentMethod === 'pix' ? '17' : paymentMethod === 'credit_card' ? '03' : paymentMethod === 'debit_card' ? '04' : '01',
              cpfCliente: customerCpf || null,
              nomeCliente: customerName || null
            }
          });

          if (nfceError) {
            console.error('Erro ao emitir NFC-e:', nfceError);
            sonnerToast.warning('Nota fiscal não emitida: ' + (nfceError.message || 'Erro desconhecido'));
          } else if (nfceResult?.success) {
            nfceData = {
              numero: nfceResult.numero,
              serie: nfceResult.serie,
              chave_acesso: nfceResult.chave_acesso,
              qrcode_url: nfceResult.qrcode_url,
              protocol: nfceResult.protocol
            };
            sonnerToast.success(`✅ NFC-e ${nfceResult.numero} emitida!`);
          }
        } catch (nfceErr) {
          console.error('Erro na emissão NFC-e:', nfceErr);
        }
      }

      if (printOnClose) {
        try {
          const orderForPrint = {
            order_number: orderNumber,
            created_at: new Date().toISOString(),
            delivery_type: 'pickup',
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_cpf: customerCpf,
            subtotal: subtotal,
            total: total,
            payment_method: paymentMethod,
            order_items: cart.map(item => ({
              name: item.name,
              quantity: item.quantity,
              unit_price: item.finalPrice || item.price,
              total_price: (item.finalPrice || item.price) * item.quantity,
              notes: item.customizationsText
            })),
            nfce_data: nfceData
          };
          generatePrintReceipt(orderForPrint, restaurantName, undefined, 'customer');
        } catch (printError) {
          console.log('Print error (non-critical):', printError);
        }
      }

      sonnerToast.success(`✅ Pedido ${orderNumber} criado! Pagar no PDV.`, {
        description: `Total: R$ ${total.toFixed(2)}`
      });

      // Notificar motoboy apenas se foi pago diretamente (não deve acontecer agora)
      // if (selectedMotoboy && selectedMotoboy !== "none") {
      //   setTimeout(() => {
      //     notifyMotoboy(order.id, orderNumber, total);
      //   }, 500);
      // }

      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerCpf('');
      setCustomerId(null);
      setLoyaltyPoints(0);
      setIsSuspicious(false);
      setSelectedMotoboy('none');
      setDeliveryType('retirada');
      setCustomerAddress({
        street: "", number: "", complement: "",
        neighborhood: "", city: "", state: "", zipcode: "",
        latitude: undefined, longitude: undefined,
      });
      setDeliveryFee(0);
      setDeliveryDistance(null);

    } catch (error: any) {
      console.error('Erro ao finalizar venda:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao finalizar venda',
        variant: 'destructive'
      });
    } finally {
      setIsFinalizingSale(false);
    }
  };

  const filteredItems = menuItems
    .filter(item => selectedCategory === "all" || item.category_id === selectedCategory)
    .filter(item => searchQuery === "" || item.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Balcão</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/balcao-externo')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir Balcão Externo
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Cardápio</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                  <TabsList className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    {categories.map(cat => (
                      <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
                    ))}
                  </TabsList>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {filteredItems.map(item => (
                      <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          {item.image_url && (
                            <div className="w-full h-32 mb-3 overflow-hidden rounded-md">
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold">{item.name}</h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                              )}
                            </div>
                            <div className="text-right ml-2">
                              <p className="font-bold text-primary">
                                R$ {(item.promotional_price || item.price).toFixed(2)}
                              </p>
                              {item.promotional_price && (
                                <p className="text-xs text-muted-foreground line-through">
                                  R$ {item.price.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleAddToCart(item)}
                            className="w-full mt-2"
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrinho ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cart.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.customizationsText && (
                          <p className="text-xs text-muted-foreground">{item.customizationsText}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          R$ {(item.finalPrice || item.price).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateQuantity(index, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button size="sm" variant="outline" onClick={() => updateQuantity(index, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => removeFromCart(index)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-4">
                  {/* Telefone - Campo principal para busca */}
                  <div>
                    <Label htmlFor="customerPhone">Telefone *</Label>
                    <div className="relative">
                      <Input
                        id="customerPhone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        required
                      />
                      {searchingCustomer && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Alerta de Cliente Suspeito */}
                  {isSuspicious && (
                    <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                      <div className="flex-1 text-sm">
                        <p className="font-semibold text-destructive">Cliente Suspeito</p>
                        <p className="text-muted-foreground text-xs">Verificar histórico antes de prosseguir</p>
                      </div>
                    </div>
                  )}

                  {/* Nome - Preenchido automaticamente se cliente existe */}
                  <div>
                    <Label htmlFor="customerName">Nome do Cliente *</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Digite o nome"
                      required
                      disabled={!!customerId}
                    />
                    {customerId && (
                      <p className="text-xs text-muted-foreground mt-1">Cliente cadastrado</p>
                    )}
                  </div>

                  {/* CPF - Opcional mas necessário para cashback */}
                  <div>
                    <Label htmlFor="customerCpf">CPF {loyaltyEnabled && '(necessário para cashback)'}</Label>
                    <Input
                      id="customerCpf"
                      value={customerCpf}
                      onChange={(e) => setCustomerCpf(e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>

                  {/* Painel de Cashback em Tempo Real */}
                  {loyaltyEnabled && customerCpf && (
                    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Gift className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold text-sm">Cashback desta Venda</h4>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Pontos atuais:</span>
                            <span className="font-medium">{loyaltyPoints.toLocaleString('pt-BR')}</span>
                          </div>

                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Vai ganhar:</span>
                            <span className="font-semibold text-primary">+{pointsToEarn.toLocaleString('pt-BR')}</span>
                          </div>

                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between">
                              <span className="text-sm font-semibold">Novo saldo:</span>
                              <span className="font-bold text-primary">{newBalance.toLocaleString('pt-BR')} pts</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              = R$ {(newBalance * loyaltyRedemptionValue).toFixed(2)} em desconto
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Seletor de Tipo de Entrega */}
                <div className="border-t pt-4">
                  <Label>Tipo de Venda</Label>
                  <RadioGroup value={deliveryType} onValueChange={(v: any) => setDeliveryType(v)} className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="retirada" id="retirada" />
                      <Label htmlFor="retirada" className="cursor-pointer">
                        🏪 Retirada no Balcão (Taxa R$ 0,00)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="entrega" id="entrega" />
                      <Label htmlFor="entrega" className="cursor-pointer">
                        🚚 Entrega (Taxa calculada automaticamente)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Formulário de Endereço de Entrega - APENAS se for entrega */}
                {deliveryType === 'entrega' && (
                  <div className="border-t pt-4">
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
                            longitude: coords.longitude,
                          }));
                        }
                      }}
                    />
                    {deliveryLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Calculando taxa de entrega...
                      </div>
                    )}
                    {deliveryDistance && (
                      <Badge variant="secondary" className="text-sm mt-2">
                        📍 {deliveryDistance.toFixed(2)}km | Taxa: R$ {deliveryFee.toFixed(2)}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="border-t pt-4 space-y-4">
                  {/* ✅ FASE 3: Seção de Fidelidade */}
                  {loyaltyEnabled && customerId && loyaltyPoints > 0 && (
                    <Card className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Gift className="h-5 w-5 text-yellow-600" />
                          <div>
                            <p className="font-semibold text-sm">Você tem {loyaltyPoints} pontos!</p>
                            <p className="text-xs text-muted-foreground">
                              Cada ponto vale R$ {loyaltyRedemptionValue.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <Checkbox
                          checked={usePoints}
                          onCheckedChange={(checked) => {
                            setUsePoints(!!checked);
                            if (!checked) {
                              setPointsToUse(0);
                              setPointsDiscount(0);
                            }
                          }}
                        />
                      </div>

                      {usePoints && (
                        <div className="space-y-2">
                          <Label>Quantos pontos usar?</Label>
                          <Input
                            type="number"
                            min={0}
                            max={loyaltyPoints}
                            value={pointsToUse}
                            onChange={(e) => setPointsToUse(Math.min(Number(e.target.value), loyaltyPoints))}
                          />
                          <p className="text-sm text-green-600 font-semibold">
                            Desconto: -R$ {pointsDiscount.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Motoboy */}
                  <div>
                    <Label htmlFor="motoboy">Motoboy (Opcional)</Label>
                    <Select value={selectedMotoboy} onValueChange={setSelectedMotoboy}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o motoboy..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {motoboys.map(motoboy => (
                          <SelectItem key={motoboy.id} value={motoboy.id}>
                            {motoboy.name} - {motoboy.phone}
                          </SelectItem>
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
                    <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
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

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="printReceipt"
                      checked={printOnClose}
                      onCheckedChange={(checked) => setPrintOnClose(checked === true)}
                    />
                    <Label htmlFor="printReceipt" className="text-sm cursor-pointer">
                      Imprimir recibo
                    </Label>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  {selectedMotoboy && selectedMotoboy !== "none" && (
                    <div className="flex items-center justify-between py-2 mb-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Bike className="h-4 w-4" />
                        Motoboy
                      </span>
                      <span className="font-medium text-sm">
                        {motoboys.find(m => m.id === selectedMotoboy)?.name}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
                  </div>
                  {deliveryFee > 0 && (
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Taxa de Entrega:</span>
                      <span className="font-medium">R$ {deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={handleFinalizeSale}
                  className="w-full"
                  size="lg"
                  disabled={isFinalizingSale || cart.length === 0}
                >
                  {isFinalizingSale ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Finalizar Venda
                    </>
                  )}
                </Button>
              </CardContent>
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

      <WeightInputDialog
        open={weightDialogOpen}
        onOpenChange={setWeightDialogOpen}
        productName={weightItem?.name || ''}
        pricePerKg={weightItem?.price_per_kg || 0}
        onConfirm={handleWeightConfirm}
      />
    </div>
  );
}
