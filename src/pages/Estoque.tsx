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
  Trash2
} from "lucide-react";
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
  const [stockItems, setStockItems] = useState<StockItem[]>([
    {
      id: "1",
      name: "Tomate",
      quantity: 15,
      unit: "kg",
      minQuantity: 10,
      category: "Vegetais",
      lastUpdate: new Date(),
    },
    {
      id: "2",
      name: "Queijo Mussarela",
      quantity: 8,
      unit: "kg",
      minQuantity: 12,
      category: "Laticínios",
      lastUpdate: new Date(),
    },
    {
      id: "3",
      name: "Carne Moída",
      quantity: 25,
      unit: "kg",
      minQuantity: 15,
      category: "Carnes",
      lastUpdate: new Date(),
    },
    {
      id: "4",
      name: "Refrigerante 2L",
      quantity: 45,
      unit: "un",
      minQuantity: 30,
      category: "Bebidas",
      lastUpdate: new Date(),
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: 0,
    unit: "kg",
    minQuantity: 0,
    category: "",
  });

  const categories = Array.from(new Set(stockItems.map(item => item.category)));
  
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = stockItems.filter(item => item.quantity < item.minQuantity);
  const totalItems = stockItems.length;
  const totalValue = stockItems.reduce((acc, item) => acc + item.quantity, 0);

  const handleAddItem = () => {
    if (!newItem.name || !newItem.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e categoria",
        variant: "destructive",
      });
      return;
    }

    const item: StockItem = {
      id: Date.now().toString(),
      ...newItem,
      lastUpdate: new Date(),
    };

    setStockItems([...stockItems, item]);
    setIsAddDialogOpen(false);
    setNewItem({ name: "", quantity: 0, unit: "kg", minQuantity: 0, category: "" });
    
    toast({
      title: "Item adicionado!",
      description: `${item.name} foi adicionado ao estoque`,
    });
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setStockItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(0, item.quantity + delta), lastUpdate: new Date() }
          : item
      )
    );

    toast({
      title: "Estoque atualizado",
      description: delta > 0 ? "Item adicionado ao estoque" : "Item removido do estoque",
    });
  };

  const handleDeleteItem = (id: string) => {
    setStockItems(prev => prev.filter(item => item.id !== id));
    toast({
      title: "Item removido",
      description: "Item excluído do estoque",
    });
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
              <DialogTitle>Novo Item no Estoque</DialogTitle>
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
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
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
                  value={newItem.minQuantity}
                  onChange={(e) => setNewItem({ ...newItem, minQuantity: Number(e.target.value) })}
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

              <Button onClick={handleAddItem} className="w-full">
                Adicionar Item
              </Button>
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
                  {item.quantity < item.minQuantity && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Estoque Baixo
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <span>Quantidade: <strong className="text-foreground">{item.quantity} {item.unit}</strong></span>
                  <span>Mínimo: {item.minQuantity} {item.unit}</span>
                  <span>Atualizado: {item.lastUpdate.toLocaleDateString()}</span>
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
                    {item.quantity}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleUpdateQuantity(item.id, 1)}
                  >
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                </div>

                <Button size="icon" variant="ghost">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleDeleteItem(item.id)}
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