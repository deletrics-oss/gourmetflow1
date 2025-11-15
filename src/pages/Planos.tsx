import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import { useState } from "react";

const plans = [
  {
    name: "Plano Essencial",
    price: "R$ 149",
    type: "essencial",
    badge: "Mais Escolhido",
    features: [
      "Pedidos Online",
      "Pedidos Balcão (PDV)",
      "Gestão de Cardápio",
      "Gestão de Clientes",
      "Relatórios Básicos",
    ],
    notIncluded: [
      "Gestão de Mesas",
      "Comandas",
      "NFC-e",
      "Zap Bot",
    ],
    addons: [
      { name: "Integração iFood", price: "Grátis" },
      { name: "Integração 99Food", price: "Grátis" },
      { name: "Integração Keeta", price: "Grátis" },
    ],
  },
  {
    name: "Plano Essencial + Mesas",
    price: "R$ 249",
    type: "essencial_mesas",
    badge: "Recomendado",
    features: [
      "Tudo do Essencial",
      "Gestão de Mesas",
      "Comandas",
      "Controle de Salão",
    ],
    notIncluded: [
      "NFC-e",
      "Zap Bot",
    ],
    addons: [
      { name: "Integração iFood", price: "Grátis" },
      { name: "Integração 99Food", price: "Grátis" },
      { name: "Integração Keeta", price: "Grátis" },
    ],
  },
  {
    name: "Plano Customizado",
    price: "R$ 399",
    type: "customizado",
    badge: "Completo",
    features: [
      "Tudo dos planos anteriores",
      "NFC-e (Nota Fiscal)",
      "Zap Bot",
      "Relatórios Avançados",
      "Suporte Prioritário",
    ],
    notIncluded: [],
    addons: [
      { name: "Integração iFood", price: "Grátis" },
      { name: "Integração 99Food", price: "Grátis" },
      { name: "Integração Keeta", price: "Grátis" },
    ],
  },
];

export default function Planos() {
  const { planType, subscribed, inTrial, loading } = useSubscription();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const handleSubscribe = async (type: string) => {
    try {
      setProcessingPlan(type);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planType: type },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Erro ao processar assinatura. Tente novamente.');
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Erro ao abrir portal de assinaturas. Tente novamente.');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 text-foreground">Escolha seu Plano</h1>
        <p className="text-muted-foreground">
          {inTrial 
            ? "Você está em período de teste. Escolha um plano para continuar usando o sistema." 
            : subscribed 
              ? "Gerencie sua assinatura atual ou faça upgrade."
              : "Comece com 10 dias grátis em qualquer plano."}
        </p>
        {subscribed && (
          <Button onClick={handleManageSubscription} variant="outline" className="mt-4">
            Gerenciar Assinatura
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = planType === plan.type && subscribed;
          
          return (
            <Card 
              key={plan.name} 
              className={`relative ${isCurrentPlan ? 'border-primary border-2' : ''}`}
            >
              {plan.badge && (
                <Badge className="absolute top-4 right-4" variant="secondary">
                  {plan.badge}
                </Badge>
              )}
              {isCurrentPlan && (
                <Badge className="absolute top-4 left-4" variant="default">
                  Seu Plano
                </Badge>
              )}
              
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Funcionalidades Incluídas:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.notIncluded.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Não Incluído:</h4>
                    <ul className="space-y-2">
                      {plan.notIncluded.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <X className="h-4 w-4 text-muted-foreground" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {plan.addons.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">Integrações Grátis:</h4>
                    <ul className="space-y-1">
                      {plan.addons.map((addon) => (
                        <li key={addon.name} className="text-sm text-muted-foreground">
                          • {addon.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={isCurrentPlan ? "outline" : "default"}
                  onClick={() => handleSubscribe(plan.type)}
                  disabled={loading || processingPlan === plan.type || isCurrentPlan}
                >
                  {processingPlan === plan.type 
                    ? "Processando..." 
                    : isCurrentPlan 
                      ? "Plano Atual" 
                      : "Assinar"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
