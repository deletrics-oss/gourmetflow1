import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, CreditCard, Smartphone, Banknote, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PaymentIntegrationProps {
  total: number;
  onPaymentComplete: (paymentData: any) => void;
  orderId?: string;
}

export function PaymentIntegration({ total, onPaymentComplete, orderId }: PaymentIntegrationProps) {
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card" | "debit_card" | "cash">("pix");
  const [processing, setProcessing] = useState(false);
  const [pixQRCode, setPixQRCode] = useState<string | null>(null);
  const [pixDialogOpen, setPixDialogOpen] = useState(false);

  const handlePixPayment = async () => {
    setProcessing(true);
    try {
      // Simulação de geração de QR Code PIX
      // Em produção, integrar com API de pagamento (Mercado Pago, PagSeguro, etc.)
      const mockQRCode = `00020126580014br.gov.bcb.pix0136${Math.random().toString(36).substr(2, 9)}@email.com5204000053039865802BR5925Nome do Estabelecimento6014Cidade620705${orderId || 'ORDER'}`;
      
      setPixQRCode(mockQRCode);
      setPixDialogOpen(true);
      
      toast.success("QR Code PIX gerado com sucesso!");
      
      // Simular confirmação de pagamento após 5 segundos
      setTimeout(() => {
        onPaymentComplete({
          method: "pix",
          status: "approved",
          transaction_id: `PIX${Date.now()}`,
          amount: total
        });
        setPixDialogOpen(false);
        setProcessing(false);
      }, 5000);
    } catch (error) {
      toast.error("Erro ao processar pagamento PIX");
      setProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    setProcessing(true);
    try {
      // Em produção, integrar com gateway de pagamento
      toast.info("Processando pagamento no cartão...");
      
      setTimeout(() => {
        onPaymentComplete({
          method: paymentMethod,
          status: "approved",
          transaction_id: `CARD${Date.now()}`,
          amount: total
        });
        toast.success("Pagamento aprovado!");
        setProcessing(false);
      }, 3000);
    } catch (error) {
      toast.error("Erro ao processar pagamento");
      setProcessing(false);
    }
  };

  const handleCashPayment = () => {
    onPaymentComplete({
      method: "cash",
      status: "pending",
      transaction_id: `CASH${Date.now()}`,
      amount: total
    });
    toast.success("Pedido registrado - Pagamento em dinheiro");
  };

  const handlePayment = () => {
    if (paymentMethod === "pix") {
      handlePixPayment();
    } else if (paymentMethod === "cash") {
      handleCashPayment();
    } else {
      handleCardPayment();
    }
  };

  return (
    <>
      <Card className="p-6 space-y-4">
        <div>
          <Label className="text-lg font-semibold">Método de Pagamento</Label>
        </div>

        <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
            <RadioGroupItem value="pix" id="pix" />
            <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer flex-1">
              <QrCode className="h-5 w-5 text-primary" />
              <span>PIX - Pagamento Instantâneo</span>
            </Label>
          </div>

          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
            <RadioGroupItem value="credit_card" id="credit_card" />
            <Label htmlFor="credit_card" className="flex items-center gap-2 cursor-pointer flex-1">
              <CreditCard className="h-5 w-5 text-primary" />
              <span>Cartão de Crédito</span>
            </Label>
          </div>

          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
            <RadioGroupItem value="debit_card" id="debit_card" />
            <Label htmlFor="debit_card" className="flex items-center gap-2 cursor-pointer flex-1">
              <Smartphone className="h-5 w-5 text-primary" />
              <span>Cartão de Débito</span>
            </Label>
          </div>

          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
            <RadioGroupItem value="cash" id="cash" />
            <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
              <Banknote className="h-5 w-5 text-primary" />
              <span>Dinheiro</span>
            </Label>
          </div>
        </RadioGroup>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold">Total:</span>
            <span className="text-2xl font-bold text-primary">
              R$ {total.toFixed(2)}
            </span>
          </div>

          <Button 
            onClick={handlePayment} 
            className="w-full" 
            size="lg"
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              `Pagar R$ ${total.toFixed(2)}`
            )}
          </Button>
        </div>
      </Card>

      {/* Dialog PIX QR Code */}
      <Dialog open={pixDialogOpen} onOpenChange={setPixDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagamento PIX</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code abaixo para realizar o pagamento
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-center p-6 bg-white rounded-lg">
              {pixQRCode && (
                <div className="text-center">
                  <div className="bg-gray-900 p-4 rounded-lg mb-4">
                    <QrCode className="h-48 w-48 text-white mx-auto" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Escaneie com o app do seu banco
                  </p>
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                R$ {total.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Aguardando confirmação do pagamento...
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
