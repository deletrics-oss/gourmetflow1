import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, FileText, Link, Image, X } from "lucide-react";

interface ExtractMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExtractedItem {
  name: string;
  price: number;
  description?: string;
  category: string;
}

export function ExtractMenuDialog({ open, onOpenChange }: ExtractMenuDialogProps) {
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { addMenuItem, addCategory, categories } = useApp();
  const { toast } = useToast();

  const parseMenuText = (input: string) => {
    const lines = input.split("\n").filter((line) => line.trim());
    const items: Array<{ name: string; price: number; category: string; description?: string }> = [];
    let currentCategory = "Geral";

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (
        (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && !trimmed.includes("R$")) ||
        (trimmed.endsWith(":") && !trimmed.includes("R$"))
      ) {
        currentCategory = trimmed.replace(":", "").trim();
        const categoryExists = categories.some(c => c.name.toLowerCase() === currentCategory.toLowerCase());
        if (!categoryExists) {
          addCategory({ name: currentCategory });
        }
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

  const processExtractedItems = (items: ExtractedItem[]) => {
    let addedCount = 0;
    
    for (const item of items) {
      // Add category if doesn't exist
      const categoryExists = categories.some(c => 
        c.name.toLowerCase() === item.category.toLowerCase()
      );
      if (!categoryExists && item.category) {
        addCategory({ name: item.category });
      }
      
      // Add menu item
      if (item.name && item.price >= 0) {
        addMenuItem({
          name: item.name,
          price: item.price,
          category: item.category || "Geral",
          description: item.description,
        });
        addedCount++;
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
      await new Promise((resolve) => setTimeout(resolve, 500));
      const items = parseMenuText(text);

      if (items.length === 0) {
        toast({
          title: "Nenhum item encontrado",
          description: "Tente formatar como: Nome do Item - R$ 10,00",
          variant: "destructive",
        });
        return;
      }

      items.forEach((item) => addMenuItem(item));

      toast({
        title: "Sucesso!",
        description: `${items.length} ${items.length === 1 ? "item extraído" : "itens extraídos"} do cardápio`,
      });

      setText("");
      onOpenChange(false);
    } catch (error) {
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

      const addedCount = processExtractedItems(items);

      toast({
        title: "Sucesso!",
        description: `${addedCount} ${addedCount === 1 ? "item extraído" : "itens extraídos"} do cardápio`,
      });

      clearImage();
      onOpenChange(false);
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

      const addedCount = processExtractedItems(items);

      toast({
        title: "Sucesso!",
        description: `${addedCount} ${addedCount === 1 ? "item extraído" : "itens extraídos"} do cardápio`,
      });

      setImageUrl("");
      onOpenChange(false);
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
            Extrair Itens
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
