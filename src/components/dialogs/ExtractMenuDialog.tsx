import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ExtractMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExtractMenuDialog({ open, onOpenChange }: ExtractMenuDialogProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const { addMenuItem, addCategory, categories } = useApp();
  const { toast } = useToast();

  const parseMenuText = (input: string) => {
    const lines = input.split("\n").filter((line) => line.trim());
    const items: Array<{ name: string; price: number; category: string; description?: string }> = [];
    let currentCategory = "Geral";

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detecta categorias (linhas sem preço, em maiúsculas ou com ":")
      if (
        (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && !trimmed.includes("R$")) ||
        (trimmed.endsWith(":") && !trimmed.includes("R$"))
      ) {
        currentCategory = trimmed.replace(":", "").trim();
        
        // Adiciona categoria se não existir
        const categoryExists = categories.some(c => c.name.toLowerCase() === currentCategory.toLowerCase());
        if (!categoryExists) {
          addCategory({ name: currentCategory });
        }
        continue;
      }

      // Detecta itens com preço (formato: Nome - R$ 10.00 ou Nome R$ 10,00)
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

  const handleExtract = async () => {
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
      // Simula processamento
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const items = parseMenuText(text);

      if (items.length === 0) {
        toast({
          title: "Nenhum item encontrado",
          description: "Não foi possível extrair itens do texto. Tente formatar como: Nome do Item - R$ 10,00",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      items.forEach((item) => {
        addMenuItem(item);
      });

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Extrair Cardápio com IA</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Cole o texto do seu cardápio</Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Exemplo:&#10;&#10;PIZZAS:&#10;Marguerita - R$ 35,00&#10;Calabresa - R$ 38,00&#10;&#10;BEBIDAS:&#10;Coca-Cola - R$ 6,00&#10;Suco Natural - R$ 8,00"
              className="min-h-[300px] font-mono text-sm"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            💡 Dica: Formate como "Nome do Item - R$ Preço". Categorias em maiúsculas antes dos itens.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleExtract} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Extrair Itens
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
