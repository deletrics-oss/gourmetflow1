import { useState, useEffect } from 'react';
import { useCEP } from '@/hooks/useCEP';
import { useDeliveryFee } from '@/hooks/useDeliveryFee';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin, AlertTriangle, Navigation } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CustomerAddressFormProps {
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipcode: string;
    latitude?: number;
    longitude?: number;
  };
  onAddressChange: (address: any) => void;
  onDeliveryFeeChange: (fee: number, distance: number | null, coordinates: any) => void;
}

export const CustomerAddressForm = ({
  address,
  onAddressChange,
  onDeliveryFeeChange,
}: CustomerAddressFormProps) => {
  const { buscarCEP, loading: cepLoading } = useCEP();
  const { calculateFromAddress, loadRestaurantCoordinates, loadDeliveryZones } = useDeliveryFee();
  const { restaurant } = useRestaurant();
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<{
    distance: number | null;
    fee: number;
    isWithinRange: boolean;
  }>({
    distance: null,
    fee: 0,
    isWithinRange: true,
  });

  useEffect(() => {
    if (restaurant?.id) {
      loadRestaurantCoordinates();
      loadDeliveryZones(restaurant.id);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    // Calcular taxa quando endereço completo mudar
    if (address.street && address.number && address.neighborhood && address.city) {
      calculateFee();
    }
  }, [address.street, address.number, address.neighborhood, address.city]);

  const handleCEPChange = async (cep: string) => {
    onAddressChange({ ...address, zipcode: cep });

    if (cep.replace(/\D/g, '').length === 8) {
      const data = await buscarCEP(cep);
      if (data) {
        onAddressChange({
          ...address,
          zipcode: cep,
          street: data.street,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
        });
      }
    }
  };

  const calculateFee = async () => {
    if (!address.street || !address.number || !address.city) {
      return;
    }

    setCalculatingFee(true);
    try {
      const result = await calculateFromAddress(address);
      
      setDeliveryInfo({
        distance: result.distance,
        fee: result.fee,
        isWithinRange: result.isWithinRange,
      });

      onDeliveryFeeChange(result.fee, result.distance, result.coordinates);
    } catch (error) {
      console.error('Erro ao calcular taxa:', error);
    } finally {
      setCalculatingFee(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Endereço de Entrega
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="zipcode">CEP</Label>
          <div className="relative">
            <Input
              id="zipcode"
              value={address.zipcode}
              onChange={(e) => handleCEPChange(e.target.value)}
              placeholder="00000-000"
              maxLength={9}
            />
            {cepLoading && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="street">Rua</Label>
          <Input
            id="street"
            value={address.street}
            onChange={(e) =>
              onAddressChange({ ...address, street: e.target.value })
            }
            placeholder="Nome da rua"
            readOnly={cepLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="number">Número</Label>
            <Input
              id="number"
              value={address.number}
              onChange={(e) =>
                onAddressChange({ ...address, number: e.target.value })
              }
              placeholder="123"
            />
          </div>

          <div>
            <Label htmlFor="complement">Complemento</Label>
            <Input
              id="complement"
              value={address.complement}
              onChange={(e) =>
                onAddressChange({ ...address, complement: e.target.value })
              }
              placeholder="Apto 101"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input
            id="neighborhood"
            value={address.neighborhood}
            onChange={(e) =>
              onAddressChange({ ...address, neighborhood: e.target.value })
            }
            placeholder="Bairro"
            readOnly={cepLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={address.city}
              onChange={(e) =>
                onAddressChange({ ...address, city: e.target.value })
              }
              placeholder="Cidade"
              readOnly={cepLoading}
            />
          </div>

          <div>
            <Label htmlFor="state">Estado</Label>
            <Input
              id="state"
              value={address.state}
              onChange={(e) =>
                onAddressChange({ ...address, state: e.target.value })
              }
              placeholder="UF"
              maxLength={2}
              readOnly={cepLoading}
            />
          </div>
        </div>

        {/* Informações de Entrega */}
        {calculatingFee ? (
          <div className="flex items-center justify-center p-4 border rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">
              Calculando taxa de entrega...
            </span>
          </div>
        ) : deliveryInfo.distance !== null ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {deliveryInfo.distance} km
              </Badge>
              <Badge
                variant={deliveryInfo.fee > 0 ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                Taxa: R$ {deliveryInfo.fee.toFixed(2)}
              </Badge>
            </div>

            {!deliveryInfo.isWithinRange && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Este endereço está fora da área de entrega configurada!
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
