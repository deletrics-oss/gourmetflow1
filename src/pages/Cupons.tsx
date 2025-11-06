import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Ticket, Plus, Copy, Trash2 } from "lucide-react";

export default function Cupons() {
  const cupons = [
    {
      id: 1,
      code: "PRIMEIRACOMPRA",
      type: "percentage",
      discount: 15,
      minOrder: 30,
      uses: 3,
      maxUses: 100,
      status: "active"
    },
    {
      id: 2,
      code: "FRETEGRATIS",
      type: "free-shipping",
      discount: 0,
      minOrder: 50,
      uses: 25,
      maxUses: 50,
      status: "inactive"
    },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Ticket className="h-8 w-8 text-orange-500" />
          <h1 className="text-3xl font-bold">Cupons de Desconto</h1>
        </div>
        <p className="text-muted-foreground">Crie e gerencie cupons promocionais</p>
      </div>

      <Card className="p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Criar Novo Cupom</h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código do Cupom *</Label>
            <Input id="code" placeholder="Ex: PRIMEIRACOMPRA" />
            <p className="text-xs text-muted-foreground">Use letras maiúsculas e números</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Desconto</Label>
              <select id="type" className="w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
                <option value="free-shipping">Frete Grátis</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor do Desconto</Label>
              <Input id="value" type="number" placeholder="10" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="min-order">Valor Mínimo do Pedido (R$)</Label>
              <Input id="min-order" type="number" placeholder="0" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-uses">Limite de Usos</Label>
              <Input id="max-uses" type="number" placeholder="100" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1">Criar Cupom</Button>
            <Button variant="outline">Cancelar</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {cupons.map((cupom) => (
          <Card key={cupom.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-orange-500">{cupom.code}</h3>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <Badge className={cupom.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                  {cupom.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto:</span>
                <span className="font-medium">
                  {cupom.type === 'percentage' ? `${cupom.discount}%` : 
                   cupom.type === 'fixed' ? `R$ ${cupom.discount}` : 'Frete Grátis'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pedido mínimo:</span>
                <span className="font-medium">R$ {cupom.minOrder.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usos:</span>
                <span className="font-medium">{cupom.uses} / {cupom.maxUses}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6 bg-orange-50 dark:bg-orange-950 border-orange-200">
        <div className="flex items-start gap-3">
          <Ticket className="h-6 w-6 text-orange-500 mt-1" />
          <div>
            <h3 className="font-semibold mb-2">Dicas para Cupons Efetivos</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Use códigos curtos e fáceis de lembrar (ex: NATAL10, PRIMEIR...)</li>
              <li>• Estabeleça um valor mínimo para incentivar pedidos maiores</li>
              <li>• Limite o número de usos para criar senso de urgência</li>
              <li>• Divulgue seus cupons nas redes sociais e WhatsApp</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
