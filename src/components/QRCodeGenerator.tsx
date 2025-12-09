import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Copy, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QRCodeGeneratorProps {
  tableNumber: number;
  tableId: string;
}

export function QRCodeGenerator({ tableNumber, tableId }: QRCodeGeneratorProps) {
  const [open, setOpen] = useState(false);
  const menuUrl = `${window.location.origin}/menu-tablet?tableId=${tableId}`;

  const generateQRCode = () => {
    // Using a QR code API service
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(menuUrl)}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = generateQRCode();
    link.download = `mesa-${tableNumber}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code baixado!');
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(menuUrl);
    toast.success('URL copiada!');
  };

  const handleOpenPreview = () => {
    window.open(menuUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="h-4 w-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code - Mesa {tableNumber}
          </DialogTitle>
          <DialogDescription>
            Imprima e coloque na mesa para pedidos via tablet
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* QR Code Image */}
          <div className="flex justify-center p-6 bg-white rounded-lg border">
            <img
              src={generateQRCode()}
              alt={`QR Code Mesa ${tableNumber}`}
              className="w-48 h-48"
            />
          </div>
          
          {/* Instructions Alert */}
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Como usar:</strong>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Baixe e imprima o QR Code</li>
                <li>Cole na mesa ou em um suporte</li>
                <li>Clientes escaneiam com o celular</li>
                <li>O cardápio abre automaticamente vinculado a esta mesa</li>
              </ol>
            </AlertDescription>
          </Alert>
          
          {/* URL Display */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">URL gerada:</p>
            <code className="text-xs break-all">{menuUrl}</code>
          </div>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar PNG
            </Button>
            <Button variant="outline" onClick={handleCopyUrl} className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar URL
            </Button>
          </div>
          
          <Button 
            variant="secondary" 
            onClick={handleOpenPreview} 
            className="w-full gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Testar Cardápio (Nova Aba)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
