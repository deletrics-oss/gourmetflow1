import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useAuth } from './useAuth';

interface SubscriptionStatus {
  subscribed: boolean;
  inTrial: boolean;
  daysLeft?: number;
  planType?: string;
  productId?: string;
  subscriptionEnd?: string;
  loading: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    inTrial: false,
    loading: true,
  });

  const checkSubscription = async () => {
    if (!user) {
      setStatus({ subscribed: false, inTrial: false, loading: false });
      return;
    }

    // Usuário joel@gmail.com sempre tem acesso total
    if (user.email === 'joel@gmail.com') {
      setStatus({
        subscribed: true,
        inTrial: false,
        loading: false,
        planType: 'customizado',
        productId: 'prod_TQVbmTNqjI3VMH', // Plano Customizado
        daysLeft: 999,
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      setStatus({
        ...data,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setStatus({ subscribed: false, inTrial: false, loading: false });
    }
  };

  useEffect(() => {
    checkSubscription();

    // Verificar a cada 60 segundos
    const interval = setInterval(checkSubscription, 60000);

    return () => clearInterval(interval);
  }, [user]);

  const hasFeature = (featureKey: string): boolean => {
    // Durante trial, tem acesso a tudo
    if (status.inTrial) return true;
    
    // Se não tem assinatura ativa, não tem acesso
    if (!status.subscribed || !status.planType) return false;

    // Mapeamento de funcionalidades por plano
    const features: Record<string, string[]> = {
      free: [
        'pedidos_online',
        'pedidos_balcao',
        'cardapio',
        'clientes',
        'relatorios_basicos',
      ],
      essencial: [
        'pedidos_online',
        'pedidos_balcao',
        'cardapio',
        'clientes',
        'relatorios_basicos',
        'integracao_ifood',
        'integracao_99food',
        'integracao_keeta',
      ],
      essencial_mesas: [
        'pedidos_online',
        'pedidos_balcao',
        'cardapio',
        'clientes',
        'relatorios_basicos',
        'integracao_ifood',
        'integracao_99food',
        'integracao_keeta',
        'mesas',
        'comandas',
      ],
      customizado: [
        'pedidos_online',
        'pedidos_balcao',
        'cardapio',
        'clientes',
        'relatorios_basicos',
        'integracao_ifood',
        'integracao_99food',
        'integracao_keeta',
        'mesas',
        'comandas',
        'nfce',
        'zapbot',
        'relatorios_avancados',
        'suporte_prioritario',
      ],
    };

    return features[status.planType]?.includes(featureKey) || false;
  };

  return {
    ...status,
    hasFeature,
    checkSubscription,
  };
}
