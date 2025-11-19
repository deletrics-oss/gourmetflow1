import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useDeliveryFee } from '@/hooks/useDeliveryFee';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { MapPin, Plus, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DeliveryZone {
  id?: string;
  min_distance: number;
  max_distance: number;
  fee: number;
  is_active: boolean;
}

const DEFAULT_ZONES: Omit<DeliveryZone, 'id'>[] = [
  { min_distance: 0, max_distance: 2, fee: 5, is_active: true },
  { min_distance: 2, max_distance: 5, fee: 10, is_active: true },
  { min_distance: 5, max_distance: 10, fee: 15, is_active: true },
  { min_distance: 10, max_distance: 15, fee: 20, is_active: true },
  { min_distance: 15, max_distance: 20, fee: 25, is_active: true },
  { min_distance: 20, max_distance: 30, fee: 30, is_active: true },
  { min_distance: 30, max_distance: 40, fee: 35, is_active: true },
  { min_distance: 40, max_distance: 50, fee: 40, is_active: true },
];

export const DeliveryZonesManager = () => {
  const { restaurant } = useRestaurant();
  const { getCoordinatesFromAddress } = useDeliveryFee();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingCoords, setUpdatingCoords] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [maxRadius, setMaxRadius] = useState(50);

  useEffect(() => {
    if (restaurant?.id) {
      loadZones();
      loadSettings();
    }
  }, [restaurant?.id]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
      setMaxRadius(data?.max_delivery_radius || 50);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const loadZones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('restaurant_id', restaurant?.id)
        .order('min_distance');

      if (error) throw error;

      if (data && data.length > 0) {
        setZones(data);
      } else {
        // Se não tem zonas, criar as padrões
        await restoreDefaults();
      }
    } catch (error) {
      console.error('Erro ao carregar zonas:', error);
      toast.error('Erro ao carregar zonas de entrega');
    } finally {
      setLoading(false);
    }
  };

  const updateRestaurantCoordinates = async () => {
    if (!settings?.street || !settings?.city) {
      toast.error('Configure o endereço do restaurante primeiro');
      return;
    }

    setUpdatingCoords(true);
    try {
      const address = `${settings.street}, ${settings.number || ''}, ${settings.neighborhood}, ${settings.city}, ${settings.state}`;
      const coords = await getCoordinatesFromAddress(address);

      if (!coords) {
        toast.error('Não foi possível obter as coordenadas do endereço');
        return;
      }

      const { error } = await supabase
        .from('restaurant_settings')
        .update({
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
        .eq('id', settings.id);

      if (error) throw error;

      setSettings((prev: any) => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));

      toast.success('Coordenadas atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar coordenadas:', error);
      toast.error('Erro ao atualizar coordenadas');
    } finally {
      setUpdatingCoords(false);
    }
  };

  const saveZone = async (zone: DeliveryZone) => {
    try {
      if (zone.id) {
        const { error } = await supabase
          .from('delivery_zones')
          .update({
            min_distance: zone.min_distance,
            max_distance: zone.max_distance,
            fee: zone.fee,
            is_active: zone.is_active,
          })
          .eq('id', zone.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('delivery_zones')
          .insert({
            restaurant_id: restaurant?.id,
            min_distance: zone.min_distance,
            max_distance: zone.max_distance,
            fee: zone.fee,
            is_active: zone.is_active,
          });

        if (error) throw error;
      }

      await loadZones();
      toast.success('Zona salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar zona:', error);
      toast.error('Erro ao salvar zona');
    }
  };

  const deleteZone = async (id: string) => {
    try {
      const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadZones();
      toast.success('Zona removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover zona:', error);
      toast.error('Erro ao remover zona');
    }
  };

  const restoreDefaults = async () => {
    try {
      setLoading(true);

      // Remover zonas existentes
      if (zones.length > 0) {
        await supabase
          .from('delivery_zones')
          .delete()
          .eq('restaurant_id', restaurant?.id);
      }

      // Inserir zonas padrão
      const { error } = await supabase
        .from('delivery_zones')
        .insert(
          DEFAULT_ZONES.map((zone) => ({
            ...zone,
            restaurant_id: restaurant?.id,
          }))
        );

      if (error) throw error;

      await loadZones();
      toast.success('Zonas restauradas para valores padrão!');
    } catch (error) {
      console.error('Erro ao restaurar padrões:', error);
      toast.error('Erro ao restaurar valores padrão');
    } finally {
      setLoading(false);
    }
  };

  const addNewZone = () => {
    const lastZone = zones[zones.length - 1];
    const newZone: DeliveryZone = {
      min_distance: lastZone ? lastZone.max_distance : 0,
      max_distance: lastZone ? lastZone.max_distance + 10 : 10,
      fee: lastZone ? lastZone.fee + 5 : 5,
      is_active: true,
    };
    setZones([...zones, newZone]);
  };

  const updateMaxRadius = async () => {
    try {
      const { error } = await supabase
        .from('restaurant_settings')
        .update({ max_delivery_radius: maxRadius })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('Raio máximo atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar raio máximo:', error);
      toast.error('Erro ao atualizar raio máximo');
    }
  };

  return (
    <div className="space-y-6">
      {/* Coordenadas do Restaurante */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Localização do Restaurante
          </CardTitle>
          <CardDescription>
            Configure as coordenadas do restaurante para cálculo de distância
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Endereço:</strong>{' '}
                {settings.street}, {settings.number} - {settings.neighborhood},{' '}
                {settings.city}/{settings.state} - CEP: {settings.zipcode}
              </p>
              
              {settings.latitude && settings.longitude ? (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Lat: {settings.latitude.toFixed(6)}
                  </Badge>
                  <Badge variant="outline">
                    Lng: {settings.longitude.toFixed(6)}
                  </Badge>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Coordenadas não configuradas. Clique no botão abaixo para buscar automaticamente.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Button
            onClick={updateRestaurantCoordinates}
            disabled={updatingCoords}
          >
            {updatingCoords ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Atualizar Coordenadas
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Raio Máximo */}
      <Card>
        <CardHeader>
          <CardTitle>Raio Máximo de Entrega</CardTitle>
          <CardDescription>
            Defina a distância máxima aceita para entregas (em km)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="maxRadius">Raio Máximo (km)</Label>
              <Input
                id="maxRadius"
                type="number"
                value={maxRadius}
                onChange={(e) => setMaxRadius(Number(e.target.value))}
                min="1"
                step="1"
              />
            </div>
            <Button onClick={updateMaxRadius}>Salvar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Zonas de Entrega */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Zonas de Entrega</CardTitle>
              <CardDescription>
                Configure as faixas de distância e valores de entrega
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={restoreDefaults} disabled={loading}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar Padrões
              </Button>
              <Button onClick={addNewZone}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Zona
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Distância Mínima (km)</TableHead>
                  <TableHead>Distância Máxima (km)</TableHead>
                  <TableHead>Taxa (R$)</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone, index) => (
                  <TableRow key={zone.id || index}>
                    <TableCell>
                      <Input
                        type="number"
                        value={zone.min_distance}
                        onChange={(e) => {
                          const newZones = [...zones];
                          newZones[index].min_distance = Number(e.target.value);
                          setZones(newZones);
                        }}
                        onBlur={() => saveZone(zone)}
                        min="0"
                        step="0.1"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={zone.max_distance}
                        onChange={(e) => {
                          const newZones = [...zones];
                          newZones[index].max_distance = Number(e.target.value);
                          setZones(newZones);
                        }}
                        onBlur={() => saveZone(zone)}
                        min="0"
                        step="0.1"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={zone.fee}
                        onChange={(e) => {
                          const newZones = [...zones];
                          newZones[index].fee = Number(e.target.value);
                          setZones(newZones);
                        }}
                        onBlur={() => saveZone(zone)}
                        min="0"
                        step="0.01"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={zone.is_active}
                        onCheckedChange={(checked) => {
                          const newZones = [...zones];
                          newZones[index].is_active = checked;
                          setZones(newZones);
                          saveZone(newZones[index]);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {zone.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteZone(zone.id!)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
