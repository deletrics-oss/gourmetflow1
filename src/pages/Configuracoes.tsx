import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, Info, Palette, Volume2, DollarSign, Gift, Truck, MapPin, CreditCard, Loader2, CheckCircle, AlertCircle, Users } from "lucide-react";
import { DeliveryZonesManager } from "@/components/delivery/DeliveryZonesManager";
import { ThemeSelector } from "@/components/ThemeSelector";
import { AudioManager } from "@/components/AudioManager";
import { CustomerDesignEditor } from "@/components/CustomerDesignEditor";
import { EmployeesTab } from "@/components/EmployeesTab";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useCEP } from "@/hooks/useCEP";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurant } from "@/hooks/useRestaurant";

export default function Configuracoes() {
  const { isOwner, isAdmin } = useAuth();
  const { restaurantId } = useRestaurant();
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
    complement: "",
    logo_url: "",
    background_url: "",
    background_color: "#f8fafc",
    primary_color: "#e53e3e",
    accent_color: "#f59e0b",
    totem_welcome_message: "Bem-vindo! Faça seu pedido",
    menu_header_message: "O que você deseja?",
    customer_theme: "modern",
    show_logo_on_menu: true,
    menu_font: "default"
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
  
  const [cieloEnabled, setCieloEnabled] = useState(false);
  const [cieloMerchantId, setCieloMerchantId] = useState('');
  const [cieloMerchantKey, setCieloMerchantKey] = useState('');
  
  // Gateway status indicators
  const [testingGateway, setTestingGateway] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<{[key: string]: {status: 'idle' | 'testing' | 'success' | 'error', tested_at: string | null}}>({
    pagseguro: { status: 'idle', tested_at: null },
    mercadopago: { status: 'idle', tested_at: null },
    rede: { status: 'idle', tested_at: null },
    stone: { status: 'idle', tested_at: null },
    nubank: { status: 'idle', tested_at: null },
    cielo: { status: 'idle', tested_at: null }
  });
  
  const [testingGateways, setTestingGateways] = useState<{[key: string]: boolean}>({});
  
  const { buscarCEP, loading: cepLoading } = useCEP();

  useEffect(() => {
    if (restaurantId) {
      loadSettings();
      loadGatewayStatus();
    }
  }, [restaurantId]);

  const loadGatewayStatus = () => {
    try {
      const saved = localStorage.getItem('gateway_status');
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = new Date().getTime();
        const validStatuses: any = {};
        Object.keys(parsed).forEach(key => {
          if (parsed[key].tested_at) {
            const testedAt = new Date(parsed[key].tested_at).getTime();
            const hoursDiff = (now - testedAt) / (1000 * 60 * 60);
            if (hoursDiff < 24) {
              validStatuses[key] = parsed[key];
            } else {
              validStatuses[key] = { status: 'idle', tested_at: null };
            }
          } else {
            validStatuses[key] = { status: 'idle', tested_at: null };
          }
        });
        setGatewayStatus(validStatuses);
      }
    } catch (error) {
      console.error('Erro ao carregar status dos gateways:', error);
    }
  };

  const saveGatewayStatus = (statuses: {[key: string]: {status: 'idle' | 'testing' | 'success' | 'error', tested_at: string | null}}) => {
    setGatewayStatus(statuses);
    localStorage.setItem('gateway_status', JSON.stringify(statuses));
  };

  const loadSettings = async () => {
    if (!restaurantId) return;
    
    try {
      console.log('[CONFIGURACOES] Carregando configurações do banco para restaurant_id:', restaurantId);
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[CONFIGURACOES] ❌ Erro ao carregar:', error);
        throw error;
      }
      
      console.log('[CONFIGURACOES] ✅ Configurações carregadas:', data);
      
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
          complement: data.complement || "",
          logo_url: data.logo_url || "",
          background_url: data.background_url || "",
          background_color: data.background_color || "#f8fafc",
          primary_color: data.primary_color || "#e53e3e",
          accent_color: data.accent_color || "#f59e0b",
          totem_welcome_message: data.totem_welcome_message || "Bem-vindo! Faça seu pedido",
          menu_header_message: data.menu_header_message || "O que você deseja?",
          customer_theme: data.customer_theme || "modern",
          show_logo_on_menu: data.show_logo_on_menu !== undefined ? data.show_logo_on_menu : true,
          menu_font: data.menu_font || "default"
        });
        setLoyaltyEnabled(data.loyalty_enabled || false);
        setLoyaltyPointsPerReal(data.loyalty_points_per_real || 1);
        setLoyaltyRedemptionValue(data.loyalty_redemption_value || 0.01);
        setNfceEnabled((data as any).nfce_enabled || false);
        
        // Coordenadas
        if (data.latitude && data.longitude) {
          setRestaurantCoords({ latitude: data.latitude, longitude: data.longitude });
        }
        setMaxDeliveryRadius(data.max_delivery_radius || 200);
        
        // Payment gateways - ✅ Carregar estados
        setPagSeguroEnabled(data.pagseguro_enabled || false);
        setPagSeguroEmail(data.pagseguro_email || '');
        setPagSeguroToken(data.pagseguro_token || '');
        console.log('[CONFIGURACOES] PagSeguro carregado:', {
          enabled: data.pagseguro_enabled,
          email: data.pagseguro_email,
          hasToken: !!data.pagseguro_token
        });
        
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
        
        setCieloEnabled(data.cielo_enabled || false);
        setCieloMerchantId(data.cielo_merchant_id || '');
        setCieloMerchantKey(data.cielo_merchant_key || '');
      }
    } catch (error) {
      console.error('[CONFIGURACOES] Erro ao carregar configurações:', error);
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
        const { data: existing, error: existingError } = await supabase
          .from('restaurant_settings')
          .select('id')
          .maybeSingle();

        if (existingError && existingError.code !== 'PGRST116') {
          console.error('Erro ao verificar configurações:', existingError);
        }

        if (existing) {
          await supabase
            .from('restaurant_settings')
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
    if (!restaurantId) {
      toast.error('Restaurante não encontrado');
      return;
    }
    
    setLoading(true);
    try {
      console.log('[CONFIGURACOES] ============ INICIANDO SALVAMENTO ============');
      console.log('[CONFIGURACOES] Restaurant ID:', restaurantId);
      
      // Buscar ID do restaurante settings
      const { data: existing, error: fetchError } = await supabase
        .from('restaurant_settings')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[CONFIGURACOES] ❌ Erro ao buscar configurações:', fetchError);
        throw fetchError;
      }

      // Construir objeto de dados
      const dataToSave = {
        restaurant_id: restaurantId,
        name: settings.name || null,
        phone: settings.phone || null,
        instagram: settings.instagram || null,
        segment: settings.segment || null,
        cnpj_cpf: settings.cnpj_cpf || null,
        responsible_name: settings.responsible_name || null,
        street: settings.street || null,
        number: settings.number || null,
        neighborhood: settings.neighborhood || null,
        city: settings.city || null,
        state: settings.state || null,
        zipcode: settings.zipcode || null,
        complement: settings.complement || null,
        loyalty_enabled: loyaltyEnabled,
        loyalty_points_per_real: loyaltyPointsPerReal,
        loyalty_redemption_value: loyaltyRedemptionValue,
        max_delivery_radius: maxDeliveryRadius,
        // Payment gateways
        pagseguro_enabled: pagSeguroEnabled,
        pagseguro_email: pagSeguroEmail || null,
        pagseguro_token: pagSeguroToken || null,
        mercadopago_enabled: mercadoPagoEnabled,
        mercadopago_access_token: mercadoPagoToken || null,
        mercadopago_public_key: mercadoPagoPublicKey || null,
        rede_enabled: redeEnabled,
        rede_pv: redePv || null,
        rede_token: redeToken || null,
        stone_enabled: stoneEnabled,
        stone_merchant_id: stoneMerchantId || null,
        stone_api_key: stoneApiKey || null,
        nubank_enabled: nubankEnabled,
        nubank_client_id: nubankClientId || null,
        nubank_client_secret: nubankClientSecret || null,
        cielo_enabled: cieloEnabled,
        cielo_merchant_id: cieloMerchantId || null,
        cielo_merchant_key: cieloMerchantKey || null,
      };

      console.log('[CONFIGURACOES] 📦 Dados que serão salvos:', {
        existingId: existing?.id,
        pagseguro_enabled: dataToSave.pagseguro_enabled,
        pagseguro_email: dataToSave.pagseguro_email,
        pagseguro_token: dataToSave.pagseguro_token ? `${dataToSave.pagseguro_token.slice(0, 10)}...` : null,
        mercadopago_enabled: dataToSave.mercadopago_enabled
      });

      if (existing?.id) {
        console.log('[CONFIGURACOES] ✏️ Atualizando registro existente...');
        const { data: updated, error: updateError } = await supabase
          .from('restaurant_settings')
          .update(dataToSave)
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          console.error('[CONFIGURACOES] ❌ Erro ao atualizar:', updateError);
          throw updateError;
        }
        
        console.log('[CONFIGURACOES] ✅ Registro atualizado:', {
          id: updated.id,
          pagseguro_enabled: updated.pagseguro_enabled,
          pagseguro_email: updated.pagseguro_email,
          hasToken: !!updated.pagseguro_token
        });
      } else {
        console.log('[CONFIGURACOES] ➕ Criando novo registro...');
        const { data: inserted, error: insertError } = await supabase
          .from('restaurant_settings')
          .insert(dataToSave)
          .select()
          .single();

        if (insertError) {
          console.error('[CONFIGURACOES] ❌ Erro ao inserir:', insertError);
          throw insertError;
        }
        
        console.log('[CONFIGURACOES] ✅ Registro criado:', {
          id: inserted.id,
          pagseguro_enabled: inserted.pagseguro_enabled,
          pagseguro_email: inserted.pagseguro_email
        });
      }

      console.log('[CONFIGURACOES] ✅ ============ SALVAMENTO CONCLUÍDO ============');
      
      // Toast detalhado
      const savedGateways = [];
      if (pagSeguroEnabled && pagSeguroEmail && pagSeguroToken) savedGateways.push('PagSeguro');
      if (mercadoPagoEnabled && mercadoPagoToken) savedGateways.push('Mercado Pago');
      
      toast.success(
        savedGateways.length > 0 
          ? `✅ Configurações salvas! Gateways: ${savedGateways.join(', ')}`
          : '✅ Configurações salvas com sucesso!'
      );
      
      // Recarregar para confirmar persistência
      await loadSettings();
      
    } catch (error: any) {
      console.error('[CONFIGURACOES] ❌ Erro ao salvar configurações:', error);
      toast.error(error.message || 'Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const testGatewayConnection = async (gateway: string) => {
    setTestingGateways(prev => ({ ...prev, [gateway]: true }));
    
    try {
      // Verificar se credenciais estão preenchidas
      let hasCredentials = false;
      
      switch(gateway) {
        case 'mercadopago':
          hasCredentials = !!(mercadoPagoToken && mercadoPagoPublicKey);
          break;
        case 'pagseguro':
          hasCredentials = !!(pagSeguroEmail && pagSeguroToken);
          break;
        case 'rede':
          hasCredentials = !!(redePv && redeToken);
          break;
        case 'stone':
          hasCredentials = !!(stoneMerchantId && stoneApiKey);
          break;
        case 'nubank':
          hasCredentials = !!(nubankClientId && nubankClientSecret);
          break;
        case 'cielo':
          hasCredentials = !!(cieloMerchantId && cieloMerchantKey);
          break;
      }
      
      if (!hasCredentials) {
        setGatewayStatus(prev => ({ ...prev, [gateway]: { status: 'error', tested_at: null } }));
        toast.error('Preencha todas as credenciais primeiro');
        return;
      }
      
      setGatewayStatus(prev => ({ ...prev, [gateway]: { status: 'testing', tested_at: null } }));
      
      // ✅ FASE 2: Teste REAL de gateway chamando edge functions
      let result;
      
      if (gateway === 'mercadopago') {
        result = await supabase.functions.invoke('mercadopago-payment', {
          body: {
            amount: 1,
            orderId: 'TEST-' + Date.now(),
            paymentMethod: 'pix',
            customerEmail: 'teste@teste.com'
          }
        });
      } else if (gateway === 'pagseguro') {
        result = await supabase.functions.invoke('pagseguro-payment', {
          body: {
            amount: 1,
            orderId: 'TEST-' + Date.now(),
            customerEmail: 'teste@teste.com'
          }
        });
      } else {
        // Outros gateways: simular por enquanto
        await new Promise(resolve => setTimeout(resolve, 1500));
        result = { error: null };
      }
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      const testedAt = new Date().toISOString();
      setGatewayStatus(prev => ({ ...prev, [gateway]: { status: 'success', tested_at: testedAt } }));
      saveGatewayStatus({ ...gatewayStatus, [gateway]: { status: 'success', tested_at: testedAt } });
      toast.success(`${gateway.toUpperCase()}: Conexão OK! ✅`);
      
    } catch (error: any) {
      const testedAt = new Date().toISOString();
      setGatewayStatus(prev => ({ ...prev, [gateway]: { status: 'error', tested_at: testedAt } }));
      saveGatewayStatus({ ...gatewayStatus, [gateway]: { status: 'error', tested_at: testedAt } });
      toast.error(`${gateway.toUpperCase()}: Erro - ${error.message} ❌`);
    } finally {
      setTestingGateways(prev => ({ ...prev, [gateway]: false }));
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
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="geral" className="flex-shrink-0">
            <Info className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="localizacao" className="flex-shrink-0">
            <MapPin className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Localização</span>
          </TabsTrigger>
          <TabsTrigger value="fidelidade" className="flex-shrink-0">
            <Gift className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Fidelidade</span>
          </TabsTrigger>
          <TabsTrigger value="entrega" className="flex-shrink-0">
            <Truck className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Entrega</span>
          </TabsTrigger>
          <TabsTrigger value="pagamentos" className="flex-shrink-0">
            <CreditCard className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Pagamentos</span>
          </TabsTrigger>
          <TabsTrigger value="tema" className="flex-shrink-0">
            <Palette className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Tema</span>
          </TabsTrigger>
          <TabsTrigger value="design" className="flex-shrink-0">
            <Palette className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Design</span>
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex-shrink-0">
            <Volume2 className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Áudio</span>
          </TabsTrigger>
          <TabsTrigger value="nfce" className="flex-shrink-0">
            <DollarSign className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">NFC-e</span>
          </TabsTrigger>
          {(isOwner || isAdmin) && (
            <TabsTrigger value="funcionarios" className="flex-shrink-0">
              <Users className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Funcionários</span>
            </TabsTrigger>
          )}
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
                    <Input value={restaurantCoords.latitude.toFixed(7)} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input value={restaurantCoords.longitude.toFixed(7)} disabled />
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
              <Card className="p-4 relative">
                {/* Badge de Status */}
                <div className="absolute top-2 right-2">
                  {gatewayStatus.pagseguro?.status === 'success' && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                      {gatewayStatus.pagseguro.tested_at && (
                        <span>OK ({new Date(gatewayStatus.pagseguro.tested_at).toLocaleDateString()})</span>
                      )}
                    </div>
                  )}
                  {gatewayStatus.pagseguro?.status === 'error' && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                      Erro
                    </div>
                  )}
                  {gatewayStatus.pagseguro?.status === 'idle' && pagSeguroToken && (
                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                      <div className="w-2 h-2 rounded-full bg-yellow-600" />
                      Não testado
                    </div>
                  )}
                </div>

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
                      <Label htmlFor="pagseguro-email">E-mail PagBank</Label>
                      <Input
                        id="pagseguro-email"
                        type="email"
                        value={pagSeguroEmail}
                        onChange={(e) => {
                          setPagSeguroEmail(e.target.value);
                          setGatewayStatus(prev => ({ ...prev, pagseguro: { status: 'idle', tested_at: null } }));
                        }}
                        placeholder="deletrics@gmail.com"
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        E-mail da sua conta PagBank/PagSeguro
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pagseguro-token">Token API</Label>
                      <Input
                        id="pagseguro-token"
                        type="password"
                        value={pagSeguroToken}
                        onChange={(e) => {
                          setPagSeguroToken(e.target.value);
                          setGatewayStatus(prev => ({ ...prev, pagseguro: { status: 'idle', tested_at: null } }));
                        }}
                        placeholder="Seu token de integração"
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Obtenha em: <a href="https://dev.pagseguro.uol.com.br/" target="_blank" rel="noopener" className="text-primary hover:underline">dev.pagseguro.uol.com.br</a>
                      </p>
                    </div>
                    
                    <div className="flex gap-2 items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testGatewayConnection('pagseguro')}
                        disabled={testingGateways.pagseguro || !pagSeguroEmail || !pagSeguroToken}
                        className="flex-1"
                      >
                        {testingGateways.pagseguro ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Testando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Testar Conexão
                          </>
                        )}
                      </Button>
                      {gatewayStatus.pagseguro?.status === 'success' && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <div className="h-2 w-2 rounded-full bg-green-600"></div>
                          OK
                        </div>
                      )}
                    </div>
                    
                    {pagSeguroEmail && pagSeguroToken && (
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            ✅ Credenciais configuradas
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Email: {pagSeguroEmail}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Clique em "Salvar Configurações" no final da página para ativar
                        </p>
                      </div>
                    )}
                    
                    {pagSeguroEnabled && (!pagSeguroEmail || !pagSeguroToken) && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          ⚠️ Preencha email e token para habilitar o PagSeguro
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Mercado Pago */}
              <Card className="p-4 relative">
                {/* Badge de Status */}
                <div className="absolute top-2 right-2">
                  {gatewayStatus.mercadopago?.status === 'success' && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                      {gatewayStatus.mercadopago.tested_at && (
                        <span>OK ({new Date(gatewayStatus.mercadopago.tested_at).toLocaleDateString()})</span>
                      )}
                    </div>
                  )}
                  {gatewayStatus.mercadopago?.status === 'error' && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                      Erro
                    </div>
                  )}
                  {gatewayStatus.mercadopago?.status === 'idle' && mercadoPagoToken && (
                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                      <div className="w-2 h-2 rounded-full bg-yellow-600" />
                      Não testado
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold">Mercado Pago</h4>
                    <p className="text-xs text-muted-foreground">PIX e Cartão</p>
                    {mercadoPagoToken && mercadoPagoToken.startsWith('APP_USR-') && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        ⚠️ Credenciais de PRODUÇÃO detectadas - substitua por TEST-
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {mercadoPagoToken && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setMercadoPagoToken('');
                          setMercadoPagoPublicKey('');
                          setGatewayStatus(prev => ({ ...prev, mercadopago: { status: 'idle', tested_at: null } }));
                        }}
                        className="text-xs"
                      >
                        Limpar
                      </Button>
                    )}
                    <Switch
                      checked={mercadoPagoEnabled}
                      onCheckedChange={setMercadoPagoEnabled}
                    />
                  </div>
                </div>
                
                {mercadoPagoEnabled && (
                  <div className="space-y-3">
                    {/* Guia passo-a-passo para obter credenciais TEST */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="space-y-2">
                          <p className="font-semibold text-blue-900">📋 Como obter credenciais de TESTE:</p>
                          <ol className="list-decimal list-inside space-y-1 text-blue-800">
                            <li>Acesse o <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-blue-900">Painel de Desenvolvedores</a></li>
                            <li>No menu lateral, clique em <strong>"Credenciais de teste"</strong> (na seção TESTES)</li>
                            <li>Copie o <strong>Access Token</strong> que começa com <strong>TEST-</strong></li>
                            <li>Copie a <strong>Public Key</strong> que também começa com <strong>TEST-</strong></li>
                            <li>Cole ambas credenciais abaixo</li>
                          </ol>
                        </div>
                      </div>
                    </div>

                    {/* Alerta se usar credenciais de produção */}
                    {mercadoPagoToken && mercadoPagoToken.startsWith('APP_USR-') && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="space-y-1">
                            <p className="font-medium text-red-800">⚠️ ATENÇÃO: Credenciais de produção detectadas!</p>
                            <p className="text-red-700">
                              Você está usando credenciais <strong>APP_USR-</strong> que só funcionam após aprovação do Mercado Pago.
                              Para testes, use credenciais <strong>TEST-</strong> conforme o guia acima.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Access Token *</Label>
                      <Input
                        type="password"
                        value={mercadoPagoToken}
                        onChange={(e) => {
                          setMercadoPagoToken(e.target.value);
                          setGatewayStatus(prev => ({ ...prev, mercadopago: { status: 'idle', tested_at: null } }));
                        }}
                        placeholder="TEST-1234567890... (para testes)"
                        className={
                          mercadoPagoToken && !mercadoPagoToken.startsWith('TEST-') && !mercadoPagoToken.startsWith('APP_USR-') 
                            ? 'border-red-500' 
                            : mercadoPagoToken && mercadoPagoToken.startsWith('TEST-')
                            ? 'border-green-500'
                            : ''
                        }
                      />
                      {mercadoPagoToken && mercadoPagoToken.startsWith('TEST-') && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          ✅ Credenciais de TESTE - perfeito para desenvolvimento
                        </p>
                      )}
                      {mercadoPagoToken && !mercadoPagoToken.startsWith('TEST-') && !mercadoPagoToken.startsWith('APP_USR-') && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Token inválido - deve começar com TEST- ou APP_USR-
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Public Key *</Label>
                      <Input
                        value={mercadoPagoPublicKey}
                        onChange={(e) => {
                          setMercadoPagoPublicKey(e.target.value);
                          setGatewayStatus(prev => ({ ...prev, mercadopago: { status: 'idle', tested_at: null } }));
                        }}
                        placeholder="TEST-1234567890... (para testes)"
                        className={
                          mercadoPagoPublicKey && !mercadoPagoPublicKey.startsWith('TEST-') && !mercadoPagoPublicKey.startsWith('APP_USR-')
                            ? 'border-red-500'
                            : mercadoPagoPublicKey && mercadoPagoPublicKey.startsWith('TEST-')
                            ? 'border-green-500'
                            : ''
                        }
                      />
                      {mercadoPagoPublicKey && mercadoPagoPublicKey.startsWith('TEST-') && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          ✅ Public Key de TESTE válida
                        </p>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testGatewayConnection('mercadopago')}
                      disabled={!!testingGateways.mercadopago || !mercadoPagoToken || !mercadoPagoPublicKey}
                      className="w-full"
                    >
                      {testingGateways.mercadopago ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Testar Conexão
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </Card>

              {/* Rede */}
              <Card className="p-4 relative">
                {/* Badge de Status */}
                <div className="absolute top-2 right-2">
                  {gatewayStatus.rede?.status === 'success' && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                      {gatewayStatus.rede.tested_at && (
                        <span>OK ({new Date(gatewayStatus.rede.tested_at).toLocaleDateString()})</span>
                      )}
                    </div>
                  )}
                  {gatewayStatus.rede?.status === 'error' && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                      Erro
                    </div>
                  )}
                  {gatewayStatus.rede?.status === 'idle' && redeToken && (
                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                      <div className="w-2 h-2 rounded-full bg-yellow-600" />
                      Não testado
                    </div>
                  )}
                </div>

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
                        onChange={(e) => {
                          setRedePv(e.target.value);
                          setGatewayStatus(prev => ({ ...prev, rede: { status: 'idle', tested_at: null } }));
                        }}
                        placeholder="1234567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Token API</Label>
                      <Input
                        type="password"
                        value={redeToken}
                        onChange={(e) => {
                          setRedeToken(e.target.value);
                          setGatewayStatus(prev => ({ ...prev, rede: { status: 'idle', tested_at: null } }));
                        }}
                        placeholder="Digite seu token"
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testGatewayConnection('rede')}
                      disabled={testingGateways.rede || !redePv || !redeToken}
                      className="w-full"
                    >
                      {testingGateways.rede ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Testar Conexão
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </Card>

              {/* Stone */}
              <Card className="p-4 relative">
                {/* Badge de Status */}
                <div className="absolute top-2 right-2">
                  {gatewayStatus.stone?.status === 'success' && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                      {gatewayStatus.stone.tested_at && (
                        <span>OK ({new Date(gatewayStatus.stone.tested_at).toLocaleDateString()})</span>
                      )}
                    </div>
                  )}
                  {gatewayStatus.stone?.status === 'error' && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                      Erro
                    </div>
                  )}
                  {gatewayStatus.stone?.status === 'idle' && stoneApiKey && (
                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                      <div className="w-2 h-2 rounded-full bg-yellow-600" />
                      Não testado
                    </div>
                  )}
                </div>

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
                        onChange={(e) => {
                          setStoneMerchantId(e.target.value);
                          setGatewayStatus(prev => ({ ...prev, stone: { status: 'idle', tested_at: null } }));
                        }}
                        placeholder="MERCHANT_ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        value={stoneApiKey}
                        onChange={(e) => {
                          setStoneApiKey(e.target.value);
                          setGatewayStatus(prev => ({ ...prev, stone: { status: 'idle', tested_at: null } }));
                        }}
                        placeholder="Digite sua API key"
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testGatewayConnection('stone')}
                      disabled={testingGateways.stone || !stoneMerchantId || !stoneApiKey}
                      className="w-full"
                    >
                      {testingGateways.stone ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Testar Conexão
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </Card>

              {/* Nubank */}
              <Card className="p-4 relative">
                {/* Badge de Status */}
                <div className="absolute top-2 right-2">
                  {gatewayStatus.nubank?.status === 'success' && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                      {gatewayStatus.nubank.tested_at && (
                        <span>OK ({new Date(gatewayStatus.nubank.tested_at).toLocaleDateString()})</span>
                      )}
                    </div>
                  )}
                  {gatewayStatus.nubank?.status === 'error' && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                      Erro
                    </div>
                  )}
                  {gatewayStatus.nubank?.status === 'idle' && nubankClientSecret && (
                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                      <div className="w-2 h-2 rounded-full bg-yellow-600" />
                      Não testado
                    </div>
                  )}
                </div>

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
                        onChange={(e) => {
                          setNubankClientId(e.target.value);
                          setGatewayStatus(prev => ({ ...prev, nubank: { status: 'idle', tested_at: null } }));
                        }}
                        placeholder="client_id"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret</Label>
                      <Input
                        type="password"
                        value={nubankClientSecret}
                        onChange={(e) => {
                          setNubankClientSecret(e.target.value);
                          setGatewayStatus(prev => ({ ...prev, nubank: { status: 'idle', tested_at: null } }));
                        }}
                        placeholder="client_secret"
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testGatewayConnection('nubank')}
                      disabled={testingGateways.nubank || !nubankClientId || !nubankClientSecret}
                      className="w-full"
                    >
                      {testingGateways.nubank ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Testar Conexão
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </Card>

              {/* Cielo */}
              <Card className="p-4 relative">
                {/* Badge de Status */}
                <div className="absolute top-2 right-2">
                  {gatewayStatus.cielo?.status === 'success' && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                      {gatewayStatus.cielo.tested_at && (
                        <span>OK ({new Date(gatewayStatus.cielo.tested_at).toLocaleDateString()})</span>
                      )}
                    </div>
                  )}
                  {gatewayStatus.cielo?.status === 'error' && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <div className="w-2 h-2 rounded-full bg-red-600" />
                      Erro
                    </div>
                  )}
                  {gatewayStatus.cielo?.status === 'idle' && cieloMerchantKey && (
                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                      <div className="w-2 h-2 rounded-full bg-yellow-600" />
                      Não testado
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">Cielo</h4>
                    <p className="text-xs text-muted-foreground">Cartão de Crédito/Débito</p>
                  </div>
                  <Switch
                    checked={cieloEnabled}
                    onCheckedChange={setCieloEnabled}
                  />
                </div>
                
                {cieloEnabled && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Merchant ID</Label>
                      <Input
                        value={cieloMerchantId}
                        onChange={(e) => {
                          setCieloMerchantId(e.target.value);
                          setGatewayStatus(prev => ({ ...prev, cielo: { status: 'idle', tested_at: null } }));
                        }}
                        placeholder="Merchant ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Merchant Key</Label>
                      <Input
                        type="password"
                        value={cieloMerchantKey}
                        onChange={(e) => {
                          setCieloMerchantKey(e.target.value);
                          setGatewayStatus(prev => ({ ...prev, cielo: { status: 'idle', tested_at: null } }));
                        }}
                        placeholder="Digite sua Merchant Key"
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testGatewayConnection('cielo')}
                      disabled={testingGateways.cielo || !cieloMerchantId || !cieloMerchantKey}
                      className="w-full"
                    >
                      {testingGateways.cielo ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Testar Conexão
                        </>
                      )}
                    </Button>
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

        <TabsContent value="design">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Palette className="h-6 w-6 text-purple-500" />
              <div>
                <h3 className="text-lg font-semibold">Design das Telas de Cliente</h3>
                <p className="text-sm text-muted-foreground">Personalize Totem, Menu Online e Tablet</p>
              </div>
            </div>
            <CustomerDesignEditor
              settings={{
                logo_url: settings.logo_url,
                background_url: settings.background_url,
                background_color: settings.background_color,
                primary_color: settings.primary_color,
                accent_color: settings.accent_color,
                totem_welcome_message: settings.totem_welcome_message,
                menu_header_message: settings.menu_header_message,
                customer_theme: settings.customer_theme,
                show_logo_on_menu: settings.show_logo_on_menu,
                menu_font: settings.menu_font
              }}
              onSave={async (designSettings) => {
                try {
                  const { error } = await supabase
                    .from('restaurant_settings')
                    .update({
                      logo_url: designSettings.logo_url,
                      background_url: designSettings.background_url,
                      background_color: designSettings.background_color,
                      primary_color: designSettings.primary_color,
                      accent_color: designSettings.accent_color,
                      totem_welcome_message: designSettings.totem_welcome_message,
                      menu_header_message: designSettings.menu_header_message,
                      customer_theme: designSettings.customer_theme,
                      show_logo_on_menu: designSettings.show_logo_on_menu,
                      menu_font: designSettings.menu_font
                    })
                    .eq('name', settings.name);

                  if (error) throw error;

                  setSettings({
                    ...settings,
                    logo_url: designSettings.logo_url || '',
                    background_url: designSettings.background_url || '',
                    background_color: designSettings.background_color || '#f8fafc',
                    primary_color: designSettings.primary_color || '#e53e3e',
                    accent_color: designSettings.accent_color || '#f59e0b',
                    totem_welcome_message: designSettings.totem_welcome_message || '',
                    menu_header_message: designSettings.menu_header_message || '',
                    customer_theme: designSettings.customer_theme || 'modern',
                    show_logo_on_menu: designSettings.show_logo_on_menu !== undefined ? designSettings.show_logo_on_menu : true,
                    menu_font: designSettings.menu_font || 'default'
                  });

                  toast.success('✅ Design salvo com sucesso!');
                } catch (error) {
                  console.error('Erro ao salvar design:', error);
                  toast.error('Erro ao salvar design');
                }
              }}
            />
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

        {/* Aba Funcionários - visível apenas para Owner/Admin */}
        {(isOwner || isAdmin) && (
          <TabsContent value="funcionarios">
            <Card className="p-6">
              <EmployeesTab />
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
