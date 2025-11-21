import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface DeliveryZone {
  id: string;
  min_distance: number;
  max_distance: number;
  fee: number;
  is_active: boolean;
}

interface AddressData {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string;
  latitude?: number;
  longitude?: number;
}

export const useDeliveryFee = () => {
  const [loading, setLoading] = useState(false);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [restaurantCoords, setRestaurantCoords] = useState<Coordinates | null>(null);

  // Fórmula de Haversine para calcular distância entre dois pontos em km
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Raio da Terra em km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Arredondar para 1 casa decimal
  };

  // Buscar coordenadas a partir do endereço usando Nominatim (OpenStreetMap)
  const getCoordinatesFromAddress = async (
    address: string
  ): Promise<Coordinates | null> => {
    try {
      const query = encodeURIComponent(address);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'RestaurantApp/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar coordenadas');
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error);
      toast.error('Erro ao buscar localização do endereço');
      return null;
    }
  };

  // Buscar coordenadas do restaurante
  const loadRestaurantCoordinates = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('latitude, longitude, street, number, neighborhood, city, state, zipcode')
        .single();

      if (error) throw error;

      if (data?.latitude && data?.longitude) {
        setRestaurantCoords({
          latitude: data.latitude,
          longitude: data.longitude,
        });
        console.log(`✅ Coordenadas do restaurante carregadas: ${data.latitude}, ${data.longitude}`);
      } else if (data?.street && data?.city) {
        // Se não tem coordenadas salvas, tentar buscar
        const address = `${data.street}, ${data.number || ''}, ${data.neighborhood}, ${data.city}, ${data.state}`;
        const coords = await getCoordinatesFromAddress(address);
        
        if (coords) {
          // Salvar coordenadas no banco - usar single row update
          const { data: settingsData } = await supabase
            .from('restaurant_settings')
            .select('id')
            .single();
          
          if (settingsData) {
            await supabase
              .from('restaurant_settings')
              .update({
                latitude: coords.latitude,
                longitude: coords.longitude,
              })
              .eq('id', settingsData.id);
          }
          
          setRestaurantCoords(coords);
          console.log(`✅ Coordenadas do restaurante atualizadas: ${coords.latitude}, ${coords.longitude}`);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar coordenadas do restaurante:', error);
    }
  };

  // Buscar zonas de entrega - modificado para buscar sem restaurant_id se necessário
  const loadDeliveryZones = async (restaurantId?: string) => {
    try {
      let query = supabase
        .from('delivery_zones')
        .select('*')
        .eq('is_active', true)
        .order('min_distance');

      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setDeliveryZones(data || []);
      console.log(`✅ ${data?.length || 0} zonas de entrega carregadas`);
    } catch (error) {
      console.error('Erro ao carregar zonas de entrega:', error);
    }
  };

  // Carregar zonas e coordenadas automaticamente ao montar o hook
  useEffect(() => {
    const initialize = async () => {
      await loadRestaurantCoordinates();
      
      // Buscar restaurant_id
      const { data: settings } = await supabase
        .from('restaurant_settings')
        .select('id')
        .single();
      
      if (settings) {
        await loadDeliveryZones(settings.id);
      }
    };
    initialize();
  }, []);

  // Calcular taxa de entrega baseada na distância
  const calculateDeliveryFee = (distance: number): number => {
    const zone = deliveryZones.find(
      (z) => distance >= z.min_distance && distance < z.max_distance
    );

    return zone ? zone.fee : 0;
  };

  // Verificar se está dentro do raio de entrega
  const isWithinDeliveryRange = (distance: number, maxRange: number): boolean => {
    return distance <= maxRange;
  };

  // Calcular taxa e distância a partir do endereço do cliente
  const calculateFromAddress = async (
    customerAddress: AddressData
  ): Promise<{
    distance: number | null;
    fee: number;
    coordinates: Coordinates | null;
    isWithinRange: boolean;
  }> => {
    setLoading(true);

    try {
      // Se não há endereço completo, retorna taxa 0
      if (!customerAddress.street || !customerAddress.city) {
        setLoading(false);
        return { distance: null, fee: 0, coordinates: null, isWithinRange: true };
      }

      // Garantir que as zonas estão carregadas
      if (deliveryZones.length === 0) {
        const { data: settings } = await supabase
          .from('restaurant_settings')
          .select('id')
          .single();
        
        if (settings) {
          await loadDeliveryZones(settings.id);
        }
      }

      if (!restaurantCoords) {
        await loadRestaurantCoordinates();
      }

      if (!restaurantCoords) {
        console.warn('Coordenadas do restaurante não configuradas');
        setLoading(false);
        return { distance: null, fee: 0, coordinates: null, isWithinRange: true };
      }

      // Se já tem coordenadas salvas
      if (customerAddress.latitude && customerAddress.longitude) {
        const distance = calculateDistance(
          restaurantCoords.latitude,
          restaurantCoords.longitude,
          customerAddress.latitude,
          customerAddress.longitude
        );

        const fee = calculateDeliveryFee(distance);
        
        // Buscar raio máximo
        const { data: settings } = await supabase
          .from('restaurant_settings')
          .select('max_delivery_radius')
          .single();

        const maxRange = settings?.max_delivery_radius || 50;
        const withinRange = isWithinDeliveryRange(distance, maxRange);

        console.log(`📍 Distância: ${distance}km, Taxa: R$ ${fee.toFixed(2)}`);

        return {
          distance,
          fee,
          coordinates: {
            latitude: customerAddress.latitude,
            longitude: customerAddress.longitude,
          },
          isWithinRange: withinRange,
        };
      }

      // Buscar coordenadas do endereço do cliente
      const address = `${customerAddress.street}, ${customerAddress.number}, ${customerAddress.neighborhood}, ${customerAddress.city}, ${customerAddress.state}`;
      const coords = await getCoordinatesFromAddress(address);

      if (!coords) {
        toast.warning('Não foi possível calcular a distância. Taxa padrão aplicada.');
        return { distance: null, fee: 0, coordinates: null, isWithinRange: true };
      }

      const distance = calculateDistance(
        restaurantCoords.latitude,
        restaurantCoords.longitude,
        coords.latitude,
        coords.longitude
      );

      const fee = calculateDeliveryFee(distance);

      // Buscar raio máximo
      const { data: settings } = await supabase
        .from('restaurant_settings')
        .select('max_delivery_radius')
        .single();

      const maxRange = settings?.max_delivery_radius || 50;
      const withinRange = isWithinDeliveryRange(distance, maxRange);

      console.log(`📍 Distância: ${distance}km, Taxa: R$ ${fee.toFixed(2)}`);

      return { distance, fee, coordinates: coords, isWithinRange: withinRange };
    } catch (error) {
      console.error('Erro ao calcular taxa de entrega:', error);
      return { distance: null, fee: 0, coordinates: null, isWithinRange: true };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    calculateDistance,
    getCoordinatesFromAddress,
    loadRestaurantCoordinates,
    loadDeliveryZones,
    calculateDeliveryFee,
    isWithinDeliveryRange,
    calculateFromAddress,
    restaurantCoords,
    deliveryZones,
  };
};