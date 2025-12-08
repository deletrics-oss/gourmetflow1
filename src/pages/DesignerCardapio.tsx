import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase-client";
import { useRestaurant } from "@/hooks/useRestaurant";
import { toast } from "sonner";
import { 
  Loader2, 
  Wand2, 
  Download, 
  RefreshCw, 
  Image as ImageIcon,
  FileText,
  Smartphone,
  Magnet,
  LayoutGrid,
  Sparkles,
  Palette
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  category_name?: string;
}

interface Category {
  id: string;
  name: string;
}

const materialTypes = [
  { id: 'menu-a4', label: 'Cardápio A4', icon: FileText, description: 'Cardápio formato A4 profissional' },
  { id: 'magnet', label: 'Imã de Geladeira', icon: Magnet, description: 'Imã compacto com itens principais' },
  { id: 'flyer', label: 'Panfleto', icon: LayoutGrid, description: 'Panfleto promocional' },
  { id: 'social', label: 'Post Redes Sociais', icon: Smartphone, description: 'Post para Instagram/WhatsApp' },
  { id: 'catalog', label: 'Catálogo A3', icon: ImageIcon, description: 'Catálogo grande com fotos' },
];

const visualStyles = [
  { id: 'modern', label: 'Moderno', description: 'Clean e minimalista' },
  { id: 'classic', label: 'Clássico', description: 'Tradicional e elegante' },
  { id: 'minimalist', label: 'Minimalista', description: 'Simples e direto' },
  { id: 'vibrant', label: 'Vibrante', description: 'Cores fortes e chamativas' },
];

export default function DesignerCardapio() {
  const { restaurantId, loading: restaurantLoading } = useRestaurant();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [materialType, setMaterialType] = useState('menu-a4');
  const [visualStyle, setVisualStyle] = useState('modern');
  const [primaryColor, setPrimaryColor] = useState('#e53e3e');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [restaurantSettings, setRestaurantSettings] = useState<any>(null);

  useEffect(() => {
    if (restaurantId) {
      loadMenuItems();
      loadSettings();
    }
  }, [restaurantId]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('restaurant_settings')
      .select('name, logo_url, primary_color, accent_color')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();
    
    if (data) {
      setRestaurantSettings(data);
      if (data.primary_color) setPrimaryColor(data.primary_color);
      if (data.accent_color) setAccentColor(data.accent_color);
    }
  };

  const loadMenuItems = async () => {
    try {
      const [itemsRes, catsRes] = await Promise.all([
        supabase
          .from('menu_items')
          .select('id, name, description, price, promotional_price, image_url, category_id')
          .eq('restaurant_id', restaurantId)
          .eq('is_available', true)
          .order('name'),
        supabase
          .from('categories')
          .select('id, name')
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true)
          .order('sort_order'),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (catsRes.error) throw catsRes.error;

      const catsMap = new Map(catsRes.data?.map(c => [c.id, c.name]) || []);
      const items = (itemsRes.data || []).map(item => ({
        ...item,
        category_name: catsMap.get(item.category_id) || 'Sem categoria',
      }));

      setMenuItems(items);
      setCategories(catsRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
      toast.error('Erro ao carregar cardápio');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setSelectedItems(new Set(menuItems.map(i => i.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const generateArt = async () => {
    if (selectedItems.size === 0) {
      toast.error('Selecione pelo menos um item do cardápio');
      return;
    }

    setGenerating(true);
    setGeneratedImage(null);

    try {
      const selectedMenuItems = menuItems.filter(item => selectedItems.has(item.id));
      
      const { data, error } = await supabase.functions.invoke('generate-menu-design', {
        body: {
          items: selectedMenuItems,
          materialType,
          visualStyle,
          primaryColor,
          accentColor,
          restaurantName: restaurantSettings?.name || 'Restaurante',
          logoUrl: restaurantSettings?.logo_url,
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast.success('Arte gerada com sucesso!');
      } else {
        throw new Error('Nenhuma imagem retornada');
      }
    } catch (error) {
      console.error('Erro ao gerar arte:', error);
      toast.error('Erro ao gerar arte. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `cardapio-${materialType}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download iniciado!');
  };

  if (restaurantLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-primary" />
          Designer de Cardápio (IA)
        </h1>
        <p className="text-muted-foreground">
          Crie artes profissionais para seu restaurante usando inteligência artificial
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configurações */}
        <div className="space-y-6">
          {/* Tipo de Material */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📦 Tipo de Material</CardTitle>
              <CardDescription>Escolha o formato da arte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {materialTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setMaterialType(type.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        materialType === type.id
                          ? 'border-primary bg-primary/10'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-5 w-5 mb-1" />
                      <p className="text-sm font-medium">{type.label}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Estilo Visual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎨 Estilo Visual</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={visualStyle} onValueChange={setVisualStyle} className="grid grid-cols-2 gap-2">
                {visualStyles.map((style) => (
                  <div key={style.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={style.id} id={style.id} />
                    <Label htmlFor={style.id} className="cursor-pointer">
                      <span className="font-medium">{style.label}</span>
                      <span className="text-xs text-muted-foreground block">{style.description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Cores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Cores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cor Principal</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Cor de Acento</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seleção de Itens */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">🍕 Itens do Cardápio</CardTitle>
                  <CardDescription>
                    {selectedItems.size} de {menuItems.length} selecionados
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Limpar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedItems.has(item.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => toggleItem(item.id)}
                    >
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                      />
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          R$ {(item.promotional_price || item.price).toFixed(2)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {item.category_name}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Botão Gerar */}
          <Button
            onClick={generateArt}
            disabled={generating || selectedItems.size === 0}
            className="w-full h-14 text-lg gap-3"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Gerando arte...
              </>
            ) : (
              <>
                <Wand2 className="h-5 w-5" />
                ✨ Gerar Arte com IA
              </>
            )}
          </Button>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>📷 Preview da Arte</CardTitle>
              <CardDescription>
                A arte gerada aparecerá aqui
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-[3/4] rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20 overflow-hidden">
                {generating ? (
                  <div className="text-center">
                    <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-lg font-medium">Gerando sua arte...</p>
                    <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
                  </div>
                ) : generatedImage ? (
                  <img
                    src={generatedImage}
                    alt="Arte gerada"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-8">
                    <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium">Nenhuma arte gerada</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Selecione itens e clique em "Gerar Arte com IA"
                    </p>
                  </div>
                )}
              </div>

              {generatedImage && (
                <div className="flex gap-3 mt-4">
                  <Button onClick={downloadImage} className="flex-1 gap-2">
                    <Download className="h-4 w-4" />
                    Download PNG
                  </Button>
                  <Button variant="outline" onClick={generateArt} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Regenerar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
