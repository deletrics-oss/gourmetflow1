import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  Facebook,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Info,
  Smartphone,
  PlayCircle,
  Beaker,
  Zap
} from "lucide-react";
import { useRestaurant } from "@/hooks/useRestaurant";

export default function Integracoes() {
  const { restaurantId, loading: restaurantLoading } = useRestaurant();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [generatingOrder, setGeneratingOrder] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    // iFood - API Oficial
    ifood_enabled: false,
    ifood_client_id: "",
    ifood_client_secret: "",
    ifood_merchant_id: "",
    // 99Food
    ninefood_enabled: false,
    ninefood_token: "",
    // Keeta
    keeta_enabled: false,
    keeta_token: "",
    // WhatsApp
    whatsapp_enabled: false,
    whatsapp_api_key: "",
    whatsapp_phone: "",
    whatsapp_webhook_url: "",
    // Facebook/Instagram
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
        // Parse ifood_token as JSON if it contains client_id/client_secret/merchant_id
        let ifoodData = { client_id: "", client_secret: "", merchant_id: "" };
        if (data.ifood_token) {
          try {
            ifoodData = JSON.parse(data.ifood_token);
          } catch {
            // Legacy format - single token
            ifoodData = { client_id: "", client_secret: "", merchant_id: data.ifood_token };
          }
        }

        setSettings({
          ifood_enabled: !!data.ifood_token,
          ifood_client_id: ifoodData.client_id || "",
          ifood_client_secret: ifoodData.client_secret || "",
          ifood_merchant_id: ifoodData.merchant_id || "",
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

  const handleTestConnection = async (platform: 'ifood' | '99food' | 'keeta') => {
    if (!restaurantId) {
      toast.error("Restaurante não identificado");
      return;
    }

    setTesting(platform);
    try {
      let functionName = '';
      switch (platform) {
        case 'ifood':
          functionName = 'ifood-auth';
          break;
        case '99food':
          functionName = 'ninefood-orders';
          break;
        case 'keeta':
          functionName = 'keeta-orders';
          break;
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: 'validate', restaurantId }
      });

      if (error) throw error;

      if (data.success || data.valid) {
        toast.success(`${platform.toUpperCase()}: Conexão válida!`);
      } else {
        toast.error(data.message || `Erro ao validar ${platform}`);
      }
    } catch (error: any) {
      console.error(`Erro ao testar ${platform}:`, error);
      toast.error(error.message || `Erro ao testar conexão ${platform}`);
    } finally {
      setTesting(null);
    }
  };

  // Dados para simulação local
  const mockNames = [
    'Maria Silva', 'João Santos', 'Ana Oliveira', 'Pedro Costa',
    'Juliana Souza', 'Lucas Ferreira', 'Fernanda Lima', 'Ricardo Almeida'
  ];

  const mockAddresses = [
    'Rua das Flores, 123 - Centro', 'Av. Brasil, 456 - Jd. América',
    'Rua São Paulo, 789 - Vila Nova', 'Av. Paulista, 1000 - Bela Vista'
  ];

  const mockItems = {
    default: [
      { name: 'X-Burguer Especial', price: 25.90 },
      { name: 'Pizza Calabresa', price: 45.00 },
      { name: 'Açaí 500ml', price: 18.00 },
      { name: 'Refrigerante 2L', price: 12.00 }
    ]
  };

  const handleGenerateTestOrder = async (platform: string) => {
    if (!restaurantId) {
      toast.error("Restaurante não identificado");
      return;
    }

    setGeneratingOrder(platform);
    try {
      // Simulação Local no Frontend
      const numItems = Math.floor(Math.random() * 3) + 1;
      const selectedItems = [];
      let subtotal = 0;

      for (let i = 0; i < numItems; i++) {
        const item = mockItems.default[Math.floor(Math.random() * mockItems.default.length)];
        const qty = Math.floor(Math.random() * 2) + 1;
        selectedItems.push({
          name: item.name,
          quantity: qty,
          unit_price: item.price,
          total_price: item.price * qty,
          notes: Math.random() > 0.7 ? 'Sem cebola' : null,
        });
        subtotal += item.price * qty;
      }

      const deliveryFee = 5.00;
      const total = subtotal + deliveryFee;

      // 1. Criar o Pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: mockNames[Math.floor(Math.random() * mockNames.length)],
          customer_phone: '11999999999',
          order_number: `TEST-${Math.floor(Math.random() * 1000)}`,
          subtotal: subtotal,
          delivery_fee: deliveryFee,
          total: total,
          status: 'new',
          delivery_type: 'delivery',
          delivery_address: {
            street: mockAddresses[Math.floor(Math.random() * mockAddresses.length)],
            number: '123',
            city: 'Cidade Exemplo'
          },
          payment_method: 'pix',
          notes: `Pedido de teste ${platform.toUpperCase()}`,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Criar Itens do Pedido
      const orderItemsData = selectedItems.map(item => ({
        order_id: order.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      toast.success(`Pedido de teste ${platform.toUpperCase()} gerado com sucesso!`);
    } catch (error: any) {
      console.error("Erro ao gerar pedido de teste:", error);
      toast.error(error.message || "Erro ao gerar pedido");
    } finally {
      setGeneratingOrder(null);
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

      // Store iFood credentials as JSON
      const ifoodToken = settings.ifood_enabled
        ? JSON.stringify({
          client_id: settings.ifood_client_id,
          client_secret: settings.ifood_client_secret,
          merchant_id: settings.ifood_merchant_id,
        })
        : null;

      const dataToSave = {
        ifood_token: ifoodToken,
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
            Configure as integrações com plataformas de delivery e comunicação
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
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="agregadores">Agregadores</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="social">Redes Sociais</TabsTrigger>
        </TabsList>

        <TabsContent value="delivery" className="space-y-4">
          {/* Modo Demonstração */}
          <Card className="p-6 border-dashed border-2 bg-muted/30">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Beaker className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Modo de Demonstração</h3>
                  <p className="text-sm text-muted-foreground">
                    Simule pedidos para ver o fluxo no painel de pedidos online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="demo-mode" className="text-sm font-medium">Ativar Modo Teste</Label>
                <Switch
                  id="demo-mode"
                  checked={demoMode}
                  onCheckedChange={setDemoMode}
                />
              </div>
            </div>

            {demoMode && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-background rounded-lg border">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    iFood Simulator
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                    onClick={() => handleGenerateTestOrder('ifood')}
                    disabled={generatingOrder !== null}
                  >
                    {generatingOrder === 'ifood' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                    Novo Pedido iFood
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-yellow-600">
                    <span className="w-2 h-2 rounded-full bg-yellow-600 animate-pulse" />
                    99Food Simulator
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200"
                    onClick={() => handleGenerateTestOrder('99food')}
                    disabled={generatingOrder !== null}
                  >
                    {generatingOrder === '99food' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                    Novo Pedido 99Food
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                    Keeta Simulator
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                    onClick={() => handleGenerateTestOrder('keeta')}
                    disabled={generatingOrder !== null}
                  >
                    {generatingOrder === 'keeta' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                    Novo Pedido Keeta
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Aviso Importante */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Importante sobre integrações de delivery</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p>
                As plataformas <strong>iFood, 99Food e Keeta</strong> requerem cadastro oficial como integrador.
                A integração direta só é possível após aprovação das plataformas.
              </p>
              <p className="text-sm">
                Recomendamos usar <strong>agregadores homologados</strong> como Anota AI ou Hubster
                para receber pedidos de múltiplas plataformas em um único painel.
              </p>
            </AlertDescription>
          </Alert>

          {/* iFood - API Oficial */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">iF</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">iFood - API Oficial</h3>
                  <p className="text-sm text-muted-foreground">
                    Integração via API oficial do iFood Developer
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
                <Alert variant="default" className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <p className="font-medium mb-2">Como obter as credenciais:</p>
                    <ol className="list-decimal list-inside text-sm space-y-1">
                      <li>Acesse <a href="https://developer.ifood.com.br" target="_blank" rel="noopener" className="underline font-medium">developer.ifood.com.br</a></li>
                      <li>Crie uma conta de desenvolvedor</li>
                      <li>Registre seu aplicativo para obter Client ID e Secret</li>
                      <li>Vincule seu restaurante para obter o Merchant ID</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="ifood_client_id">Client ID</Label>
                    <Input
                      id="ifood_client_id"
                      value={settings.ifood_client_id}
                      onChange={(e) =>
                        setSettings({ ...settings, ifood_client_id: e.target.value })
                      }
                      placeholder="Seu Client ID do iFood"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ifood_client_secret">Client Secret</Label>
                    <Input
                      id="ifood_client_secret"
                      type="password"
                      value={settings.ifood_client_secret}
                      onChange={(e) =>
                        setSettings({ ...settings, ifood_client_secret: e.target.value })
                      }
                      placeholder="Seu Client Secret"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="ifood_merchant_id">Merchant ID (ID do Restaurante)</Label>
                  <Input
                    id="ifood_merchant_id"
                    value={settings.ifood_merchant_id}
                    onChange={(e) =>
                      setSettings({ ...settings, ifood_merchant_id: e.target.value })
                    }
                    placeholder="ID do seu restaurante no iFood"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Encontre este ID no Portal do Parceiro iFood ou na área de desenvolvedor
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://developer.ifood.com.br" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Acessar iFood Developer
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleTestConnection('ifood')}
                    disabled={testing === 'ifood' || !settings.ifood_client_id}
                  >
                    {testing === 'ifood' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <PlayCircle className="mr-2 h-4 w-4" />
                    )}
                    Testar Conexão
                  </Button>
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
                    API não disponível publicamente
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
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    A 99Food <strong>não possui API pública</strong> para integração direta.
                    Recomendamos usar um <strong>agregador homologado</strong> como Anota AI ou Hubster
                    para receber pedidos desta plataforma.
                  </AlertDescription>
                </Alert>
                <div>
                  <Label htmlFor="ninefood_token">Token de Acesso (se obtido via parceria)</Label>
                  <Input
                    id="ninefood_token"
                    type="password"
                    value={settings.ninefood_token}
                    onChange={(e) =>
                      setSettings({ ...settings, ninefood_token: e.target.value })
                    }
                    placeholder="Token obtido via parceria oficial"
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
                    API não disponível publicamente
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
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    A Keeta <strong>não possui API pública</strong> para integração direta.
                    Recomendamos usar um <strong>agregador homologado</strong> para receber pedidos.
                  </AlertDescription>
                </Alert>
                <div>
                  <Label htmlFor="keeta_token">Token de Acesso (se obtido via parceria)</Label>
                  <Input
                    id="keeta_token"
                    type="password"
                    value={settings.keeta_token}
                    onChange={(e) =>
                      setSettings({ ...settings, keeta_token: e.target.value })
                    }
                    placeholder="Token obtido via parceria oficial"
                  />
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Nova aba de Agregadores */}
        <TabsContent value="agregadores" className="space-y-4">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Recomendado</AlertTitle>
            <AlertDescription className="text-green-700">
              Agregadores são a forma mais fácil de receber pedidos de múltiplas plataformas
              (iFood, 99Food, Keeta, Rappi) em um único painel integrado ao seu sistema.
            </AlertDescription>
          </Alert>

          {/* Anota AI */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Anota AI</h3>
                <p className="text-sm text-muted-foreground">
                  Agregador homologado pelo iFood com atendente virtual
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm">
                <strong>Recursos:</strong>
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Recebe pedidos de iFood, 99Food, Rappi e WhatsApp</li>
                <li>Atendente virtual para WhatsApp (bot)</li>
                <li>Cardápio digital incluso</li>
                <li>API disponível para integração</li>
                <li>Homologado oficialmente pelo iFood</li>
              </ul>
              <Button variant="outline" asChild>
                <a href="https://anota.ai" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Conhecer Anota AI
                </a>
              </Button>
            </div>
          </Card>

          {/* Hubster */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Hubster</h3>
                <p className="text-sm text-muted-foreground">
                  Plataforma completa de gestão de delivery
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm">
                <strong>Recursos:</strong>
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Integração com todos os principais marketplaces</li>
                <li>Gestão unificada de cardápio</li>
                <li>Relatórios e analytics</li>
                <li>API robusta para integração</li>
                <li>Suporte para múltiplas lojas</li>
              </ul>
              <Button variant="outline" asChild>
                <a href="https://www.hubster.com.br" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Conhecer Hubster
                </a>
              </Button>
            </div>
          </Card>

          {/* Instruções de Integração */}
          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold mb-3">Como integrar com agregadores</h3>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
              <li>Escolha e contrate um agregador (Anota AI, Hubster, etc.)</li>
              <li>Configure suas contas do iFood, 99Food, etc. no agregador</li>
              <li>Solicite as credenciais de API do agregador</li>
              <li>Entre em contato conosco para configurar o webhook de recebimento</li>
              <li>Os pedidos aparecerão automaticamente no seu painel</li>
            </ol>
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
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <Info className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <p className="font-medium mb-2">Opções de integração WhatsApp:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li><strong>Evolution API:</strong> Solução open-source (requer servidor próprio)</li>
                      <li><strong>Twilio:</strong> API oficial paga com suporte completo</li>
                      <li><strong>Meta Business:</strong> API oficial do WhatsApp Business</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="whatsapp_api_key">API Key / Token</Label>
                  <Input
                    id="whatsapp_api_key"
                    type="password"
                    value={settings.whatsapp_api_key}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp_api_key: e.target.value })
                    }
                    placeholder="Chave de API (Evolution, Twilio ou Meta)"
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
                  <Label htmlFor="whatsapp_webhook">Webhook URL (opcional)</Label>
                  <Input
                    id="whatsapp_webhook"
                    value={settings.whatsapp_webhook_url}
                    onChange={(e) =>
                      setSettings({ ...settings, whatsapp_webhook_url: e.target.value })
                    }
                    placeholder="https://sua-api.com/webhook"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL para receber notificações de mensagens
                  </p>
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
                <Button variant="outline" size="sm" asChild>
                  <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Acessar Meta for Developers
                  </a>
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
