import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, LogOut } from 'lucide-react';

interface SubscriptionBlockerProps {
  reason: 'trial_expired' | 'subscription_inactive' | 'blocked';
  daysLeft?: number;
}

export function SubscriptionBlocker({ reason, daysLeft }: SubscriptionBlockerProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getContent = () => {
    switch (reason) {
      case 'trial_expired':
        return {
          title: 'Período de Teste Expirado',
          description: 'Seu período de teste gratuito de 30 dias terminou. Para continuar usando o GourmetFlow, escolha um plano.',
          icon: <AlertTriangle className="h-16 w-16 text-yellow-500" />,
        };
      case 'subscription_inactive':
        return {
          title: 'Assinatura Inativa',
          description: 'Sua assinatura está inativa. Renove para continuar acessando todas as funcionalidades.',
          icon: <CreditCard className="h-16 w-16 text-red-500" />,
        };
      case 'blocked':
        return {
          title: 'Acesso Bloqueado',
          description: 'Sua conta foi temporariamente bloqueada. Entre em contato com o suporte para mais informações.',
          icon: <AlertTriangle className="h-16 w-16 text-red-500" />,
        };
      default:
        return {
          title: 'Acesso Restrito',
          description: 'Você não tem acesso a esta área.',
          icon: <AlertTriangle className="h-16 w-16 text-muted-foreground" />,
        };
    }
  };

  const content = getContent();

  return (
    <div className="fixed inset-0 bg-background z-[100] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          {content.icon}
        </div>
        
        <h2 className="text-2xl font-bold mb-2">{content.title}</h2>
        
        <p className="text-muted-foreground mb-6">
          {content.description}
        </p>

        {reason !== 'blocked' && (
          <Button 
            onClick={() => navigate('/planos')} 
            className="w-full mb-3"
            size="lg"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Ver Planos e Assinar
          </Button>
        )}

        <Button 
          variant="ghost" 
          onClick={handleSignOut}
          className="w-full"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair da Conta
        </Button>

        <p className="text-xs text-muted-foreground mt-6">
          Dúvidas? Entre em contato: suporte@gourmetflow.com.br
        </p>
      </Card>
    </div>
  );
}
