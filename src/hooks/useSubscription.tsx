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
  isExpired: boolean;
  canAccess: boolean;
  isBlocked: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    inTrial: false,
    loading: true,
    isExpired: false,
    canAccess: true,
    isBlocked: false,
  });

  const checkSubscription = async () => {
    if (!user) {
      setStatus({ 
        subscribed: false, 
        inTrial: false, 
        loading: false,
        isExpired: false,
        canAccess: false,
        isBlocked: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      // Calcular flags de acesso
      const inTrial = data?.inTrial || false;
      const subscribed = data?.subscribed || false;
      const daysLeft = data?.daysLeft ?? 0;
      const isBlocked = data?.isBlocked || false;
      
      // Trial expirado = em trial mas sem dias restantes
      const trialExpired = inTrial && daysLeft <= 0;
      
      // Expirado = trial expirado OU sem assinatura e não está em trial
      const isExpired = trialExpired || (!subscribed && !inTrial);
      
      // Pode acessar = tem assinatura ativa OU está em trial válido (com dias restantes)
      const canAccess = subscribed || (inTrial && daysLeft > 0);

      setStatus({
        ...data,
        loading: false,
        isExpired,
        canAccess: canAccess && !isBlocked,
        isBlocked,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setStatus({ 
        subscribed: false, 
        inTrial: false, 
        loading: false,
        isExpired: true,
        canAccess: false,
        isBlocked: false,
      });
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
    if (status.inTrial && (status.daysLeft ?? 0) > 0) return true;
    
    // Se não tem assinatura ativa, não tem acesso
    if (!status.subscribed || !status.planType) return false;

    // Mapeamento de funcionalidades por plano
    const features: Record<string, string[]> = {
      delivery1: [
        'pedidos_online',
        'pedidos_balcao',
        'cardapio',
        'clientes',
        'relatorios_basicos',
        'delivery',
        'monitor_cozinha',
        'motoboys',
      ],
      delivery2: [
        'pedidos_online',
        'pedidos_balcao',
        'cardapio',
        'clientes',
        'relatorios_basicos',
        'delivery',
        'monitor_cozinha',
        'motoboys',
        'mesas',
        'comandas',
        'tablet',
        'totem',
        'relatorios_avancados',
        'monitor_gestor',
      ],
      delivery3: [
        'pedidos_online',
        'pedidos_balcao',
        'cardapio',
        'clientes',
        'relatorios_basicos',
        'delivery',
        'monitor_cozinha',
        'motoboys',
        'mesas',
        'comandas',
        'tablet',
        'totem',
        'relatorios_avancados',
        'monitor_gestor',
        'whatsapp_bot',
        'design_cardapio',
        'integracao_ifood',
        'integracao_99food',
        'nfce',
        'suporte_prioritario',
        'extrai_cardapio_ia',
        'gera_fotos_ia',
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
