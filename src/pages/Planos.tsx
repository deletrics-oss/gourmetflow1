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
    name: "Trial Grátis",
    price: "R$ 0",
    type: "free",
    badge: "30 dias grátis",
    features: [
      "Acesso completo por 30 dias",
      "Teste todas as funcionalidades",
      "Sem cartão de crédito",
    ],
    notIncluded: [
      "Após 30 dias, escolha um plano"
    ],
    addons: [],
    isTrial: true
  },
  {
    name: "Delivery Básico",
    price: "R$ 59,99",
    type: "delivery1",
    productId: "prod_TUCuWibYtgymlE",
    badge: null,
    features: [
      "PDV completo",
      "Cardápio online",
      "Gestão de clientes",
      "Relatórios básicos",
      "Delivery integrado",
      "Monitor Cozinha",
      "Gestão de Motoboys",
    ],
    notIncluded: [
      "Gestão de Mesas",
      "Comandas",
      "Tablet na mesa",
      "WhatsApp Bot",
      "Design com IA",
    ],
    addons: [],
  },
  {
    name: "Delivery Pro",
    price: "R$ 99,99",
    type: "delivery2",
    productId: "prod_TUCujk7c7oAwaq",
    badge: "Mais Popular",
    features: [
      "Tudo do Delivery Básico",
      "Gestão de Mesas",
      "Comandas físicas",
      "Tablet na mesa",
      "Totem autoatendimento",
      "Relatórios avançados",
      "Monitor Gestor",
    ],
    notIncluded: [
      "WhatsApp Bot",
      "Design com IA",
      "Integração iFood/99Food",
    ],
    addons: [],
  },
  {
    name: "Delivery Completo",
    price: "R$ 159,99",
    type: "delivery3",
    productId: "prod_TUCu1OjdrZ8lft",
    badge: "Completo",
    features: [
      "Tudo dos planos anteriores",
      "🤖 WhatsApp Bot totalmente integrado",
      "🎨 Geração de design de cardápios com IA",
      "🍕 Integração iFood",
      "🛵 Integração 99Food",
      "📄 NFC-e (Nota Fiscal)",
      "⭐ Suporte prioritário 24/7",
    ],
    notIncluded: [],
    addons: [],
  },
];

export default function Planos() {
  const { planType, subscribed, inTrial, loading } = useSubscription();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const handleSubscribe = async (type: string) => {
    if (type === 'free') {
      toast.info('Você já está no período de trial gratuito!');
      return;
    }
    
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
              : "Comece com 30 dias grátis em qualquer plano."}
        </p>
        {subscribed && (
          <Button onClick={handleManageSubscription} variant="outline" className="mt-4">
            Gerenciar Assinatura
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = planType === plan.type && subscribed;
          const isPopular = plan.badge === "Mais Popular";
          
          return (
            <Card 
              key={plan.name} 
              className={`relative ${isCurrentPlan ? 'border-primary border-2' : ''} ${isPopular ? 'border-primary border-2' : ''}`}
            >
              {plan.badge && (
                <Badge 
                  className={`absolute top-4 right-4 ${isPopular ? 'bg-primary text-primary-foreground' : ''}`} 
                  variant={isPopular ? "default" : "secondary"}
                >
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
                  {!plan.isTrial && <span className="text-muted-foreground">/mês</span>}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Funcionalidades:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
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
                          <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={isCurrentPlan ? "outline" : isPopular ? "default" : "default"}
                  onClick={() => handleSubscribe(plan.type)}
                  disabled={loading || processingPlan === plan.type || isCurrentPlan}
                >
                  {processingPlan === plan.type 
                    ? "Processando..." 
                    : isCurrentPlan 
                      ? "Plano Atual" 
                      : plan.isTrial 
                        ? "Começar Grátis"
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