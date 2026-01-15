import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface BillingPlan {
  id: string;
  plan_key: string;
  name: string;
  price: number;
  stripe_price_id: string | null;
  features: string[];
  not_included: string[];
  badge: string | null;
  is_recommended: boolean;
  is_trial: boolean;
  is_active: boolean;
  sort_order: number;
}

interface BillingConfig {
  trial_days: number;
  stripe_enabled: boolean;
  pix_enabled: boolean;
}

export default function Planos() {
  const { planType, subscribed, inTrial, loading: subLoading } = useSubscription();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      // Carregar configuração
      const { data: configData } = await supabase
        .from('billing_config')
        .select('trial_days, stripe_enabled, pix_enabled')
        .single();

      if (configData) {
        setConfig(configData);
      }

      // Carregar planos ativos
      const { data: plansData, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setPlans(plansData || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      // Fallback para planos hardcoded se tabela não existir
      setPlans([
        {
          id: '1',
          plan_key: 'free',
          name: 'Trial Grátis',
          price: 0,
          stripe_price_id: null,
          features: ['Acesso completo por 30 dias', 'Teste todas as funcionalidades', 'Sem cartão de crédito'],
          not_included: ['Após 30 dias, escolha um plano'],
          badge: '30 dias grátis',
          is_recommended: false,
          is_trial: true,
          is_active: true,
          sort_order: 0,
        },
        {
          id: '2',
          plan_key: 'delivery1',
          name: 'Delivery Básico',
          price: 59.99,
          stripe_price_id: 'price_1SXEUNPDGZjTHjxq7tgsf3Uf',
          features: ['PDV completo', 'Cardápio online', 'Gestão de clientes', 'Relatórios básicos', 'Delivery integrado'],
          not_included: ['WhatsApp Bot', 'Design com IA'],
          badge: null,
          is_recommended: false,
          is_trial: false,
          is_active: true,
          sort_order: 1,
        },
        {
          id: '3',
          plan_key: 'delivery2',
          name: 'Delivery Pro',
          price: 99.99,
          stripe_price_id: 'price_1SXEUaPDGZjTHjxqqWAYOo0p',
          features: ['Tudo do Básico', 'Gestão de Mesas', 'Tablet na mesa', 'Relatórios avançados'],
          not_included: ['WhatsApp Bot', 'Design com IA'],
          badge: 'Mais Popular',
          is_recommended: true,
          is_trial: false,
          is_active: true,
          sort_order: 2,
        },
        {
          id: '4',
          plan_key: 'delivery3',
          name: 'Delivery Completo',
          price: 159.99,
          stripe_price_id: 'price_1SXEV2PDGZjTHjxqR1Q2CoLF',
          features: ['Todos os recursos', 'WhatsApp Bot', 'Design com IA', 'iFood/99Food', 'NFC-e'],
          not_included: [],
          badge: 'Completo',
          is_recommended: false,
          is_trial: false,
          is_active: true,
          sort_order: 3,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: BillingPlan) => {
    if (plan.is_trial) {
      toast.info('Você já está no período de trial gratuito!');
      return;
    }

    if (!plan.stripe_price_id) {
      toast.error('Este plano ainda não está configurado para pagamento.');
      return;
    }

    try {
      setProcessingPlan(plan.plan_key);
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planType: plan.plan_key },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2 text-foreground">Escolha seu Plano</h1>
        <p className="text-muted-foreground">
          {inTrial
            ? `Você está em período de teste (${config?.trial_days || 30} dias). Escolha um plano para continuar usando o sistema.`
            : subscribed
              ? "Gerencie sua assinatura atual ou faça upgrade."
              : `Comece com ${config?.trial_days || 30} dias grátis em qualquer plano.`}
        </p>
        {subscribed && (
          <Button onClick={handleManageSubscription} variant="outline" className="mt-4">
            Gerenciar Assinatura
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = planType === plan.plan_key && subscribed;
          const isPopular = plan.badge === "Mais Popular" || plan.is_recommended;

          return (
            <Card
              key={plan.id}
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
                  <span className="text-3xl font-bold text-foreground">
                    {plan.price === 0 ? 'R$ 0' : `R$ ${plan.price.toFixed(2).replace('.', ',')}`}
                  </span>
                  {!plan.is_trial && <span className="text-muted-foreground">/mês</span>}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Funcionalidades:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.not_included.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Não Incluído:</h4>
                    <ul className="space-y-2">
                      {plan.not_included.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
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
                  onClick={() => handleSubscribe(plan)}
                  disabled={subLoading || processingPlan === plan.plan_key || isCurrentPlan}
                >
                  {processingPlan === plan.plan_key
                    ? "Processando..."
                    : isCurrentPlan
                      ? "Plano Atual"
                      : plan.is_trial
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