import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus, ShoppingCart, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function TableCustomerMenu() {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table');
  const [table, setTable] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (tableId) {
      loadData();
    }
  }, [tableId]);

  const loadData = async () => {
    try {
      // Load table info
      const { data: tableData } = await supabase
        .from('tables')
        .select('*')
        .eq('id', tableId)
        .single();

      setTable(tableData);

      // Load active order for this table
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('table_id', tableId)
        .in('status', ['new', 'confirmed', 'preparing'])
        .single();

      setOrder(orderData);

      // Load menu items
      const { data: items } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('sort_order');

      setMenuItems(items || []);

      // Load categories
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      setCategories(cats || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar cardápio');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        id: item.id,
        name: item.name,
        price: item.promotional_price || item.price,
        quantity: 1
      }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const handleFinishOrder = async () => {
    if (cart.length === 0) {
      toast.error('Adicione itens ao carrinho');
      return;
    }

    try {
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const orderNumber = `M${table?.number}-${Date.now().toString().slice(-4)}`;

      console.log('🛒 Mesa - Criando pedido:', {
        orderNumber,
        tableId,
        cart,
        total
      });

      if (order) {
        // Update existing order
        console.log('📝 Adicionando itens ao pedido existente:', order.id);
        
        const orderItems = cart.map(item => ({
          order_id: order.id,
          menu_item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        
        if (itemsError) {
          console.error('❌ Erro ao inserir itens:', itemsError);
          throw itemsError;
        }

        console.log('✅ Itens adicionados com sucesso!');

        const { data: allItems } = await supabase
          .from('order_items')
          .select('total_price')
          .eq('order_id', order.id);

        const newTotal = (allItems || []).reduce((sum: number, i: any) => sum + i.total_price, 0);

        await supabase
          .from('orders')
          .update({
            total: newTotal,
            subtotal: newTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        console.log('✅ Total atualizado:', newTotal);
      } else {
        // Create new order
        console.log('🆕 Criando novo pedido para mesa');
        
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert([{
            order_number: orderNumber,
            table_id: tableId,
            delivery_type: 'dine_in' as const,
            status: 'new' as const,
            total: total,
            subtotal: total,
          }])
          .select()
          .single();

        if (orderError) {
          console.error('❌ Erro ao criar pedido:', orderError);
          throw orderError;
        }

        console.log('✅ Pedido criado:', newOrder);

        const orderItems = cart.map(item => ({
          order_id: newOrder.id,
          menu_item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        }));

        console.log('📦 Inserindo itens:', orderItems);

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
        
        if (itemsError) {
          console.error('❌ Erro ao inserir itens:', itemsError);
          throw itemsError;
        }

        console.log('✅ Itens inseridos com sucesso!');

        await supabase
          .from('tables')
          .update({ status: 'occupied' })
          .eq('id', tableId);
      }

      toast.success('Pedido enviado com sucesso!');
      setCart([]);
      loadData();
    } catch (error) {
      console.error('❌ Erro geral ao finalizar pedido:', error);
      toast.error('Erro ao enviar pedido. Tente novamente.');
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tableId || !table) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Mesa não encontrada</h2>
          <p className="text-muted-foreground">Escaneie o QR Code da mesa para fazer seu pedido</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground px-6 py-4">
        <h1 className="text-2xl font-bold">Mesa {table.number}</h1>
        <p className="text-sm opacity-90">Faça seu pedido</p>
      </div>

      <div className="flex gap-6 p-6 max-w-7xl mx-auto">
        {/* Menu Items */}
        <div className="flex-1">
          <Input
            placeholder="Buscar item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              {categories.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Card key={item.id} className="p-4 hover:shadow-lg transition-shadow">
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-40 object-cover rounded-md mb-3"
                  />
                )}
                <h4 className="font-semibold mb-1">{item.name}</h4>
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                )}
                <div className="flex justify-between items-center">
                  {item.promotional_price ? (
                    <div>
                      <span className="font-bold text-green-600">
                        R$ {item.promotional_price.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground line-through ml-2">
                        R$ {item.price.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <span className="font-bold">R$ {item.price.toFixed(2)}</span>
                  )}
                  <Button size="sm" onClick={() => addToCart(item)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="w-96 sticky top-6 h-fit">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5" />
              <h3 className="font-semibold">Seu Pedido</h3>
            </div>

            <div className="space-y-3 mb-4 max-h-96 overflow-auto">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Nenhum item adicionado
                </p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="border-b pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          R$ {item.price.toFixed(2)} x {item.quantity}
                        </p>
                      </div>
                      <p className="font-bold">
                        R$ {(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold">R$ {totalAmount.toFixed(2)}</span>
              </div>
              <Button
                className="w-full"
                onClick={handleFinishOrder}
                disabled={cart.length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Enviar Pedido
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
