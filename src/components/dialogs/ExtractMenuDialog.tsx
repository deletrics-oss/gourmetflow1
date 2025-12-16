import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useRestaurant } from "@/hooks/useRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, FileText, Link, Image, X } from "lucide-react";

interface ExtractMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ExtractedItem {
  name: string;
  price: number;
  description?: string;
  category: string;
}

export function ExtractMenuDialog({ open, onOpenChange, onSuccess }: ExtractMenuDialogProps) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { restaurantId } = useRestaurant();

  const parseMenuText = (input: string) => {
    const lines = input.split("\n").filter((line) => line.trim());
    const items: ExtractedItem[] = [];
    let currentCategory = "Geral";

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (
        (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && !trimmed.includes("R$")) ||
        (trimmed.endsWith(":") && !trimmed.includes("R$"))
      ) {
        currentCategory = trimmed.replace(":", "").trim();
        continue;
      }

      const priceMatch = trimmed.match(/(.+?)[\s-]+R?\$?\s*(\d+[.,]\d{2})/i);
      if (priceMatch) {
        const name = priceMatch[1].trim();
        const priceStr = priceMatch[2].replace(",", ".");
        const price = parseFloat(priceStr);
        
        if (name && !isNaN(price)) {
          items.push({ name, price, category: currentCategory });
        }
      }
    }

    return items;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione uma imagem (JPG, PNG, etc.)",
          variant: "destructive",
        });
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save items directly to Supabase database
  const saveItemsToDatabase = async (items: ExtractedItem[]) => {
    if (!restaurantId) {
      throw new Error('Restaurant ID não encontrado');
    }

    let addedCount = 0;
    const categoryCache: Record<string, string> = {};

    // First, load existing categories
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('restaurant_id', restaurantId);

    // Build category cache from existing
    if (existingCategories) {
      for (const cat of existingCategories) {
        categoryCache[cat.name.toLowerCase()] = cat.id;
      }
    }

    for (const item of items) {
      const categoryName = item.category || "Geral";
      const categoryKey = categoryName.toLowerCase();
      
      // Create category if doesn't exist
      if (!categoryCache[categoryKey]) {
        const { data: newCat, error: catError } = await supabase
          .from('categories')
          .insert({
            name: categoryName,
            restaurant_id: restaurantId,
            is_active: true
          })
          .select('id')
          .single();

        if (catError) {
          console.error('Error creating category:', catError);
          continue;
        }
        
        categoryCache[categoryKey] = newCat.id;
      }

      // Insert menu item
      if (item.name && item.price >= 0) {
        const { error: itemError } = await supabase
          .from('menu_items')
          .insert({
            name: item.name,
            price: item.price,
            description: item.description || null,
            category_id: categoryCache[categoryKey],
            restaurant_id: restaurantId,
            is_available: true
          });

        if (itemError) {
          console.error('Error creating menu item:', itemError);
        } else {
          addedCount++;
        }
      }
    }

    return addedCount;
  };

  const handleExtractFromText = async () => {
    if (!text.trim()) {
      toast({
        title: "Erro",
        description: "Cole o texto do cardápio para extrair",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const items = parseMenuText(text);

      if (items.length === 0) {
        toast({
          title: "Nenhum item encontrado",
          description: "Tente formatar como: Nome do Item - R$ 10,00",
          variant: "destructive",
        });
        return;
      }

      const addedCount = await saveItemsToDatabase(items);

      toast({
        title: "Sucesso!",
        description: `${addedCount} ${addedCount === 1 ? "item cadastrado" : "itens cadastrados"} no cardápio`,
      });

      setText("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar o cardápio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExtractFromImage = async () => {
    if (!imagePreview) {
      toast({
        title: "Erro",
        description: "Selecione uma imagem do cardápio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-menu-from-image', {
        body: { imageBase64: imagePreview }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      const items = data.items as ExtractedItem[];
      if (!items || items.length === 0) {
        toast({
          title: "Nenhum item encontrado",
          description: "Não foi possível extrair itens da imagem. Tente uma imagem mais clara.",
          variant: "destructive",
        });
        return;
      }

      const addedCount = await saveItemsToDatabase(items);

      toast({
        title: "Sucesso!",
        description: `${addedCount} ${addedCount === 1 ? "item cadastrado" : "itens cadastrados"} no cardápio`,
      });

      clearImage();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error extracting from image:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar imagem",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExtractFromUrl = async () => {
    if (!imageUrl.trim()) {
      toast({
        title: "Erro",
        description: "Cole a URL da imagem do cardápio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-menu-from-image', {
        body: { imageUrl: imageUrl.trim() }
      });

      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }

      const items = data.items as ExtractedItem[];
      if (!items || items.length === 0) {
        toast({
          title: "Nenhum item encontrado",
          description: "Não foi possível extrair itens da URL. Verifique se a URL é uma imagem válida.",
          variant: "destructive",
        });
        return;
      }

      const addedCount = await saveItemsToDatabase(items);

      toast({
        title: "Sucesso!",
        description: `${addedCount} ${addedCount === 1 ? "item cadastrado" : "itens cadastrados"} no cardápio`,
      });

      setImageUrl("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error extracting from URL:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar URL",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = () => {
    switch (activeTab) {
      case "text":
        handleExtractFromText();
        break;
      case "upload":
        handleExtractFromImage();
        break;
      case "url":
        handleExtractFromUrl();
        break;
    }
  };

  const canExtract = () => {
    switch (activeTab) {
      case "text":
        return text.trim().length > 0;
      case "upload":
        return imagePreview !== null;
      case "url":
        return imageUrl.trim().length > 0;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Extrair Cardápio com IA
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Texto
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Cole o texto do seu cardápio</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Exemplo:&#10;&#10;PIZZAS:&#10;Marguerita - R$ 35,00&#10;Calabresa - R$ 38,00&#10;&#10;BEBIDAS:&#10;Coca-Cola - R$ 6,00&#10;Suco Natural - R$ 8,00"
                className="min-h-[250px] font-mono text-sm"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              💡 Formate como "Nome do Item - R$ Preço". Categorias em maiúsculas antes dos itens.
            </p>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Faça upload da imagem do cardápio</Label>
              
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview do cardápio" 
                    className="w-full max-h-[300px] object-contain rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={clearImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Arraste uma imagem ou clique para selecionar
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPG, PNG (máx. 10MB)
                  </p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              🤖 A IA irá analisar a imagem e extrair automaticamente os itens e preços.
            </p>
          </TabsContent>

          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Cole a URL da imagem do cardápio</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://exemplo.com/cardapio.jpg"
                type="url"
              />
            </div>
            
            {imageUrl && (
              <div className="border rounded-lg p-2">
                <img 
                  src={imageUrl} 
                  alt="Preview da URL" 
                  className="w-full max-h-[200px] object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              🔗 Cole o link direto de uma imagem online do seu cardápio.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleExtract} disabled={loading || !canExtract()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Extrair e Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
