import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

export function SubscriptionAlert() {
  const { subscribed, inTrial, daysLeft, loading } = useSubscription();
  const navigate = useNavigate();

  if (loading || subscribed) return null;

  if (inTrial && daysLeft !== undefined) {
    if (daysLeft <= 3) {
      return (
        <Alert className="m-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                Seu período de teste termina em {daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}!
              </span>
              <span className="text-yellow-700 dark:text-yellow-300">
                Assine um plano para continuar usando o sistema.
              </span>
            </div>
            <Button 
              onClick={() => navigate('/planos')} 
              variant="default"
              size="sm"
            >
              Ver Planos
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    if (daysLeft <= 10) {
      return (
        <Alert className="m-6 border-blue-500 bg-blue-50 dark:bg-blue-950">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="text-blue-800 dark:text-blue-200">
                Você tem {daysLeft} dias restantes no período de teste.
              </span>
            </div>
            <Button 
              onClick={() => navigate('/planos')} 
              variant="outline"
              size="sm"
            >
              Ver Planos
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
  }

  if (!inTrial && !subscribed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Alert className="max-w-2xl border-red-500 bg-red-50 dark:bg-red-950">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          <AlertDescription className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                Período de teste expirado
              </h3>
              <p className="text-red-700 dark:text-red-300">
                Seu período de teste gratuito terminou. Para continuar usando o sistema, 
                por favor assine um dos nossos planos.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/planos')}
                variant="default"
              >
                Ver Planos e Assinar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}
