import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  email?: string;
  settings?: any;
}

export const useRestaurant = () => {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) {
      loadRestaurant();
    } else {
      setRestaurant(null);
      setLoading(false);
    }
  }, [user]);

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      
      // Buscar restaurante do usuário
      const { data: userRestaurant, error } = await supabase
        .from('user_restaurants')
        .select(`
          restaurant_id,
          restaurants (
            id,
            name,
            slug,
            phone,
            email,
            settings
          )
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      if (userRestaurant?.restaurants) {
        const restaurantData = userRestaurant.restaurants as unknown as Restaurant;
        setRestaurant(restaurantData);
        
        // Verificar status do onboarding
        const { data: settings } = await supabase
          .from('restaurant_settings')
          .select('onboarding_completed')
          .eq('restaurant_id', restaurantData.id)
          .maybeSingle();
        
        setOnboardingCompleted(settings?.onboarding_completed ?? false);
      }
    } catch (error) {
      console.error('Error loading restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  // Retornar restaurantId diretamente para facilitar uso nas páginas
  return { 
    restaurant, 
    restaurantId: restaurant?.id || null,
    loading, 
    reload: loadRestaurant,
    onboardingCompleted,
  };
};
