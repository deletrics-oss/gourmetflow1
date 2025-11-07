import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Edit,
  Trash2,
  Copy
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BarcodeScanner } from "@/components/BarcodeScanner";

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  category: string;
  lastUpdate: Date;
}

export default function Estoque() {
  const { toast } = useToast();
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItem, setNewItem] = useState({
    name: "",
    current_quantity: 0,
    unit: "kg",
    min_quantity: 0,
    category: "",
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setStockItems(data || []);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar estoque",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(stockItems.map(item => item.category).filter(Boolean)));
  
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = stockItems.filter(item => item.current_quantity < item.min_quantity);
  const totalItems = stockItems.length;
  const totalValue = stockItems.reduce((acc, item) => acc + item.current_quantity, 0);

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e categoria",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('inventory')
        .insert([newItem]);

      if (error) throw error;

      toast({
        title: "Item adicionado!",
        description: `${newItem.name} foi adicionado ao estoque`,
      });

      setIsAddDialogOpen(false);
      setNewItem({ name: "", current_quantity: 0, unit: "kg", min_quantity: 0, category: "" });
      loadInventory();
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar item",
        variant: "destructive",
      });
    }
  };

  const handleUpdateQuantity = async (id: string, delta: number) => {
    try {
      const item = stockItems.find(i => i.id === id);
      if (!item) return;

      const newQuantity = Math.max(0, item.current_quantity + delta);
      
      const { error } = await supabase
        .from('inventory')
        .update({ 
          current_quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Estoque atualizado",
        description: delta > 0 ? "Item adicionado ao estoque" : "Item removido do estoque",
      });

      loadInventory();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar estoque",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Item removido",
        description: "Item excluído do estoque",
      });

      loadInventory();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar item",
        variant: "destructive",
      });
    }
  };

  const handleCloneItem = async (item: any) => {
    try {
      const clonedItem = {
        name: `${item.name} (Cópia)`,
        current_quantity: item.current_quantity,
        unit: item.unit,
        min_quantity: item.min_quantity,
        category: item.category
      };

      const { error } = await supabase
        .from('inventory')
        .insert([clonedItem]);

      if (error) throw error;

      toast({
        title: "Item clonado!",
        description: `${clonedItem.name} foi adicionado ao estoque`,
      });

      loadInventory();
    } catch (error) {
      console.error('Erro ao clonar:', error);
      toast({
        title: "Erro",
        description: "Erro ao clonar item",
        variant: "destructive",
      });
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      current_quantity: item.current_quantity,
      unit: item.unit,
      min_quantity: item.min_quantity,
      category: item.category
    });
    setIsAddDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return handleAddItem();

    try {
      const { error } = await supabase
        .from('inventory')
        .update({
          name: newItem.name,
          current_quantity: newItem.current_quantity,
          unit: newItem.unit,
          min_quantity: newItem.min_quantity,
          category: newItem.category,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast({
        title: "Item atualizado!",
        description: `${newItem.name} foi atualizado`,
      });

      setIsAddDialogOpen(false);
      setEditingItem(null);
      setNewItem({ name: "", current_quantity: 0, unit: "kg", min_quantity: 0, category: "" });
      loadInventory();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar item",
        variant: "destructive",
      });
    }
  };

  const handleBarcodeScanned = (code: string) => {
    const item = stockItems.find(item => 
      item.name.toLowerCase().includes(code.toLowerCase())
    );
    
    if (item) {
      setSearchTerm(item.name);
      toast({
        title: "Item encontrado!",
        description: `${item.name} foi localizado no estoque`,
      });
    } else {
      setNewItem({ ...newItem, name: code });
      setIsAddDialogOpen(true);
      toast({
        title: "Item não encontrado",
        description: `Código "${code}" pronto para cadastro`,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Controle de Estoque</h1>
        </div>
        <p className="text-muted-foreground">Gerencie o estoque de ingredientes e produtos</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total de Itens</p>
              <p className="text-3xl font-bold">{totalItems}</p>
            </div>
            <Package className="h-12 w-12 text-blue-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Estoque Baixo</p>
              <p className="text-3xl font-bold text-destructive">{lowStockItems.length}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-destructive opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Unidades Total</p>
              <p className="text-3xl font-bold">{totalValue}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Categorias</p>
              <p className="text-3xl font-bold">{categories.length}</p>
            </div>
            <Package className="h-12 w-12 text-purple-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Barcode Scanner */}
      <BarcodeScanner onScan={handleBarcodeScanned} />

      {/* Barra de Ferramentas */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item no Estoque'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Item *</Label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Ex: Tomate"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    value={newItem.current_quantity}
                    onChange={(e) => setNewItem({ ...newItem, current_quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select value={newItem.unit} onValueChange={(v) => setNewItem({ ...newItem, unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="un">Unidade</SelectItem>
                      <SelectItem value="l">Litro</SelectItem>
                      <SelectItem value="g">Gramas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quantidade Mínima</Label>
                <Input
                  type="number"
                  value={newItem.min_quantity}
                  onChange={(e) => setNewItem({ ...newItem, min_quantity: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Input
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  placeholder="Ex: Vegetais"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingItem(null);
                  setNewItem({ name: "", current_quantity: 0, unit: "kg", min_quantity: 0, category: "" });
                }} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} className="flex-1">
                  {editingItem ? 'Atualizar' : 'Adicionar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alertas de Estoque Baixo */}
      {lowStockItems.length > 0 && (
        <Card className="p-4 mb-6 bg-destructive/10 border-destructive">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">
                {lowStockItems.length} {lowStockItems.length === 1 ? "item está" : "itens estão"} com estoque baixo
              </p>
              <p className="text-sm text-muted-foreground">
                {lowStockItems.map(item => item.name).join(", ")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Lista de Itens */}
      <div className="grid gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold">{item.name}</h3>
                  <Badge variant="outline">{item.category}</Badge>
                  {item.current_quantity < item.min_quantity && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Estoque Baixo
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span>Quantidade: <strong className="text-foreground">{item.current_quantity} {item.unit}</strong></span>
                  <span>Mínimo: {item.min_quantity} {item.unit}</span>
                  <span>Atualizado: {new Date(item.updated_at || item.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleUpdateQuantity(item.id, -1)}
                  >
                    <TrendingDown className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold w-20 text-center">
                    {item.current_quantity}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleUpdateQuantity(item.id, 1)}
                  >
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                </div>

                <Button size="icon" variant="ghost" onClick={() => handleEditItem(item)} title="Editar">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleCloneItem(item)}
                  title="Clonar"
                >
                  <Package className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDeleteItem(item.id)}
                  title="Deletar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {filteredItems.length === 0 && (
          <Card className="p-16 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhum item encontrado
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}