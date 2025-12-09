import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, QrCode, Phone, ShoppingBag, RefreshCw } from "lucide-react";

interface TableNotFoundProps {
  restaurantPhone?: string;
  onRetry?: () => void;
}

export function TableNotFound({ restaurantPhone, onRetry }: TableNotFoundProps) {
  const handleGoToDelivery = () => {
    window.location.href = '/customer-menu';
  };

  const handleRefresh = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold mb-2">Mesa Não Encontrada</h1>
          <p className="text-muted-foreground">
            Não conseguimos identificar sua mesa. Isso pode acontecer se o QR Code estiver desatualizado ou inválido.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            onClick={handleRefresh}
            variant="outline"
            className="w-full gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </Button>

          <Button 
            onClick={handleGoToDelivery}
            className="w-full gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            Acessar Cardápio Delivery
          </Button>
        </div>

        {/* Scan Instructions */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-3">
            <QrCode className="h-5 w-5" />
            <span className="text-sm font-medium">Dica</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Procure o QR Code na sua mesa e escaneie novamente com a câmera do celular.
          </p>
        </div>

        {/* Restaurant Contact */}
        {restaurantPhone && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Precisa de ajuda? Fale conosco:
            </p>
            <a 
              href={`tel:${restaurantPhone}`}
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <Phone className="h-4 w-4" />
              {restaurantPhone}
            </a>
          </div>
        )}
      </Card>
    </div>
  );
}
