import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus, ArrowLeft, ShoppingCart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { logActionWithContext } from "@/lib/logging";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function TableOrder() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [table, setTable] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tableId]);

  const loadData = async () => {
    try {
      // Load table
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('*')
        .eq('id', tableId)
        .single();

      if (tableError) throw tableError;
      setTable(tableData);

      // Load active order for this table
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('table_id', tableId)
        .in('status', ['new', 'confirmed', 'preparing'])
        .single();

      if (orderData) {
        setOrder(orderData);
        // Load existing items into cart
        const cartItems = orderData.order_items.map((item: any) => ({
          id: item.menu_item_id,
          name: item.name,
          price: item.unit_price,
          quantity: item.quantity
        }));
        setCart(cartItems);
      }

      // Load menu items
      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('name');

      if (itemsError) throw itemsError;
      setMenuItems(items || []);

      // Load categories
      const { data: cats, error: catsError } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (catsError) throw catsError;
      setCategories(cats || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
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

  const handleSaveOrder = async () => {
    if (cart.length === 0) {
      toast.error('Adicione itens ao pedido');
      return;
    }

    try {
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      if (order) {
        // Update existing order
        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            total,
            subtotal: total,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);

        if (updateError) throw updateError;

        // Delete old items
        await supabase
          .from('order_items')
          .delete()
          .eq('order_id', order.id);

        // Insert new items
        const orderItems = cart.map(item => ({
          order_id: order.id,
          menu_item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      } else {
        // Create new order
        const orderNumber = `#${Date.now().toString().slice(-6)}`;
        
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            table_id: tableId,
            delivery_type: 'dine_in',
            status: 'new',
            total,
            subtotal: total,
            delivery_fee: 0,
            service_fee: 0,
            discount: 0
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Insert order items
        const orderItems = cart.map(item => ({
          order_id: newOrder.id,
          menu_item_id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Update table status
        await supabase
          .from('tables')
          .update({ status: 'occupied' })
          .eq('id', tableId);
        
        // ✅ FASE 1: Registrar log de mesa ocupada
        await logActionWithContext(
          'table_occupied',
          'tables',
          tableId,
          {
            table_number: table?.number,
            order_id: newOrder.id,
            total_items: cart.length,
            total_amount: total
          }
        );
      }

      toast.success('Pedido salvo com sucesso!');
      navigate('/salao');
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      toast.error('Erro ao salvar pedido');
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

  return (
    <div className="flex h-screen bg-background">
      {/* Menu Items Section */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/salao')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold mb-2">Mesa {table?.number}</h1>
          <p className="text-muted-foreground">
            {order ? `Pedido ${order.order_number}` : 'Novo Pedido'}
          </p>
        </div>

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
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-48 w-full object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                {item.description && (
                  <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    {item.promotional_price ? (
                      <>
                        <span className="text-lg font-bold text-green-600">
                          R$ {item.promotional_price.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through ml-2">
                          R$ {item.price.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="text-lg font-bold">R$ {item.price.toFixed(2)}</span>
                    )}
                  </div>
                  <Button size="sm" onClick={() => addToCart(item)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-96 bg-card border-l p-6 flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCart className="h-6 w-6" />
          <h2 className="text-xl font-bold">Pedido</h2>
        </div>

        <div className="flex-1 overflow-auto space-y-3">
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum item adicionado
            </p>
          ) : (
            cart.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      R$ {item.price.toFixed(2)} x {item.quantity}
                    </p>
                  </div>
                  <p className="font-bold">R$ {(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateQuantity(item.id, -1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateQuantity(item.id, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-2xl font-bold">R$ {totalAmount.toFixed(2)}</span>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={handleSaveOrder}
            disabled={cart.length === 0}
          >
            Salvar Pedido
          </Button>
        </div>
      </div>
    </div>
  );
}
