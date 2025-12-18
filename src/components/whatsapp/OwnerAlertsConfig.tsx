import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Bell, Save, Loader2, Phone, Users } from "lucide-react";

interface Props {
  restaurantId: string;
}

export function OwnerAlertsConfig({ restaurantId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    owner_whatsapp: "",
    whatsapp_group_id: "",
    notify_owner_new_order: true,
    notify_owner_cancellation: true,
    notify_owner_complaint: true,
    whatsapp_server_url: "",
  });

  useEffect(() => {
    loadConfig();
  }, [restaurantId]);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("owner_whatsapp, whatsapp_group_id, notify_owner_new_order, notify_owner_cancellation, notify_owner_complaint, whatsapp_server_url")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setConfig({
          owner_whatsapp: data.owner_whatsapp || "",
          whatsapp_group_id: data.whatsapp_group_id || "",
          notify_owner_new_order: data.notify_owner_new_order ?? true,
          notify_owner_cancellation: data.notify_owner_cancellation ?? true,
          notify_owner_complaint: data.notify_owner_complaint ?? true,
          whatsapp_server_url: data.whatsapp_server_url || "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("restaurant_settings")
        .update({
          owner_whatsapp: config.owner_whatsapp || null,
          whatsapp_group_id: config.whatsapp_group_id || null,
          notify_owner_new_order: config.notify_owner_new_order,
          notify_owner_cancellation: config.notify_owner_cancellation,
          notify_owner_complaint: config.notify_owner_complaint,
          whatsapp_server_url: config.whatsapp_server_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      toast.success("Configurações salvas!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alertas para Dono
        </h2>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Phone className="h-4 w-4" />Contato</h3>
          <div>
            <Label>WhatsApp do Dono</Label>
            <Input
              value={config.owner_whatsapp}
              onChange={(e) => setConfig({ ...config, owner_whatsapp: e.target.value })}
              placeholder="5511999999999"
            />
            <p className="text-xs text-muted-foreground mt-1">Formato: código do país + DDD + número</p>
          </div>
          <div>
            <Label>ID do Grupo (Opcional)</Label>
            <Input
              value={config.whatsapp_group_id}
              onChange={(e) => setConfig({ ...config, whatsapp_group_id: e.target.value })}
              placeholder="123456789@g.us"
            />
            <p className="text-xs text-muted-foreground mt-1">Se preenchido, alertas serão enviados ao grupo</p>
          </div>
          <div>
            <Label>URL do Servidor WhatsApp</Label>
            <Input
              value={config.whatsapp_server_url}
              onChange={(e) => setConfig({ ...config, whatsapp_server_url: e.target.value })}
              placeholder="http://72.60.246.250:3022"
            />
            <p className="text-xs text-muted-foreground mt-1">URL do seu servidor WhatsApp</p>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Notificações</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">🆕 Novos Pedidos</p>
                <p className="text-xs text-muted-foreground">Receber alerta a cada novo pedido</p>
              </div>
              <Switch
                checked={config.notify_owner_new_order}
                onCheckedChange={(checked) => setConfig({ ...config, notify_owner_new_order: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">❌ Cancelamentos</p>
                <p className="text-xs text-muted-foreground">Receber alerta quando pedido for cancelado</p>
              </div>
              <Switch
                checked={config.notify_owner_cancellation}
                onCheckedChange={(checked) => setConfig({ ...config, notify_owner_cancellation: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">⚠️ Reclamações (IA)</p>
                <p className="text-xs text-muted-foreground">IA detecta mensagens de insatisfação</p>
              </div>
              <Switch
                checked={config.notify_owner_complaint}
                onCheckedChange={(checked) => setConfig({ ...config, notify_owner_complaint: checked })}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
