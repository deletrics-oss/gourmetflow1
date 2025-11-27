import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ShoppingCart, Plus, Minus, Trash2, DollarSign, Maximize, Bike, CheckCircle, Loader2, AlertTriangle, Gift, ArrowLeft } from "lucide-react";
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
import { CustomerAddressForm } from "@/components/delivery/CustomerAddressForm";
import { useDeliveryFee } from "@/hooks/useDeliveryFee";
import { logActionWithContext } from "@/lib/logging";
import { useNavigate } from "react-router-dom";

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

export default function BalcaoExterno() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deliveryType, setDeliveryType] = useState<"retirada" | "entrega">("retirada");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit_card" | "debit_card" | "pix">("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [isSuspicious, setIsSuspicious] = useState(false);
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
  const { toast } = useToast();
  const { sendMessage } = useWhatsApp();
  const { restaurant } = useRestaurant();
  const { calculateFromAddress, loading: deliveryLoading } = useDeliveryFee();

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

  useEffect(() => {
    const autoCalculateFee = async () => {
      if (deliveryType === 'retirada') {
        setDeliveryFee(0);
        setDeliveryDistance(null);
        return;
      }

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

  const subtotal = cart.reduce((sum, item) => sum + (item.finalPrice || item.price) * item.quantity, 0);
  
  useEffect(() => {
    if (usePoints && pointsToUse > 0 && loyaltyRedemptionValue > 0) {
      const discount = pointsToUse * loyaltyRedemptionValue;
      setPointsDiscount(Math.min(discount, subtotal));
    } else {
      setPointsDiscount(0);
    }
  }, [usePoints, pointsToUse, loyaltyRedemptionValue, subtotal]);
  
  const total = subtotal + deliveryFee - pointsDiscount;

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

    setIsFinalizingSale(true);

    try {
      const orderNumber = `BAL-${Date.now()}`;

      let finalCustomerId = customerId;
      
      if (customerPhone) {
        if (customerId) {
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
          total: total
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
      
      if (loyaltyEnabled && customerCpf && finalCustomerId) {
        const pointsEarned = Math.floor(total * loyaltyPointsPerReal);
        
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
            description: `Compra no pedido ${orderNumber}`
          });
      }

      await logActionWithContext(
        'complete_order',
        'orders',
        order.id,
        {
          order_number: orderNumber,
          total: total,
          delivery_type: deliveryType,
          payment_method: paymentMethod
        },
        restaurant?.id || null
      );

      if (deliveryType === 'entrega' && selectedMotoboy !== 'none') {
        await notifyMotoboy(order.id, orderNumber, total);
      }

      if (printOnClose) {
        try {
          const orderForPrint = {
            order_number: orderNumber,
            created_at: new Date().toISOString(),
            delivery_type: deliveryType === 'entrega' ? 'delivery' : 'pickup',
            customer_name: customerName,
            customer_phone: customerPhone,
            subtotal: subtotal,
            total: total,
            payment_method: paymentMethod,
            order_items: cart.map(item => ({
              name: item.name,
              quantity: item.quantity,
              unit_price: item.finalPrice || item.price,
              total_price: (item.finalPrice || item.price) * item.quantity,
              notes: item.customizationsText
            }))
          };
          generatePrintReceipt(orderForPrint, restaurantName, undefined, 'customer');
        } catch (printError) {
          console.error('Erro ao imprimir:', printError);
        }
      }

      sonnerToast.success('✅ Venda finalizada!', {
        description: `Pedido ${orderNumber} registrado com sucesso`
      });

      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerCpf("");
      setCustomerId(null);
      setLoyaltyPoints(0);
      setUsePoints(false);
      setPointsToUse(0);
      setSelectedMotoboy("none");
      setCustomerAddress({
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zipcode: "",
        latitude: undefined,
        longitude: undefined,
      });

    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      sonnerToast.error("Erro ao finalizar venda");
    } finally {
      setIsFinalizingSale(false);
    }
  };

  const filteredItems = menuItems.filter(item => 
    selectedCategory === "all" || item.category_id === selectedCategory
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <div className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{restaurantName}</h1>
              <p className="text-sm opacity-90">Balcão de Vendas</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            Voltar ao Painel
          </Button>
        </div>
      </div>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu - 2 colunas */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Maximize className="h-5 w-5" />
                  Cardápio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                  <TabsList className="w-full flex-wrap h-auto">
                    <TabsTrigger value="all" className="flex-1">Todos</TabsTrigger>
                    {categories.map(cat => (
                      <TabsTrigger key={cat.id} value={cat.id} className="flex-1">
                        {cat.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 max-h-[600px] overflow-y-auto">
                  {filteredItems.map(item => (
                    <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-3">
                        {item.image_url && (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-24 object-cover rounded mb-2"
                          />
                        )}
                        <h4 className="font-semibold text-sm mb-1">{item.name}</h4>
                        <div className="flex items-center justify-between">
                          <div>
                            {item.promotional_price ? (
                              <>
                                <p className="text-xs text-muted-foreground line-through">
                                  R$ {item.price.toFixed(2)}
                                </p>
                                <p className="text-sm font-bold text-primary">
                                  R$ {item.promotional_price.toFixed(2)}
                                </p>
                              </>
                            ) : (
                              <p className="text-sm font-bold">R$ {item.price.toFixed(2)}</p>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleAddToCart(item)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Carrinho - 1 coluna */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrinho ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Carrinho vazio</p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {cart.map((item, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{item.name}</p>
                              {item.customizationsText && (
                                <p className="text-xs text-muted-foreground">{item.customizationsText}</p>
                              )}
                              <p className="text-sm text-primary font-bold">
                                R$ {((item.finalPrice || item.price) * item.quantity).toFixed(2)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(index)}
                              className="h-6 w-6"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(index, -1)}
                              className="h-8 w-8"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-semibold w-8 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(index, 1)}
                              className="h-8 w-8"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>R$ {subtotal.toFixed(2)}</span>
                      </div>
                      {deliveryFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Taxa de entrega:</span>
                          <span>R$ {deliveryFee.toFixed(2)}</span>
                        </div>
                      )}
                      {pointsDiscount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Desconto (pontos):</span>
                          <span>- R$ {pointsDiscount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>R$ {total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <div>
                        <Label>Nome do Cliente *</Label>
                        <Input
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Nome completo"
                        />
                      </div>
                      <div>
                        <Label>Telefone *</Label>
                        <Input
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="(00) 00000-0000"
                        />
                        {searchingCustomer && (
                          <p className="text-xs text-muted-foreground mt-1">Buscando...</p>
                        )}
                      </div>
                      {customerId && (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            <Gift className="h-3 w-3 mr-1" />
                            {loyaltyPoints} pontos
                          </Badge>
                          {isSuspicious && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Suspeito
                            </Badge>
                          )}
                        </div>
                      )}
                      <div>
                        <Label>CPF (opcional)</Label>
                        <Input
                          value={customerCpf}
                          onChange={(e) => setCustomerCpf(e.target.value)}
                          placeholder="000.000.000-00"
                        />
                      </div>

                      <div>
                        <Label>Tipo de Venda</Label>
                        <RadioGroup value={deliveryType} onValueChange={(v: any) => setDeliveryType(v)}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="retirada" id="retirada" />
                            <Label htmlFor="retirada">Retirada</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="entrega" id="entrega" />
                            <Label htmlFor="entrega">Entrega</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {deliveryType === 'entrega' && (
                        <>
                          <CustomerAddressForm
                            address={customerAddress}
                            onAddressChange={setCustomerAddress}
                            onDeliveryFeeChange={(fee, distance) => {
                              setDeliveryFee(fee);
                              setDeliveryDistance(distance);
                            }}
                          />
                          <div>
                            <Label>Motoboy</Label>
                            <Select value={selectedMotoboy} onValueChange={setSelectedMotoboy}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecionar motoboy" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                {motoboys.map(m => (
                                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {loyaltyEnabled && customerId && loyaltyPoints > 0 && (
                        <div className="border rounded p-3 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="usePoints"
                              checked={usePoints}
                              onCheckedChange={(checked) => setUsePoints(checked as boolean)}
                            />
                            <Label htmlFor="usePoints">
                              Usar pontos ({loyaltyPoints} disponíveis)
                            </Label>
                          </div>
                          {usePoints && (
                            <Input
                              type="number"
                              value={pointsToUse}
                              onChange={(e) => setPointsToUse(Math.min(Number(e.target.value), loyaltyPoints))}
                              max={loyaltyPoints}
                              placeholder="Quantos pontos usar?"
                            />
                          )}
                        </div>
                      )}

                      <Button 
                        onClick={handleFinalizeSale}
                        disabled={isFinalizingSale || notifyingMotoboy}
                        className="w-full"
                        size="lg"
                      >
                        {isFinalizingSale ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Finalizando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Finalizar Venda
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
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
    </div>
  );
}
