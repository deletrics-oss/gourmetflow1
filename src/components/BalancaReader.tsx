import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Scale, Wifi, WifiOff, RefreshCw, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface BalancaReaderProps {
  onWeightChange: (weight: number) => void;
  pricePerKg: number;
  productName: string;
}

export function BalancaReader({ onWeightChange, pricePerKg, productName }: BalancaReaderProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [weight, setWeight] = useState(0);
  const [manualMode, setManualMode] = useState(false);
  const [manualWeight, setManualWeight] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (ws) {
      ws.close();
    }

    setConnecting(true);
    
    try {
      const socket = new WebSocket('ws://localhost:9999');
      
      socket.onopen = () => {
        console.log('🟢 Balança conectada');
        setConnected(true);
        setConnecting(false);
        toast.success('Balança conectada!');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.weight !== undefined) {
            const newWeight = parseFloat(data.weight);
            setWeight(newWeight);
            onWeightChange(newWeight);
          }
        } catch (e) {
          // Tentar parse direto do peso
          const parsed = parseFloat(event.data);
          if (!isNaN(parsed)) {
            setWeight(parsed);
            onWeightChange(parsed);
          }
        }
      };

      socket.onclose = () => {
        console.log('🔴 Balança desconectada');
        setConnected(false);
        setConnecting(false);
      };

      socket.onerror = (error) => {
        console.error('❌ Erro na balança:', error);
        setConnected(false);
        setConnecting(false);
        toast.error('Erro ao conectar com a balança. Use o modo manual.');
        setManualMode(true);
      };

      setWs(socket);
    } catch (error) {
      console.error('Erro ao criar WebSocket:', error);
      setConnecting(false);
      setManualMode(true);
    }
  }, [onWeightChange, ws]);

  useEffect(() => {
    // Tentar conectar automaticamente
    connect();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const handleManualWeightChange = (value: string) => {
    setManualWeight(value);
    const parsed = parseFloat(value.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setWeight(parsed);
      onWeightChange(parsed);
    }
  };

  const totalPrice = weight * pricePerKg;

  return (
    <Card className="border-2 border-primary/30">
      <CardContent className="p-4 space-y-4">
        {/* Header com status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span className="font-semibold">Balança</span>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge variant="default" className="bg-green-600">
                <Wifi className="h-3 w-3 mr-1" />
                Conectada
              </Badge>
            ) : (
              <Badge variant="secondary">
                <WifiOff className="h-3 w-3 mr-1" />
                Desconectada
              </Badge>
            )}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={connect}
              disabled={connecting}
            >
              <RefreshCw className={`h-4 w-4 ${connecting ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Produto */}
        <div className="text-center bg-muted/50 rounded-lg p-2">
          <span className="text-sm text-muted-foreground">Produto:</span>
          <p className="font-semibold">{productName}</p>
          <p className="text-sm text-primary">R$ {pricePerKg.toFixed(2)} / kg</p>
        </div>

        {/* Peso */}
        {manualMode ? (
          <div className="space-y-2">
            <Label>Peso Manual (kg)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.001"
                min="0"
                value={manualWeight}
                onChange={(e) => handleManualWeightChange(e.target.value)}
                placeholder="0.000"
                className="text-center text-2xl font-bold"
              />
              <Button 
                variant="outline" 
                onClick={() => setManualMode(false)}
                title="Usar balança"
              >
                <Scale className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Peso na Balança</Label>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setManualMode(true)}
                title="Digitar manualmente"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-center bg-background border-2 border-dashed rounded-lg p-4">
              <span className="text-4xl font-bold text-primary">
                {weight.toFixed(3)}
              </span>
              <span className="text-xl text-muted-foreground ml-2">kg</span>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="bg-primary/10 rounded-lg p-3 text-center">
          <span className="text-sm text-muted-foreground">Valor Total:</span>
          <p className="text-2xl font-bold text-primary">
            R$ {totalPrice.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">
            {weight.toFixed(3)} kg × R$ {pricePerKg.toFixed(2)}
          </p>
        </div>

        {/* Dica */}
        {!connected && !manualMode && (
          <p className="text-xs text-center text-muted-foreground">
            💡 Balança não detectada. Certifique-se de que o app auxiliar está rodando em localhost:9999
          </p>
        )}
      </CardContent>
    </Card>
  );
}
