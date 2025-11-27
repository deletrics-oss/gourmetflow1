import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  ShoppingCart, 
  Plus, 
  Minus,
  Send,
  X,
  UtensilsCrossed
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomizeItemDialog } from '@/components/dialogs/CustomizeItemDialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

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
      const [categoriesRes, itemsRes, settingsRes, tableRes, orderRes] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('menu_items').select('*').eq('is_available', true).order('sort_order'),
        supabase.from('restaurant_settings').select('*').single(),
        supabase.from('tables').select('*').eq('id', tableId).single(),
        supabase.from('orders').select('*').eq('table_id', tableId).in('status', ['new', 'preparing']).maybeSingle()
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (itemsRes.data) setMenuItems(itemsRes.data);
      if (settingsRes.data) {
        setRestaurantSettings(settingsRes.data);
        setUseFullFlow(settingsRes.data.tablet_full_flow || false);
      }
      if (tableRes.data) setTable(tableRes.data);
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

  const handleFinishOrder = async () => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header fixo */}
      <div className="bg-primary text-primary-foreground shadow-xl sticky top-0 z-50">
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
              onClick={handleFinishOrder}
              disabled={cart.length === 0}
            >
              <Send className="h-6 w-6" />
              Enviar Pedido ({cart.length})
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
                    onClick={handleFinishOrder}
                    className="w-full h-16 text-xl"
                    size="lg"
                  >
                    <Send className="h-6 w-6 mr-2" />
                    Enviar para Cozinha
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
