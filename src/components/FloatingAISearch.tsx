import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Sparkles, X, GripVertical } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function FloatingAISearch({ onClose }: { onClose?: () => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 300, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchTerm.length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const [menuItems, orders, categories, customers, suppliers, tables, inventory, coupons, users] = await Promise.all([
        supabase.from('menu_items').select('id, name, description, price').ilike('name', `%${searchTerm}%`).limit(5),
        supabase.from('orders').select('id, order_number, customer_name, total, status').or(`order_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`).limit(5),
        supabase.from('categories').select('id, name, description').ilike('name', `%${searchTerm}%`).limit(3),
        supabase.from('customers').select('id, name, phone').or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`).limit(3),
        supabase.from('suppliers').select('id, name, phone').or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`).limit(3),
        supabase.from('tables').select('id, number, status').limit(5),
        supabase.from('inventory').select('id, name, current_quantity, unit').ilike('name', `%${searchTerm}%`).limit(3),
        supabase.from('coupons').select('id, code, type, discount_value').ilike('code', `%${searchTerm}%`).limit(3),
        supabase.from('profiles').select('id, full_name, phone').or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`).limit(3),
      ]);

      const allResults = [
        ...menuItems.data?.map(item => ({ ...item, type: 'Item do Cardápio', route: '/cardapio', name: item.name, description: item.description })) || [],
        ...orders.data?.map(order => ({ ...order, type: 'Pedido', route: '/pedidos', name: order.order_number, description: `${order.customer_name} - R$ ${order.total.toFixed(2)} - ${order.status}` })) || [],
        ...categories.data?.map(cat => ({ ...cat, type: 'Categoria', route: '/cardapio', name: cat.name, description: cat.description })) || [],
        ...customers.data?.map(customer => ({ ...customer, type: 'Cliente', route: '/clientes', name: customer.name, description: customer.phone })) || [],
        ...suppliers.data?.map(supplier => ({ ...supplier, type: 'Fornecedor', route: '/fornecedores', name: supplier.name, description: supplier.phone })) || [],
        ...tables.data?.map(table => ({ ...table, type: 'Mesa', route: '/salao', name: `Mesa ${table.number}`, description: table.status })) || [],
        ...inventory.data?.map(inv => ({ ...inv, type: 'Estoque', route: '/estoque', name: inv.name, description: `${inv.current_quantity} ${inv.unit}` })) || [],
        ...coupons.data?.map(coupon => ({ ...coupon, type: 'Cupom', route: '/cupons', name: coupon.code, description: `${coupon.type === 'percentage' ? coupon.discount_value + '%' : 'R$ ' + coupon.discount_value}` })) || [],
        ...users.data?.map(user => ({ ...user, type: 'Usuário', route: '/usuarios', name: user.full_name, description: user.phone })) || [],
      ];

      setResults(allResults);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleResultClick = (result: any) => {
    navigate(result.route);
    onClose?.();
  };

  return (
    <Card
      ref={cardRef}
      className="fixed z-50 w-[600px] shadow-2xl border-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div
        className="flex items-center gap-2 p-3 border-b cursor-grab active:cursor-grabbing bg-muted/50"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        <h3 className="font-semibold flex-1">Pesquisa Inteligente</h3>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Busque pedidos, clientes, produtos, mesas, cupons, estoque, usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {isSearching && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            Buscando...
          </div>
        )}

        {!isSearching && results.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                onClick={() => handleResultClick(result)}
                className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{result.name}</p>
                    {result.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {result.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">{result.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isSearching && searchTerm.length >= 2 && results.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhum resultado encontrado
          </div>
        )}

        {searchTerm.length < 2 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Digite pelo menos 2 caracteres para buscar
          </div>
        )}
      </div>
    </Card>
  );
}
