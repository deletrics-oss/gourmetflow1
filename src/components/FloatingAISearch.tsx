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
      const searches = await Promise.all([
        supabase.from('menu_items').select('*').ilike('name', `%${searchTerm}%`).limit(5),
        supabase.from('orders').select('*').ilike('order_number', `%${searchTerm}%`).limit(5),
        supabase.from('categories').select('*').ilike('name', `%${searchTerm}%`).limit(5),
        supabase.from('customers').select('*').ilike('name', `%${searchTerm}%`).limit(5),
        supabase.from('suppliers').select('*').ilike('name', `%${searchTerm}%`).limit(5),
        supabase.from('tables').select('*').limit(5),
      ]);

      const allResults = [
        ...searches[0].data?.map(item => ({ ...item, type: 'Item do Cardápio', route: '/cardapio', name: item.name })) || [],
        ...searches[1].data?.map(item => ({ ...item, type: 'Pedido', route: '/pedidos', name: item.order_number })) || [],
        ...searches[2].data?.map(item => ({ ...item, type: 'Categoria', route: '/cardapio', name: item.name })) || [],
        ...searches[3].data?.map(item => ({ ...item, type: 'Cliente', route: '/clientes', name: item.name })) || [],
        ...searches[4].data?.map(item => ({ ...item, type: 'Fornecedor', route: '/fornecedores', name: item.name })) || [],
        ...searches[5].data?.map(item => ({ ...item, type: 'Mesa', route: '/salao', name: `Mesa ${item.number}` })) || [],
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
            placeholder="Busque pedidos, clientes, produtos, mesas..."
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
