import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Scan, Keyboard } from "lucide-react";
import { Card } from "@/components/ui/card";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
}

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [isManual, setIsManual] = useState(false);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode("");
    }
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Scan className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Buscar por Código de Barras</h3>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={!isManual ? "default" : "outline"}
            size="sm"
            onClick={() => setIsManual(false)}
            className="gap-2"
          >
            <Scan className="h-4 w-4" />
            Scanner
          </Button>
          <Button
            variant={isManual ? "default" : "outline"}
            size="sm"
            onClick={() => setIsManual(true)}
            className="gap-2"
          >
            <Keyboard className="h-4 w-4" />
            Manual
          </Button>
        </div>

        {isManual ? (
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Digite o código de barras ou EAN..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              autoFocus
            />
            <Button type="submit">Buscar</Button>
          </form>
        ) : (
          <div className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center">
            <Scan className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Aponte o leitor de código de barras para o produto
            </p>
            <p className="text-xs text-muted-foreground">
              Ou clique em "Manual" para digitar o código
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
