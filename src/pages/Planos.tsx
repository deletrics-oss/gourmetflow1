import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function Planos() {
  const plans = [
    {
      name: "Plano Essencial",
      price: "R$ 111,20",
      badge: "1 mês grátis para teste",
      features: [
        { title: "Módulo Básico", items: [
          "PDV (venda balcão)",
          "Cardápio digital personalizado",
          "Cardápio no QR code",
          "Impressão automática de pedidos",
          "CRM (gerenciamento de clientes)",
          "Sem limite de pedidos",
          "Taxa de entrega por km, bairro ou fixa",
          "Pixel do Facebook",
          "Integração com o iFood",
          "Entrega Fácil do iFood",
          "Estoque para produtos e complementos",
          "Relatório de vendas",
          "Controle de caixa",
          "Pix automatizado"
        ]},
        { title: "Módulo Bot", items: ["Atendimento para o WhatsApp com Inteligência Artificial (IA) 24/7"]},
        { title: "Módulo Fidelidade", items: ["Cupons de desconto", "Cashback", "Controle de pagamentos fiado"]},
      ],
      addons: [
        { name: "Loja Extra", desc: "Você pode ter múltiplos catálogos no Diggy (mesmo espaço físico)", price: "+ R$ 39,92" },
        { name: "Módulo Fiscal", desc: "Emita notas fiscais (NFC-e) sem limite de emissão", price: "+ R$ 39,92" },
        { name: "Integração Extra do iFood", desc: "Permite adicionar múltiplas integrações do iFood na mesma conta", price: "+ R$ 12,72" },
        { name: "Módulo KDS", desc: "Gerencie e organize os pedidos da cozinha em tempo real", price: "+ R$ 28,72" },
        { name: "Entregador (cada)", desc: "Rastreamento em tempo real do entregador", price: "+ R$ 8,72" }
      ]
    },
    {
      name: "Plano Essencial + Mesas",
      price: "R$ 135,92",
      badge: "1 mês grátis para teste",
      features: [
        { title: "Módulo Básico", items: [
          "PDV (venda balcão)",
          "Cardápio digital personalizado",
          "Cardápio no QR code",
          "Impressão automática de pedidos",
          "CRM (gerenciamento de clientes)",
          "Sem limite de pedidos",
          "Taxa de entrega por km, bairro ou fixa",
          "Pixel do Facebook",
          "Integração com o iFood",
          "Entrega Fácil do iFood",
          "Estoque para produtos e complementos",
          "Relatório de vendas",
          "Controle de caixa",
          "Pix automatizado"
        ]},
        { title: "Módulo Bot", items: ["Atendimento para o WhatsApp com Inteligência Artificial (IA) 24/7"]},
        { title: "Módulo Fidelidade", items: ["Cupons de desconto", "Cashback", "Controle de pagamentos fiado"]},
        { title: "Módulo Mesas", items: ["Módulo garçom", "QR code para mesas", "Gestor de mesas", "Comandas"]},
        { title: "Módulo KDS", items: ["Gerencie e organize os pedidos da cozinha em tempo real"]}
      ],
      addons: [
        { name: "Loja Extra", desc: "Você pode ter múltiplos catálogos no Diggy", price: "+ R$ 39,92" },
        { name: "Módulo Fiscal", desc: "Emita notas fiscais (NFC-e) sem limite de emissão", price: "+ R$ 39,92" },
        { name: "Integração Extra do iFood", desc: "Múltiplas integrações do iFood", price: "+ R$ 12,72" },
        { name: "Entregador (cada)", desc: "Rastreamento em tempo real", price: "+ R$ 8,72" }
      ]
    },
    {
      name: "Plano Customizado",
      price: "R$ 63,92",
      badge: "1 mês grátis para teste",
      features: [
        { title: "Módulo Básico", items: [
          "PDV (venda balcão)",
          "Cardápio digital personalizado",
          "Cardápio no QR code",
          "Impressão automática de pedidos",
          "CRM (gerenciamento de clientes)",
          "Sem limite de pedidos",
          "Taxa de entrega por km, bairro ou fixa",
          "Pixel do Facebook",
          "Integração com o iFood",
          "Entrega Fácil do iFood",
          "Estoque para produtos e complementos",
          "Relatório de vendas",
          "Controle de caixa",
          "Pix automatizado"
        ]}
      ],
      addons: [
        { name: "Módulo Fidelidade", desc: "Cupons de desconto, Cashback, Controle fiado", price: "+ R$ 15,92" },
        { name: "Módulo Bot", desc: "Atendimento WhatsApp com IA 24/7", price: "+ R$ 39,92" },
        { name: "Módulo Mesas", desc: "Garçom, QR code, Gestor de mesas, Comandas", price: "+ R$ 28,72" },
        { name: "Loja Extra", desc: "Múltiplos catálogos", price: "+ R$ 39,92" },
        { name: "Módulo Fiscal", desc: "NFC-e sem limite", price: "+ R$ 39,92" },
        { name: "Integração Extra iFood", desc: "Múltiplas integrações", price: "+ R$ 12,72" },
        { name: "Módulo KDS", desc: "Gestão da cozinha em tempo real", price: "+ R$ 28,72" },
        { name: "Entregador (cada)", desc: "Rastreamento em tempo real", price: "+ R$ 8,72" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Planos do Sistema</h1>
          <p className="text-muted-foreground mb-4">Selecione um plano para assinar</p>
          <div className="bg-muted/50 p-4 rounded-lg max-w-2xl mx-auto">
            <p className="text-sm"><strong>Email da conta:</strong> deletrics@gmail.com</p>
            <p className="text-sm"><strong>Loja:</strong> GOYMERT (criado em: 07/11/25)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => (
            <Card key={idx} className="flex flex-col">
              <CardHeader>
                <Badge className="w-fit mb-2">{plan.badge}</Badge>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <p className="text-3xl font-bold text-primary">{plan.price}</p>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-6">
                {plan.features.map((feature, fIdx) => (
                  <div key={fIdx}>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {feature.items.map((item, iIdx) => (
                        <li key={iIdx} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {plan.addons && plan.addons.length > 0 && (
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-3 text-sm">Módulos adicionais</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Nesse plano, você poderá escolher os módulos individualmente
                    </p>
                    <div className="space-y-2">
                      {plan.addons.map((addon, aIdx) => (
                        <div key={aIdx} className="flex items-start justify-between gap-2 text-sm">
                          <div>
                            <p className="font-medium">{addon.name}</p>
                            <p className="text-xs text-muted-foreground">{addon.desc}</p>
                          </div>
                          <span className="text-primary font-semibold whitespace-nowrap text-xs">
                            {addon.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button className="w-full mt-auto" variant="default">
                  Assinar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
