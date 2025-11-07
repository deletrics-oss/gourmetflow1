import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, Play, Trash2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

interface AudioAlert {
  id: string;
  name: string;
  description: string | null;
  audio_url: string | null;
  trigger_event: string;
  is_active: boolean;
}

const eventOptions = [
  { value: 'new_order', label: 'Novo Pedido', defaultAudio: '/audios/novopedido.mp3' },
  { value: 'new_order_online', label: 'Novo Pedido Online', defaultAudio: '/audios/novopedidoonline.mp3' },
  { value: 'kitchen_delay', label: 'Atraso na Cozinha', defaultAudio: '/audios/atrasocozinha.mp3' },
  { value: 'table_delay', label: 'Atraso na Mesa', defaultAudio: '/audios/atrasomesa.mp3' },
  { value: 'low_stock', label: 'Estoque Baixo', defaultAudio: '/audios/estoquebaixo.mp3' },
  { value: 'order_cancelled', label: 'Pedido Cancelado', defaultAudio: '' },
  { value: 'payment_received', label: 'Pagamento Recebido', defaultAudio: '' },
];

export function AudioManager() {
  const [audioAlerts, setAudioAlerts] = useState<AudioAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_event: '',
    audio_url: '',
    is_active: true,
  });

  useEffect(() => {
    fetchAudioAlerts();
  }, []);

  const fetchAudioAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_alerts')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAudioAlerts(data || []);
    } catch (error) {
      console.error('Error fetching audio alerts:', error);
      toast.error('Erro ao carregar alertas sonoros');
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (eventValue: string) => {
    const event = eventOptions.find(e => e.value === eventValue);
    setFormData({ 
      ...formData, 
      trigger_event: eventValue,
      audio_url: event?.defaultAudio || formData.audio_url,
      name: event?.label || formData.name,
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.trigger_event) {
      toast.error('Nome e tipo de evento são obrigatórios');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('audio_alerts')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;
        toast.success('Alerta sonoro atualizado!');
      } else {
        const { error } = await supabase
          .from('audio_alerts')
          .insert([formData]);

        if (error) throw error;
        toast.success('Alerta sonoro criado!');
      }

      setFormData({
        name: '',
        description: '',
        trigger_event: '',
        audio_url: '',
        is_active: true,
      });
      setEditingId(null);
      fetchAudioAlerts();
    } catch (error) {
      console.error('Error saving audio alert:', error);
      toast.error('Erro ao salvar alerta sonoro');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este alerta sonoro?')) return;

    try {
      const { error } = await supabase
        .from('audio_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Alerta sonoro excluído!');
      fetchAudioAlerts();
    } catch (error) {
      console.error('Error deleting audio alert:', error);
      toast.error('Erro ao excluir alerta sonoro');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('audio_alerts')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      fetchAudioAlerts();
      toast.success(isActive ? 'Alerta ativado' : 'Alerta desativado');
    } catch (error) {
      console.error('Error toggling audio alert:', error);
      toast.error('Erro ao atualizar alerta');
    }
  };

  const playAudio = (url: string) => {
    if (!url) {
      toast.error('URL de áudio não configurada');
      return;
    }
    const audio = new Audio(url);
    audio.play().catch(() => toast.error('Erro ao reproduzir áudio'));
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Volume2 className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">
              {editingId ? 'Editar Alerta Sonoro' : 'Novo Alerta Sonoro'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure alertas personalizados para eventos do sistema
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="trigger_event">Tipo de Evento *</Label>
            <Select
              value={formData.trigger_event}
              onValueChange={handleEventChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o evento" />
              </SelectTrigger>
              <SelectContent>
                {eventOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do Alerta *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Pedido Pronto"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição opcional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audio_url">URL/Caminho do Áudio</Label>
            <div className="flex gap-2">
              <Input
                id="audio_url"
                value={formData.audio_url}
                onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                placeholder="/audios/novopedido.mp3"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => playAudio(formData.audio_url)}
                disabled={!formData.audio_url}
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use /audios/[nome].mp3 para arquivos locais ou URL externa
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Alerta ativo</Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="gap-2">
              <Upload className="h-4 w-4" />
              {editingId ? 'Atualizar' : 'Adicionar'} Alerta
            </Button>
            {editingId && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    name: '',
                    description: '',
                    trigger_event: '',
                    audio_url: '',
                    is_active: true,
                  });
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Alertas Cadastrados</h3>
        {audioAlerts.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhum alerta sonoro cadastrado
          </Card>
        ) : (
          audioAlerts.map((alert) => (
            <Card key={alert.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{alert.name}</h4>
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      {eventOptions.find((e) => e.value === alert.trigger_event)?.label}
                    </span>
                  </div>
                  {alert.description && (
                    <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                  )}
                  {alert.audio_url && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {alert.audio_url}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={alert.is_active}
                    onCheckedChange={(checked) => handleToggle(alert.id, checked)}
                  />
                  {alert.audio_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => playAudio(alert.audio_url!)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingId(alert.id);
                      setFormData({
                        name: alert.name,
                        description: alert.description || '',
                        trigger_event: alert.trigger_event,
                        audio_url: alert.audio_url || '',
                        is_active: alert.is_active,
                      });
                    }}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(alert.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
