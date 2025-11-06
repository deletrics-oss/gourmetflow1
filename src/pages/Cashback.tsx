import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Gift, TrendingUp, Users } from "lucide-react";

export default function Cashback() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Gift className="h-8 w-8 text-green-500" />
          <h1 className="text-3xl font-bold">Cashback</h1>
        </div>
        <p className="text-muted-foreground">Fidelize clientes com devolução de dinheiro</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Distribuído</p>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold">R$ 0,00</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Clientes Ativos</p>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold">0</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Taxa Média</p>
            <Gift className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold">5%</p>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Configurar Cashback</h3>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Nome da Campanha</Label>
            <Input 
              id="campaign-name" 
              placeholder="Ex: Cashback de Boas-Vindas" 
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="percentage">Porcentagem de Cashback (%)</Label>
              <Input 
                id="percentage" 
                type="number" 
                defaultValue="5"
                min="0"
                max="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-value">Valor Mínimo do Pedido (R$)</Label>
              <Input 
                id="min-value" 
                type="number" 
                defaultValue="0"
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="font-medium">Ativar regra de cashback</p>
              <p className="text-sm text-muted-foreground">
                Ao ativar, o sistema calculará automaticamente o cashback
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex gap-2">
            <Button className="flex-1">Salvar Regra</Button>
            <Button variant="outline">Cancelar</Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-green-50 dark:bg-green-950 border-green-200">
        <div className="flex items-start gap-3">
          <Gift className="h-6 w-6 text-green-500 mt-1" />
          <div>
            <h3 className="font-semibold mb-2">Como Funciona o Cashback?</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li><strong>1.</strong> O cliente faz um pedido e recebe uma porcentagem do valor de volta como crédito</li>
              <li><strong>2.</strong> O crédito fica disponível na conta do cliente para usar no próximo pedido</li>
              <li><strong>3.</strong> Aumenta a fidelização e incentiva compras recorrentes</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
