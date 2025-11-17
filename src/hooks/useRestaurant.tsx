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
        setRestaurant(userRestaurant.restaurants as unknown as Restaurant);
      }
    } catch (error) {
      console.error('Error loading restaurant:', error);
    } finally {
      setLoading(false);
    }
  };

  return { restaurant, loading, reload: loadRestaurant };
};
