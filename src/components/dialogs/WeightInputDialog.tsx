import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Scale, Wifi, WifiOff, RefreshCw } from "lucide-react";

interface WeightInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  pricePerKg: number;
  onConfirm: (weight: number, totalPrice: number) => void;
}

export function WeightInputDialog({
  open,
  onOpenChange,
  productName,
  pricePerKg,
  onConfirm
}: WeightInputDialogProps) {
  const [weight, setWeight] = useState<number>(0);
  const [manualWeight, setManualWeight] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const totalPrice = weight * pricePerKg;

  const connect = () => {
    if (ws) {
      ws.close();
    }

    setConnecting(true);
    
    try {
      const socket = new WebSocket('ws://localhost:9999');
      
      socket.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setManualMode(false);
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.weight !== undefined) {
            setWeight(parseFloat(data.weight) || 0);
          }
        } catch (e) {
          // Try parsing as plain number
          const numWeight = parseFloat(event.data);
          if (!isNaN(numWeight)) {
            setWeight(numWeight);
          }
        }
      };
      
      socket.onclose = () => {
        setConnected(false);
        setConnecting(false);
      };
      
      socket.onerror = () => {
        setConnected(false);
        setConnecting(false);
        setManualMode(true);
      };
      
      setWs(socket);
    } catch (error) {
      setConnected(false);
      setConnecting(false);
      setManualMode(true);
    }
  };

  useEffect(() => {
    if (open) {
      setWeight(0);
      setManualWeight("");
      connect();
    }
    
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [open]);

  const handleManualWeightChange = (value: string) => {
    setManualWeight(value);
    const parsed = parseFloat(value.replace(',', '.'));
    if (!isNaN(parsed)) {
      setWeight(parsed);
    }
  };

  const handleConfirm = () => {
    if (weight > 0) {
      onConfirm(weight, totalPrice);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Informar Peso
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status da balança */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Balança conectada</span>
                </>
              ) : connecting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Conectando...</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-destructive">Desconectada</span>
                </>
              )}
            </div>
            {!connected && !connecting && (
              <Button variant="outline" size="sm" onClick={connect}>
                Reconectar
              </Button>
            )}
          </div>

          {/* Produto e preço */}
          <div className="p-4 rounded-lg border">
            <p className="font-semibold text-lg">{productName}</p>
            <p className="text-muted-foreground">
              R$ {pricePerKg.toFixed(2)} / kg
            </p>
          </div>

          {/* Peso - Automático ou Manual */}
          {manualMode || !connected ? (
            <div className="space-y-2">
              <Label htmlFor="manual-weight">Peso (kg)</Label>
              <Input
                id="manual-weight"
                type="text"
                value={manualWeight}
                onChange={(e) => handleManualWeightChange(e.target.value)}
                placeholder="Ex: 1.250"
                className="text-2xl text-center h-16"
              />
              <p className="text-xs text-muted-foreground text-center">
                Digite o peso manualmente (use ponto ou vírgula)
              </p>
            </div>
          ) : (
            <div className="text-center p-6 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground mb-2">Peso atual</p>
              <p className="text-5xl font-bold tabular-nums">
                {weight.toFixed(3)} <span className="text-2xl">kg</span>
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setManualMode(true)}
                className="mt-2"
              >
                Digitar manualmente
              </Button>
            </div>
          )}

          {/* Total calculado */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total:</span>
              <span className="text-2xl font-bold text-primary">
                R$ {totalPrice.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">
              {weight.toFixed(3)} kg × R$ {pricePerKg.toFixed(2)}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={weight <= 0}>
            Confirmar Peso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
