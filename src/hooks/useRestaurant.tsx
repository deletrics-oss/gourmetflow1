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
    const urlParams = new URLSearchParams(window.location.search);
    const urlRestaurantId = urlParams.get('restaurantId');

    if (urlRestaurantId) {
      loadRestaurant(urlRestaurantId);
    } else if (user) {
      loadRestaurant();
    } else {
      setRestaurant(null);
      setLoading(false);
    }
  }, [user]);

  const loadRestaurant = async (forcedId?: string) => {
    try {
      setLoading(true);
      const targetId = forcedId || user?.id;
      
      if (!targetId) {
        setLoading(false);
        return;
      }

      console.log("[useRestaurant] Loading for:", forcedId ? `Restaurant ID ${forcedId}` : `User ID ${user?.id}`);

      let query;
      if (forcedId) {
        // Busca direta pelo ID do restaurante (links externos)
        query = supabase
          .from('restaurants')
          .select(`
            id,
            name,
            slug,
            phone,
            email,
            settings
          `)
          .eq('id', forcedId)
          .single();
      } else {
        // Busca pelo vínculo do usuário
        query = supabase
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
      }

      const { data: result, error } = await query;
      
      if (error) throw error;

      const restaurantData = forcedId ? result : (result as any).restaurants;

      if (restaurantData) {
        setRestaurant(restaurantData as unknown as Restaurant);
        
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
