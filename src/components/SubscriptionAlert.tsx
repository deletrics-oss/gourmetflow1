import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function SubscriptionAlert() {
  const { subscribed, inTrial, daysLeft, loading } = useSubscription();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  if (loading) return null;
  
  // Admins não veem alertas de subscription
  if (isAdmin) return null;

  // Badge compacto verde quando subscribed ou em trial com muitos dias
  if (subscribed || (inTrial && daysLeft !== undefined && daysLeft > 10)) {
    return (
      <div className="fixed bottom-20 right-6 z-40">
        <Button
          onClick={() => navigate('/planos')}
          variant="outline"
          size="sm"
          className="bg-green-500/10 border-green-500 text-green-700 dark:text-green-400 hover:bg-green-500/20 shadow-lg"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {subscribed ? 'Plano Ativo' : `Trial: ${daysLeft} dias`}
        </Button>
      </div>
    );
  }

  // Badge amarelo quando próximo ao vencimento (3-10 dias)
  if (inTrial && daysLeft !== undefined && daysLeft > 3 && daysLeft <= 10) {
    return (
      <div className="fixed bottom-20 right-6 z-40">
        <Button
          onClick={() => navigate('/planos')}
          variant="outline"
          size="sm"
          className="bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20 shadow-lg animate-pulse"
        >
          <Clock className="h-4 w-4 mr-2" />
          Trial: {daysLeft} dias
        </Button>
      </div>
    );
  }

  // Badge vermelho quando muito próximo (≤3 dias)
  if (inTrial && daysLeft !== undefined && daysLeft <= 3) {
    return (
      <div className="fixed bottom-20 right-6 z-40">
        <Button
          onClick={() => navigate('/planos')}
          variant="outline"
          size="sm"
          className="bg-red-500/10 border-red-500 text-red-700 dark:text-red-400 hover:bg-red-500/20 shadow-lg animate-pulse"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Expira em {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}!
        </Button>
      </div>
    );
  }

  // Tela bloqueio completo quando trial expirado
  if (!inTrial && !subscribed && !isAdmin) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div className="max-w-md bg-card border-2 border-red-500 rounded-lg p-8 shadow-2xl text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Período de Teste Expirado
          </h3>
          <p className="text-muted-foreground mb-6">
            Seu trial gratuito terminou. Assine um plano para continuar usando o sistema.
          </p>
          <Button 
            onClick={() => navigate('/planos')}
            size="lg"
            className="w-full"
          >
            Ver Planos e Assinar
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
