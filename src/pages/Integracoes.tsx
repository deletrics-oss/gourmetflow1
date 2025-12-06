import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Save, Loader2, Facebook, MessageCircle, CheckCircle2 } from "lucide-react";
import { useRestaurant } from "@/hooks/useRestaurant";

export default function Integracoes() {
  const { restaurantId, loading: restaurantLoading } = useRestaurant();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    ifood_enabled: false,
    ifood_token: "",
    ninefood_enabled: false,
    ninefood_token: "",
    keeta_enabled: false,
    keeta_token: "",
    whatsapp_enabled: false,
    whatsapp_api_key: "",
    whatsapp_phone: "",
    whatsapp_webhook_url: "",
    facebook_enabled: false,
    facebook_business_id: "",
    facebook_access_token: "",
    facebook_phone_number_id: "",
  });

  useEffect(() => {
    if (restaurantId) {
      loadSettings();
    }
  }, [restaurantId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          ifood_enabled: !!data.ifood_token,
          ifood_token: data.ifood_token || "",
          ninefood_enabled: !!data.ninefood_token,
          ninefood_token: data.ninefood_token || "",
          keeta_enabled: !!data.keeta_token,
          keeta_token: data.keeta_token || "",
          whatsapp_enabled: !!data.whatsapp_api_key,
          whatsapp_api_key: data.whatsapp_api_key || "",
          whatsapp_phone: data.whatsapp_phone || "",
          whatsapp_webhook_url: data.whatsapp_webhook_url || "",
          facebook_enabled: !!data.facebook_access_token,
          facebook_business_id: data.facebook_business_id || "",
          facebook_access_token: data.facebook_access_token || "",
          facebook_phone_number_id: data.facebook_phone_number_id || "",
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error("Erro ao carregar configurações");
    }
  };

  const handleSave = async () => {
    if (!restaurantId) {
      toast.error("Restaurante não identificado");
      return;
    }

    setLoading(true);
    setSaved(false);
    try {
      const { data: existing } = await supabase
        .from('restaurant_settings')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      const dataToSave = {
        ifood_token: settings.ifood_enabled ? settings.ifood_token : null,
        ninefood_token: settings.ninefood_enabled ? settings.ninefood_token : null,
        keeta_token: settings.keeta_enabled ? settings.keeta_token : null,
        whatsapp_api_key: settings.whatsapp_enabled ? settings.whatsapp_api_key : null,
        whatsapp_phone: settings.whatsapp_enabled ? settings.whatsapp_phone : null,
        whatsapp_webhook_url: settings.whatsapp_enabled ? settings.whatsapp_webhook_url : null,
        facebook_business_id: settings.facebook_enabled ? settings.facebook_business_id : null,
        facebook_access_token: settings.facebook_enabled ? settings.facebook_access_token : null,
        facebook_phone_number_id: settings.facebook_enabled ? settings.facebook_phone_number_id : null,
      };

      if (existing) {
        const { error } = await supabase
          .from('restaurant_settings')
          .update(dataToSave)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('restaurant_settings')
          .insert([{ ...dataToSave, name: 'Restaurante', restaurant_id: restaurantId }]);
        if (error) throw error;
      }

      setSaved(true);
      toast.success("Configurações salvas com sucesso!");
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  if (restaurantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrações</h1>
          <p className="text-muted-foreground">
            Configure as integrações com plataformas de delivery e pagamento
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              Salvo!
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="delivery" className="space-y-4">
        <TabsList>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="social">Redes Sociais</TabsTrigger>
        </TabsList>

        <TabsContent value="delivery" className="space-y-4">
          {/* iFood */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">iF</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">iFood</h3>
                  <p className="text-sm text-muted-foreground">
                    Receba pedidos do iFood diretamente no sistema
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.ifood_enabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, ifood_enabled: checked })
                }
              />
            </div>

            {settings.ifood_enabled && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label htmlFor="ifood_token">Token de Acesso</Label>
                  <Input
                    id="ifood_token"
                    type="password"
                    value={settings.ifood_token}
                    onChange={(e) => 
                      setSettings({ ...settings, ifood_token: e.target.value })
                    }
                    placeholder="Cole aqui o token do iFood"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Obtenha o token no painel do iFood para Restaurantes
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* 99Food */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">99</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">99Food</h3>
                  <p className="text-sm text-muted-foreground">
                    Integração com a plataforma 99Food
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.ninefood_enabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, ninefood_enabled: checked })
                }
              />
            </div>

            {settings.ninefood_enabled && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label htmlFor="ninefood_token">Token de Acesso</Label>
                  <Input
                    id="ninefood_token"
                    type="password"
                    value={settings.ninefood_token}
                    onChange={(e) => 
                      setSettings({ ...settings, ninefood_token: e.target.value })
                    }
                    placeholder="Cole aqui o token do 99Food"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Keeta */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">K</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Keeta</h3>
                  <p className="text-sm text-muted-foreground">
                    Integração com Keeta (antigo iFood Delivery)
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.keeta_enabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, keeta_enabled: checked })
                }
              />
            </div>

            {settings.keeta_enabled && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label htmlFor="keeta_token">Token de Acesso</Label>
                  <Input
                    id="keeta_token"
                    type="password"
                    value={settings.keeta_token}
                    onChange={(e) => 
                      setSettings({ ...settings, keeta_token: e.target.value })
                    }
                    placeholder="Cole aqui o token do Keeta"
                  />
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-12 h-12 text-green-500" />
                <div>
                  <h3 className="text-lg font-semibold">WhatsApp Business API</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure o bot de atendimento via WhatsApp
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.whatsapp_enabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, whatsapp_enabled: checked })
                }
              />
            </div>

            {settings.whatsapp_enabled && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label htmlFor="whatsapp_api_key">API Key</Label>
                  <Input
                    id="whatsapp_api_key"
                    type="password"
                    value={settings.whatsapp_api_key}
                    onChange={(e) => 
                      setSettings({ ...settings, whatsapp_api_key: e.target.value })
                    }
                    placeholder="Chave de API do Evolution"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp_phone">Número do WhatsApp</Label>
                  <Input
                    id="whatsapp_phone"
                    value={settings.whatsapp_phone}
                    onChange={(e) => 
                      setSettings({ ...settings, whatsapp_phone: e.target.value })
                    }
                    placeholder="5511999999999"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp_webhook">Webhook URL</Label>
                  <Input
                    id="whatsapp_webhook"
                    value={settings.whatsapp_webhook_url}
                    onChange={(e) => 
                      setSettings({ ...settings, whatsapp_webhook_url: e.target.value })
                    }
                    placeholder="https://sua-api.com/webhook"
                  />
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Facebook className="w-12 h-12 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold">Facebook/Instagram</h3>
                  <p className="text-sm text-muted-foreground">
                    Integração com Meta Business para pedidos via DM
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.facebook_enabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, facebook_enabled: checked })
                }
              />
            </div>

            {settings.facebook_enabled && (
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label htmlFor="facebook_business_id">Business ID</Label>
                  <Input
                    id="facebook_business_id"
                    value={settings.facebook_business_id}
                    onChange={(e) => 
                      setSettings({ ...settings, facebook_business_id: e.target.value })
                    }
                    placeholder="ID da sua conta Business"
                  />
                </div>
                <div>
                  <Label htmlFor="facebook_access_token">Access Token</Label>
                  <Input
                    id="facebook_access_token"
                    type="password"
                    value={settings.facebook_access_token}
                    onChange={(e) => 
                      setSettings({ ...settings, facebook_access_token: e.target.value })
                    }
                    placeholder="Token de acesso da API"
                  />
                </div>
                <div>
                  <Label htmlFor="facebook_phone_id">Phone Number ID</Label>
                  <Input
                    id="facebook_phone_id"
                    value={settings.facebook_phone_number_id}
                    onChange={(e) => 
                      setSettings({ ...settings, facebook_phone_number_id: e.target.value })
                    }
                    placeholder="ID do número de telefone"
                  />
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}