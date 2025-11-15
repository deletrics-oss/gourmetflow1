import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function NotaFiscal() {
  const [loading, setLoading] = useState(false);

  const handleEmitirNota = async () => {
    setLoading(true);
    // Simulação de emissão
    setTimeout(() => {
      setLoading(false);
      toast.success("NFC-e emitida com sucesso!");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Nota Fiscal (NFC-e)
          </h1>
          <p className="text-muted-foreground">Emita notas fiscais (NFC-e) sem limite de emissão</p>
        </div>

        {/* Status Badge */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Módulo Fiscal Ativo</p>
                <p className="text-sm text-green-700">Emissão ilimitada de NFC-e habilitada</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notas Emitidas Hoje</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">0</div>
              <p className="text-xs text-muted-foreground">sem limite de emissão</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notas Este Mês</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">0</div>
              <p className="text-xs text-muted-foreground">total do mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status do Serviço</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <Badge variant="default" className="bg-green-600">Operacional</Badge>
              <p className="text-xs text-muted-foreground mt-1">SEFAZ disponível</p>
            </CardContent>
          </Card>
        </div>

        {/* Formulário de Emissão */}
        <Card>
          <CardHeader>
            <CardTitle>Emitir Nova NFC-e</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer-cpf">CPF do Cliente</Label>
                <Input id="customer-cpf" placeholder="000.000.000-00" />
              </div>
              <div>
                <Label htmlFor="customer-name">Nome do Cliente</Label>
                <Input id="customer-name" placeholder="Nome completo" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="valor-total">Valor Total</Label>
                <Input id="valor-total" type="number" placeholder="0,00" step="0.01" />
              </div>
              <div>
                <Label htmlFor="desconto">Desconto</Label>
                <Input id="desconto" type="number" placeholder="0,00" step="0.01" />
              </div>
              <div>
                <Label htmlFor="valor-liquido">Valor Líquido</Label>
                <Input id="valor-liquido" type="number" placeholder="0,00" step="0.01" disabled />
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Input id="observacoes" placeholder="Informações adicionais (opcional)" />
            </div>

            <Button 
              onClick={handleEmitirNota} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Emitindo NFC-e...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Emitir NFC-e
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Avisos e Informações */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Informações Importantes</p>
                <ul className="text-sm text-blue-800 space-y-1 mt-2">
                  <li>• As NFC-e são transmitidas automaticamente para a SEFAZ</li>
                  <li>• Guarde os XMLs e PDFs emitidos por pelo menos 5 anos</li>
                  <li>• Verifique sempre os dados antes de emitir</li>
                  <li>• Em caso de erro, você pode cancelar a nota em até 24 horas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
