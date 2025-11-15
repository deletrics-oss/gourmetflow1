import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Copy, Save, Loader2, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ZapBotSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_phone_number: "",
    facebook_access_token: "",
    facebook_business_id: "",
    facebook_phone_number_id: "",
    whatsapp_phone: "",
    ifood_token: "",
    ninefood_token: "",
    keeta_token: "",
    apify_api_key: "",
  });

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  const { data: currentSettings, isLoading } = useQuery({
    queryKey: ["restaurant-settings-whatsapp"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (currentSettings) {
      setSettings({
        twilio_account_sid: currentSettings.twilio_account_sid || "",
        twilio_auth_token: currentSettings.twilio_auth_token || "",
        twilio_phone_number: currentSettings.twilio_phone_number || "",
        facebook_access_token: currentSettings.facebook_access_token || "",
        facebook_business_id: currentSettings.facebook_business_id || "",
        facebook_phone_number_id: currentSettings.facebook_phone_number_id || "",
        whatsapp_phone: currentSettings.whatsapp_phone || "",
        ifood_token: currentSettings.ifood_token || "",
        ninefood_token: currentSettings.ninefood_token || "",
        keeta_token: currentSettings.keeta_token || "",
        apify_api_key: currentSettings.apify_api_key || "",
      });
    }
  }, [currentSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("restaurant_settings")
        .update(settings)
        .eq("id", currentSettings?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-settings-whatsapp"] });
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações: " + error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "URL copiada para a área de transferência",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle>URL do Webhook</CardTitle>
          <CardDescription>
            Use esta URL para configurar o webhook no Twilio ou Meta (WhatsApp Business)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-sm" />
            <Button variant="outline" onClick={() => copyToClipboard(webhookUrl)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Alert className="mt-4">
            <AlertDescription className="text-sm space-y-2">
              <p className="font-medium">Instruções Twilio:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Acesse o console do Twilio</li>
                <li>Vá em Phone Numbers → Manage → Active numbers</li>
                <li>Selecione seu número WhatsApp</li>
                <li>Em "Messaging", cole a URL acima no campo "A MESSAGE COMES IN"</li>
                <li>Salve as alterações</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* WhatsApp Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="whatsapp_phone">Número WhatsApp</Label>
              <Input
                id="whatsapp_phone"
                value={settings.whatsapp_phone}
                onChange={(e) =>
                  setSettings({ ...settings, whatsapp_phone: e.target.value })
                }
                placeholder="+55 11 98765-4321"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Twilio Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Twilio</CardTitle>
          <CardDescription>
            Configure suas credenciais do Twilio para integração WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="twilio_account_sid">Account SID</Label>
              <Input
                id="twilio_account_sid"
                type="password"
                value={settings.twilio_account_sid}
                onChange={(e) =>
                  setSettings({ ...settings, twilio_account_sid: e.target.value })
                }
                placeholder="ACxxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio_auth_token">Auth Token</Label>
              <Input
                id="twilio_auth_token"
                type="password"
                value={settings.twilio_auth_token}
                onChange={(e) =>
                  setSettings({ ...settings, twilio_auth_token: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio_phone_number">Número Twilio</Label>
              <Input
                id="twilio_phone_number"
                value={settings.twilio_phone_number}
                onChange={(e) =>
                  setSettings({ ...settings, twilio_phone_number: e.target.value })
                }
                placeholder="whatsapp:+14155238886"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meta (Facebook) Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Meta (WhatsApp Business)</CardTitle>
          <CardDescription>
            Configure sua integração com WhatsApp Business API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="facebook_access_token">Access Token</Label>
              <Input
                id="facebook_access_token"
                type="password"
                value={settings.facebook_access_token}
                onChange={(e) =>
                  setSettings({ ...settings, facebook_access_token: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook_business_id">Business ID</Label>
              <Input
                id="facebook_business_id"
                value={settings.facebook_business_id}
                onChange={(e) =>
                  setSettings({ ...settings, facebook_business_id: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook_phone_number_id">Phone Number ID</Label>
              <Input
                id="facebook_phone_number_id"
                value={settings.facebook_phone_number_id}
                onChange={(e) =>
                  setSettings({ ...settings, facebook_phone_number_id: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Integrações de Delivery</CardTitle>
          <CardDescription>
            Configure tokens para iFood, 99Food e Keeta via Apify
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="apify_api_key">Apify API Key</Label>
              <Input
                id="apify_api_key"
                type="password"
                value={settings.apify_api_key}
                onChange={(e) =>
                  setSettings({ ...settings, apify_api_key: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ifood_token">iFood Token/ID</Label>
              <Input
                id="ifood_token"
                value={settings.ifood_token}
                onChange={(e) =>
                  setSettings({ ...settings, ifood_token: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ninefood_token">99Food Token/ID</Label>
              <Input
                id="ninefood_token"
                value={settings.ninefood_token}
                onChange={(e) =>
                  setSettings({ ...settings, ninefood_token: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keeta_token">Keeta Token/ID</Label>
              <Input
                id="keeta_token"
                value={settings.keeta_token}
                onChange={(e) =>
                  setSettings({ ...settings, keeta_token: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          size="lg"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
