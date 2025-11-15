import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProtectedFeatureProps {
  children: ReactNode;
  feature: string;
  fallback?: ReactNode;
}

export function ProtectedFeature({ children, feature, fallback }: ProtectedFeatureProps) {
  const { hasFeature, loading, inTrial, subscribed } = useSubscription();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Durante trial ou com assinatura ativa que inclui a funcionalidade
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Se tem fallback customizado, usar ele
  if (fallback) {
    return <>{fallback}</>;
  }

  // Mensagem padrão de bloqueio
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Alert className="max-w-2xl border-orange-200 bg-orange-50 dark:bg-orange-950">
        <Lock className="h-5 w-5 text-orange-600" />
        <AlertDescription className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-2">
              Funcionalidade Bloqueada
            </h3>
            <p className="text-orange-700 dark:text-orange-300">
              {inTrial 
                ? "Esta funcionalidade não está disponível no período de teste. Assine um plano para desbloquear."
                : subscribed
                  ? "Faça upgrade do seu plano para ter acesso a esta funcionalidade."
                  : "Você precisa de uma assinatura ativa para acessar esta funcionalidade."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/planos')} variant="default">
              Ver Planos e Fazer Upgrade
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              Voltar ao Dashboard
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
