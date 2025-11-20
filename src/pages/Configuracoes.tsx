import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, Info, Palette, Volume2, DollarSign, Gift, Truck, MapPin, CreditCard } from "lucide-react";
import { DeliveryZonesManager } from "@/components/delivery/DeliveryZonesManager";
import { ThemeSelector } from "@/components/ThemeSelector";
import { AudioManager } from "@/components/AudioManager";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useCEP } from "@/hooks/useCEP";

export default function Configuracoes() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    name: "",
    phone: "",
    instagram: "",
    segment: "",
    cnpj_cpf: "",
    responsible_name: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    zipcode: "",
    complement: ""
  });
  
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [loyaltyPointsPerReal, setLoyaltyPointsPerReal] = useState(1);
  const [loyaltyRedemptionValue, setLoyaltyRedemptionValue] = useState(0.01);
  const [nfceEnabled, setNfceEnabled] = useState(false);
  const [certificateType, setCertificateType] = useState<'A1' | 'A3'>('A1');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState('');
  const [restaurantCoords, setRestaurantCoords] = useState<{latitude: number, longitude: number} | null>(null);
  const [maxDeliveryRadius, setMaxDeliveryRadius] = useState(200);
  
  // Payment gateways states
  const [pagSeguroEnabled, setPagSeguroEnabled] = useState(false);
  const [pagSeguroEmail, setPagSeguroEmail] = useState('');
  const [pagSeguroToken, setPagSeguroToken] = useState('');
  
  const [mercadoPagoEnabled, setMercadoPagoEnabled] = useState(false);
  const [mercadoPagoToken, setMercadoPagoToken] = useState('');
  const [mercadoPagoPublicKey, setMercadoPagoPublicKey] = useState('');
  
  const [redeEnabled, setRedeEnabled] = useState(false);
  const [redePv, setRedePv] = useState('');
  const [redeToken, setRedeToken] = useState('');
  
  const [stoneEnabled, setStoneEnabled] = useState(false);
  const [stoneMerchantId, setStoneMerchantId] = useState('');
  const [stoneApiKey, setStoneApiKey] = useState('');
  
  const [nubankEnabled, setNubankEnabled] = useState(false);
  const [nubankClientId, setNubankClientId] = useState('');
  const [nubankClientSecret, setNubankClientSecret] = useState('');
  
  const { buscarCEP, loading: cepLoading } = useCEP();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_settings' as any)
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          name: data.name || "",
          phone: data.phone || "",
          instagram: data.instagram || "",
          segment: data.segment || "",
          cnpj_cpf: data.cnpj_cpf || "",
          responsible_name: data.responsible_name || "",
          street: data.street || "",
          number: data.number || "",
          neighborhood: data.neighborhood || "",
          city: data.city || "",
          state: data.state || "",
          zipcode: data.zipcode || "",
          complement: data.complement || ""
        });
        setLoyaltyEnabled(data.loyalty_enabled || false);
        setLoyaltyPointsPerReal(data.loyalty_points_per_real || 1);
        setLoyaltyRedemptionValue(data.loyalty_redemption_value || 0.01);
        setNfceEnabled(data.nfce_enabled || false);
        
        // Coordenadas
        if (data.latitude && data.longitude) {
          setRestaurantCoords({ latitude: data.latitude, longitude: data.longitude });
        }
        setMaxDeliveryRadius(data.max_delivery_radius || 200);
        
        // Payment gateways
        setPagSeguroEnabled(data.pagseguro_enabled || false);
        setPagSeguroEmail(data.pagseguro_email || '');
        setPagSeguroToken(data.pagseguro_token || '');
        
        setMercadoPagoEnabled(data.mercadopago_enabled || false);
        setMercadoPagoToken(data.mercadopago_access_token || '');
        setMercadoPagoPublicKey(data.mercadopago_public_key || '');
        
        setRedeEnabled(data.rede_enabled || false);
        setRedePv(data.rede_pv || '');
        setRedeToken(data.rede_token || '');
        
        setStoneEnabled(data.stone_enabled || false);
        setStoneMerchantId(data.stone_merchant_id || '');
        setStoneApiKey(data.stone_api_key || '');
        
        setNubankEnabled(data.nubank_enabled || false);
        setNubankClientId(data.nubank_client_id || '');
        setNubankClientSecret(data.nubank_client_secret || '');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const handleUpdateCoordinates = async () => {
    if (!settings.street || !settings.city) {
      toast.error('Preencha o endereço completo primeiro');
      return;
    }

    const address = `${settings.street}, ${settings.number}, ${settings.neighborhood}, ${settings.city}, ${settings.state}, Brasil`;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'RestaurantApp/1.0' } }
      );

      const data = await response.json();
      
      if (data && data.length > 0) {
        const coords = {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };

        // Salvar no banco
        const { data: existing } = await supabase
          .from('restaurant_settings' as any)
          .select('id')
          .maybeSingle();

        if (existing) {
          await supabase
            .from('restaurant_settings' as any)
            .update({
              latitude: coords.latitude,
              longitude: coords.longitude,
              max_delivery_radius: maxDeliveryRadius
            })
            .eq('id', existing.id);
        }

        setRestaurantCoords(coords);
        toast.success('Coordenadas atualizadas com sucesso!');
      } else {
        toast.error('Endereço não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error);
      toast.error('Erro ao buscar coordenadas');
    }
  };

  const handleCEPSearch = async () => {
    if (!settings.zipcode) {
      toast.error('Digite um CEP');
      return;
    }

    const cepData = await buscarCEP(settings.zipcode);
    if (cepData) {
      setSettings({
        ...settings,
        street: cepData.street,
        neighborhood: cepData.neighborhood,
        city: cepData.city,
        state: cepData.state
      });
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('restaurant_settings' as any)
        .select('id')
        .maybeSingle();

      const dataToSave = {
        ...settings,
        loyalty_enabled: loyaltyEnabled,
        loyalty_points_per_real: loyaltyPointsPerReal,
        loyalty_redemption_value: loyaltyRedemptionValue,
        nfce_enabled: nfceEnabled,
        max_delivery_radius: maxDeliveryRadius,
        // Payment gateways
        pagseguro_enabled: pagSeguroEnabled,
        pagseguro_email: pagSeguroEmail,
        pagseguro_token: pagSeguroToken,
        mercadopago_enabled: mercadoPagoEnabled,
        mercadopago_access_token: mercadoPagoToken,
        mercadopago_public_key: mercadoPagoPublicKey,
        rede_enabled: redeEnabled,
        rede_pv: redePv,
        rede_token: redeToken,
        stone_enabled: stoneEnabled,
        stone_merchant_id: stoneMerchantId,
        stone_api_key: stoneApiKey,
        nubank_enabled: nubankEnabled,
        nubank_client_id: nubankClientId,
        nubank_client_secret: nubankClientSecret,
      };

      if (existing) {
        const { error } = await supabase
          .from('restaurant_settings' as any)
          .update(dataToSave)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('restaurant_settings' as any)
          .insert(dataToSave);

        if (error) throw error;
      }

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Configurações</h1>
        </div>
        <p className="text-muted-foreground">Configure seu estabelecimento e formas de operação</p>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="geral">
            <Info className="h-4 w-4 mr-2" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="localizacao">
            <MapPin className="h-4 w-4 mr-2" />
            Localização
          </TabsTrigger>
          <TabsTrigger value="fidelidade">
            <Gift className="h-4 w-4 mr-2" />
            Fidelidade
          </TabsTrigger>
          <TabsTrigger value="entrega">
            <Truck className="h-4 w-4 mr-2" />
            Entrega
          </TabsTrigger>
          <TabsTrigger value="pagamentos">
            <CreditCard className="h-4 w-4 mr-2" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="tema">
            <Palette className="h-4 w-4 mr-2" />
            Tema
          </TabsTrigger>
          <TabsTrigger value="audio">
            <Volume2 className="h-4 w-4 mr-2" />
            Áudio
          </TabsTrigger>
          <TabsTrigger value="nfce">
            <DollarSign className="h-4 w-4 mr-2" />
            NFC-e
          </TabsTrigger>
        </TabsList>
          <TabsTrigger value="geral">
            <Info className="h-4 w-4 mr-2" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="fidelidade">
            <Gift className="h-4 w-4 mr-2" />
            Fidelidade
          </TabsTrigger>
          <TabsTrigger value="entrega">
            <Truck className="h-4 w-4 mr-2" />
            Entrega
          </TabsTrigger>
          <TabsTrigger value="tema">
            <Palette className="h-4 w-4 mr-2" />
            Tema
          </TabsTrigger>
          <TabsTrigger value="audio">
            <Volume2 className="h-4 w-4 mr-2" />
            Áudio
          </TabsTrigger>
          <TabsTrigger value="nfce">
            <DollarSign className="h-4 w-4 mr-2" />
            NFC-e
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Info className="h-6 w-6 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Dados do Estabelecimento</h3>
                <p className="text-sm text-muted-foreground">Informações básicas do seu negócio</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Estabelecimento *</Label>
                <Input 
                  id="nome" 
                  placeholder="Ex: Pizzaria Bella Napoli"
                  value={settings.name}
                  onChange={(e) => setSettings({...settings, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input 
                  id="telefone" 
                  placeholder="(11) 98765-4321"
                  value={settings.phone}
                  onChange={(e) => setSettings({...settings, phone: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input 
                  id="instagram" 
                  placeholder="@seurestaurante"
                  value={settings.instagram}
                  onChange={(e) => setSettings({...settings, instagram: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="segmento">Segmento</Label>
                <Input 
                  id="segmento" 
                  placeholder="Ex: Pizzaria, Hamburgueria, Japonês"
                  value={settings.segment}
                  onChange={(e) => setSettings({...settings, segment: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ ou CPF</Label>
                <Input 
                  id="cnpj" 
                  placeholder="00.000.000/0000-00"
                  value={settings.cnpj_cpf}
                  onChange={(e) => setSettings({...settings, cnpj_cpf: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsavel">Nome do Responsável</Label>
                <Input 
                  id="responsavel" 
                  placeholder="Nome completo"
                  value={settings.responsible_name}
                  onChange={(e) => setSettings({...settings, responsible_name: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-md font-semibold mb-4">Endereço</h4>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="zipcode">CEP *</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="zipcode" 
                      placeholder="00000-000"
                      value={settings.zipcode}
                      onChange={(e) => setSettings({...settings, zipcode: e.target.value})}
                      maxLength={9}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCEPSearch}
                      disabled={cepLoading}
                    >
                      {cepLoading ? "..." : "Buscar"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="street">Rua *</Label>
                  <Input 
                    id="street" 
                    placeholder="Nome da rua"
                    value={settings.street}
                    onChange={(e) => setSettings({...settings, street: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="number">Número *</Label>
                  <Input 
                    id="number" 
                    placeholder="123"
                    value={settings.number}
                    onChange={(e) => setSettings({...settings, number: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro *</Label>
                  <Input 
                    id="neighborhood" 
                    placeholder="Nome do bairro"
                    value={settings.neighborhood}
                    onChange={(e) => setSettings({...settings, neighborhood: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Cidade *</Label>
                  <Input 
                    id="city" 
                    placeholder="Nome da cidade"
                    value={settings.city}
                    onChange={(e) => setSettings({...settings, city: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado *</Label>
                  <Input 
                    id="state" 
                    placeholder="SP"
                    maxLength={2}
                    value={settings.state}
                    onChange={(e) => setSettings({...settings, state: e.target.value.toUpperCase()})}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input 
                    id="complement" 
                    placeholder="Apto, Sala, etc."
                    value={settings.complement}
                    onChange={(e) => setSettings({...settings, complement: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <Button className="mt-6 gap-2" onClick={handleSaveSettings} disabled={loading}>
              <Info className="h-4 w-4" />
              {loading ? "Salvando..." : "Salvar Informações"}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="localizacao">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <MapPin className="h-6 w-6 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Localização do Restaurante</h3>
                <p className="text-sm text-muted-foreground">Configure as coordenadas para cálculo de distância</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-semibold mb-2">Endereço Atual:</p>
                <p className="text-sm">
                  {settings.street}, {settings.number} - {settings.neighborhood}
                  <br />
                  {settings.city}/{settings.state} - CEP: {settings.zipcode}
                </p>
                {settings.complement && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Complemento: {settings.complement}
                  </p>
                )}
              </div>

              {restaurantCoords && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input value={restaurantCoords.latitude.toFixed(6)} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input value={restaurantCoords.longitude.toFixed(6)} disabled />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="maxRadius">Raio Máximo de Entrega (km)</Label>
                <Input
                  id="maxRadius"
                  type="number"
                  value={maxDeliveryRadius}
                  onChange={(e) => setMaxDeliveryRadius(Number(e.target.value))}
                  placeholder="200"
                />
                <p className="text-xs text-muted-foreground">
                  Pedidos fora deste raio serão rejeitados automaticamente
                </p>
              </div>

              <Button onClick={handleUpdateCoordinates} className="w-full">
                <MapPin className="h-4 w-4 mr-2" />
                Atualizar Coordenadas
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pagamentos">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="h-6 w-6 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Integrações de Pagamento</h3>
                <p className="text-sm text-muted-foreground">Configure gateways para aceitar pagamentos online</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* PagSeguro */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">PagSeguro</h4>
                    <p className="text-xs text-muted-foreground">PIX e Cartão</p>
                  </div>
                  <Switch
                    checked={pagSeguroEnabled}
                    onCheckedChange={setPagSeguroEnabled}
                  />
                </div>
                
                {pagSeguroEnabled && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input
                        value={pagSeguroEmail}
                        onChange={(e) => setPagSeguroEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Token API</Label>
                      <Input
                        type="password"
                        value={pagSeguroToken}
                        onChange={(e) => setPagSeguroToken(e.target.value)}
                        placeholder="Digite seu token"
                      />
                    </div>
                  </div>
                )}
              </Card>

              {/* Mercado Pago */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">Mercado Pago</h4>
                    <p className="text-xs text-muted-foreground">PIX e Cartão</p>
                  </div>
                  <Switch
                    checked={mercadoPagoEnabled}
                    onCheckedChange={setMercadoPagoEnabled}
                  />
                </div>
                
                {mercadoPagoEnabled && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Access Token</Label>
                      <Input
                        type="password"
                        value={mercadoPagoToken}
                        onChange={(e) => setMercadoPagoToken(e.target.value)}
                        placeholder="APP_USR-..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Public Key</Label>
                      <Input
                        value={mercadoPagoPublicKey}
                        onChange={(e) => setMercadoPagoPublicKey(e.target.value)}
                        placeholder="APP_USR-..."
                      />
                    </div>
                  </div>
                )}
              </Card>

              {/* Rede */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">Rede</h4>
                    <p className="text-xs text-muted-foreground">Cartão de Crédito/Débito</p>
                  </div>
                  <Switch
                    checked={redeEnabled}
                    onCheckedChange={setRedeEnabled}
                  />
                </div>
                
                {redeEnabled && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>PV (Número do Estabelecimento)</Label>
                      <Input
                        value={redePv}
                        onChange={(e) => setRedePv(e.target.value)}
                        placeholder="1234567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Token API</Label>
                      <Input
                        type="password"
                        value={redeToken}
                        onChange={(e) => setRedeToken(e.target.value)}
                        placeholder="Digite seu token"
                      />
                    </div>
                  </div>
                )}
              </Card>

              {/* Stone */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">Stone</h4>
                    <p className="text-xs text-muted-foreground">Cartão de Crédito/Débito</p>
                  </div>
                  <Switch
                    checked={stoneEnabled}
                    onCheckedChange={setStoneEnabled}
                  />
                </div>
                
                {stoneEnabled && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Merchant ID</Label>
                      <Input
                        value={stoneMerchantId}
                        onChange={(e) => setStoneMerchantId(e.target.value)}
                        placeholder="MERCHANT_ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={stoneApiKey}
                        onChange={(e) => setStoneApiKey(e.target.value)}
                        placeholder="Digite sua API key"
                      />
                    </div>
                  </div>
                )}
              </Card>

              {/* Nubank */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">Nubank</h4>
                    <p className="text-xs text-muted-foreground">PIX</p>
                  </div>
                  <Switch
                    checked={nubankEnabled}
                    onCheckedChange={setNubankEnabled}
                  />
                </div>
                
                {nubankEnabled && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Client ID</Label>
                      <Input
                        value={nubankClientId}
                        onChange={(e) => setNubankClientId(e.target.value)}
                        placeholder="client_id"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret</Label>
                      <Input
                        type="password"
                        value={nubankClientSecret}
                        onChange={(e) => setNubankClientSecret(e.target.value)}
                        placeholder="client_secret"
                      />
                    </div>
                  </div>
                )}
              </Card>

              <Button className="w-full" onClick={handleSaveSettings} disabled={loading}>
                <CreditCard className="h-4 w-4 mr-2" />
                {loading ? "Salvando..." : "Salvar Configurações de Pagamento"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="fidelidade">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Gift className="h-6 w-6 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Programa de Fidelidade</h3>
                <p className="text-sm text-muted-foreground">Configure o programa de pontos e recompensas</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Ativar Programa de Fidelidade</Label>
                  <p className="text-sm text-muted-foreground">
                    Permita que clientes acumulem pontos em cada compra
                  </p>
                </div>
                <Switch
                  checked={loyaltyEnabled}
                  onCheckedChange={setLoyaltyEnabled}
                />
              </div>

              {loyaltyEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pointsPerReal">Pontos por Real Gasto</Label>
                    <Input
                      id="pointsPerReal"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={loyaltyPointsPerReal}
                      onChange={(e) => setLoyaltyPointsPerReal(parseFloat(e.target.value))}
                      placeholder="Ex: 1 ponto = R$ 1,00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Cliente ganha {loyaltyPointsPerReal} ponto(s) a cada R$ 1,00 gasto
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="redemptionValue">Valor de Resgate por Ponto (R$)</Label>
                    <Input
                      id="redemptionValue"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={loyaltyRedemptionValue}
                      onChange={(e) => setLoyaltyRedemptionValue(parseFloat(e.target.value))}
                      placeholder="Ex: 0.01 = 1 ponto vale R$ 0,01"
                    />
                    <p className="text-xs text-muted-foreground">
                      Cada ponto vale R$ {loyaltyRedemptionValue.toFixed(2)} no resgate
                    </p>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Exemplo de Acúmulo:</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Compra de R$ 100,00 = {(100 * loyaltyPointsPerReal).toFixed(0)} pontos
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(100 * loyaltyPointsPerReal).toFixed(0)} pontos = R$ {(100 * loyaltyPointsPerReal * loyaltyRedemptionValue).toFixed(2)} em desconto
                    </p>
                  </div>

                  <Button className="w-full" onClick={handleSaveSettings} disabled={loading}>
                    <Gift className="h-4 w-4 mr-2" />
                    {loading ? "Salvando..." : "Salvar Configurações de Fidelidade"}
                  </Button>
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tema">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Palette className="h-6 w-6 text-purple-500" />
              <div>
                <h3 className="text-lg font-semibold">Personalização Visual</h3>
                <p className="text-sm text-muted-foreground">Escolha o tema visual do sistema</p>
              </div>
            </div>
            <ThemeSelector />
          </Card>
        </TabsContent>

        <TabsContent value="entrega">
          <DeliveryZonesManager />
        </TabsContent>

        <TabsContent value="audio">
          <AudioManager />
        </TabsContent>

        <TabsContent value="nfce">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="h-6 w-6 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Configuração NFC-e</h3>
                <p className="text-sm text-muted-foreground">
                  Configure certificado digital para emissão de notas fiscais
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">Emitir NFC-e automaticamente no PDV</p>
                  <p className="text-sm text-muted-foreground">
                    Todo pedido finalizado no PDV gerará NFC-e automaticamente
                  </p>
                </div>
                <Switch 
                  checked={nfceEnabled} 
                  onCheckedChange={setNfceEnabled}
                />
              </div>

              <div className="space-y-4 border rounded-lg p-4">
                <h4 className="font-medium">Certificado Digital</h4>
                
                <div className="space-y-2">
                  <Label>Tipo de Certificado</Label>
                  <div className="flex gap-4">
                    <Button 
                      variant={certificateType === 'A1' ? 'default' : 'outline'}
                      onClick={() => setCertificateType('A1')}
                    >
                      A1 (Arquivo)
                    </Button>
                    <Button 
                      variant={certificateType === 'A3' ? 'default' : 'outline'}
                      onClick={() => setCertificateType('A3')}
                    >
                      A3 (Token/Cartão)
                    </Button>
                  </div>
                </div>

                {certificateType === 'A1' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="certificate-file">Arquivo do Certificado (.pfx)</Label>
                      <Input
                        id="certificate-file"
                        type="file"
                        accept=".pfx,.p12"
                        onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="certificate-password">Senha do Certificado</Label>
                      <Input
                        id="certificate-password"
                        type="password"
                        placeholder="Digite a senha do certificado"
                        value={certificatePassword}
                        onChange={(e) => setCertificatePassword(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {certificateType === 'A3' && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Certificado A3 requer configuração manual do token/cartão no servidor.
                      Entre em contato com o suporte técnico para configuração.
                    </p>
                  </div>
                )}
              </div>

              <Button onClick={handleSaveSettings} disabled={loading}>
                {loading ? "Salvando..." : "Salvar Configurações NFC-e"}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
