import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Download } from "lucide-react";

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
          <DialogTitle>QR Code - Mesa {tableNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center p-6 bg-white rounded-lg">
            <img
              src={generateQRCode()}
              alt={`QR Code Mesa ${tableNumber}`}
              className="w-64 h-64"
            />
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Clientes podem escanear este QR Code para acessar o cardápio e fazer pedidos direto do celular
            </p>
            <Button onClick={handleDownload} className="gap-2 w-full">
              <Download className="h-4 w-4" />
              Baixar QR Code
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
