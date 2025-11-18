import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function SubscriptionAlert() {
  const { subscribed, inTrial, daysLeft, loading } = useSubscription();
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();

  if (loading || authLoading) return null;
  
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

  // Aviso persistente quando sem assinatura (não bloqueia o sistema)
  if (!inTrial && !subscribed && !isAdmin) {
    return (
      <div className="fixed bottom-20 right-6 z-40">
        <Button
          onClick={() => navigate('/planos')}
          variant="outline"
          size="sm"
          className="bg-red-500/10 border-red-500 text-red-700 dark:text-red-400 hover:bg-red-500/20 shadow-lg animate-pulse"
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Sem Assinatura Ativa
        </Button>
      </div>
    );
  }

  return null;
}
