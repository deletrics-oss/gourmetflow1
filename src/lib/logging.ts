import { supabase } from "@/lib/supabase-client";

/**
 * Helper function to log actions with automatic context capturing
 * Captures user agent automatically from the browser
 */
export const logActionWithContext = async (
  action: string,
  entityType?: string | null,
  entityId?: string | null,
  details?: any,
  restaurantId?: string | null
) => {
  try {
    const userAgent = navigator.userAgent;
    
    console.log('[LOGGING] Tentando registrar:', {
      action,
      entityType,
      entityId,
      details
    });

    // Buscar restaurant_id do usuário se não fornecido
    let finalRestaurantId = restaurantId;
    if (!finalRestaurantId) {
      const { data: userRestaurant } = await supabase
        .from('user_restaurants')
        .select('restaurant_id')
        .eq('is_active', true)
        .single();
      
      finalRestaurantId = userRestaurant?.restaurant_id || null;
    }

    const { data, error } = await supabase.rpc('log_action', {
      p_action: action,
      p_entity_type: entityType || null,
      p_entity_id: entityId || null,
      p_details: {
        ...details,
        user_agent: userAgent,
        timestamp: new Date().toISOString()
      },
      p_restaurant_id: finalRestaurantId
    });

    if (error) {
      console.error('[LOGGING] ❌ Erro ao registrar:', error);
      // Não throw - logging não deve quebrar o app
    } else {
      console.log('[LOGGING] ✅ Log gravado:', data);
    }
  } catch (error) {
    console.error('[LOGGING] ❌ Erro fatal:', error);
  }
};
