import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useCEP } from '@/hooks/useCEP';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Image, UtensilsCrossed, ArrowRight, ArrowLeft, Check, Upload, Loader2, SkipForward } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Informações Básicas', icon: Building2 },
  { id: 2, title: 'Endereço', icon: MapPin },
  { id: 3, title: 'Logo', icon: Image },
  { id: 4, title: 'Primeiro Item', icon: UtensilsCrossed },
];

const SEGMENTS = [
  'Pizzaria',
  'Hamburgueria',
  'Restaurante Japonês',
  'Cafeteria',
  'Restaurante Saudável',
  'Churrascaria',
  'Restaurante Italiano',
  'Confeitaria',
  'Lanchonete',
  'Bar',
  'Food Truck',
  'Outro',
];

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { restaurantId, reload } = useRestaurant();
  const { buscarCEP, loading: cepLoading } = useCEP();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  // Step 1 - Informações Básicas
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [segment, setSegment] = useState('');
  
  // Step 2 - Endereço
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  
  // Step 3 - Logo
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Step 4 - Primeiro Item
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('');

  const progress = (currentStep / STEPS.length) * 100;

  const handleCepSearch = async () => {
    if (cep.length < 8) return;
    const address = await buscarCEP(cep.replace(/\D/g, ''));
    if (address) {
      setStreet(address.street || '');
      setNeighborhood(address.neighborhood || '');
      setCity(address.city || '');
      setState(address.state || '');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurantId) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurantId}/logo_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrlData.publicUrl);
      setLogoPreview(publicUrlData.publicUrl);
      toast.success('Logo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveStep1 = async () => {
    if (!restaurantId) return false;
    
    const { error } = await supabase
      .from('restaurant_settings')
      .update({ name, phone, segment })
      .eq('restaurant_id', restaurantId);

    if (error) {
      toast.error('Erro ao salvar informações');
      return false;
    }
    return true;
  };

  const saveStep2 = async () => {
    if (!restaurantId) return false;
    
    const { error } = await supabase
      .from('restaurant_settings')
      .update({ street, number, neighborhood, city, state, zipcode: cep })
      .eq('restaurant_id', restaurantId);

    if (error) {
      toast.error('Erro ao salvar endereço');
      return false;
    }
    return true;
  };

  const saveStep3 = async () => {
    if (!restaurantId) return false;
    
    if (logoUrl) {
      const { error } = await supabase
        .from('restaurant_settings')
        .update({ logo_url: logoUrl })
        .eq('restaurant_id', restaurantId);

      if (error) {
        toast.error('Erro ao salvar logo');
        return false;
      }
    }
    return true;
  };

  const saveStep4 = async () => {
    if (!restaurantId) return false;
    
    if (itemName && itemPrice && itemCategory) {
      // Criar categoria se não existir
      let categoryId: string;
      
      const { data: existingCat } = await supabase
        .from('categories')
        .select('id')
        .eq('name', itemCategory)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (existingCat) {
        categoryId = existingCat.id;
      } else {
        const { data: newCat, error: catError } = await supabase
          .from('categories')
          .insert({ name: itemCategory, restaurant_id: restaurantId })
          .select('id')
          .single();

        if (catError || !newCat) {
          toast.error('Erro ao criar categoria');
          return false;
        }
        categoryId = newCat.id;
      }

      // Criar item
      const { error: itemError } = await supabase
        .from('menu_items')
        .insert({
          name: itemName,
          price: parseFloat(itemPrice),
          category_id: categoryId,
          restaurant_id: restaurantId,
        });

      if (itemError) {
        toast.error('Erro ao criar item');
        return false;
      }
    }
    return true;
  };

  const handleNext = async () => {
    setSaving(true);
    let success = true;

    try {
      if (currentStep === 1) {
        if (!name.trim()) {
          toast.error('Preencha o nome do restaurante');
          setSaving(false);
          return;
        }
        success = await saveStep1();
      } else if (currentStep === 2) {
        success = await saveStep2();
      } else if (currentStep === 3) {
        success = await saveStep3();
      }

      if (success) {
        setCurrentStep(prev => prev + 1);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await saveStep4();
      
      // Marcar onboarding como completo
      const { error } = await supabase
        .from('restaurant_settings')
        .update({ onboarding_completed: true })
        .eq('restaurant_id', restaurantId);

      if (error) throw error;

      toast.success('Configuração concluída! Bem-vindo ao GourmetFlow!');
      await reload();
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      toast.error('Erro ao finalizar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('restaurant_settings')
        .update({ onboarding_completed: true })
        .eq('restaurant_id', restaurantId);

      if (error) throw error;

      toast.info('Você pode completar a configuração depois em Configurações');
      await reload();
      navigate('/dashboard');
    } catch (error) {
      toast.error('Erro ao pular configuração');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Configure seu Restaurante</h1>
          <p className="text-muted-foreground">Complete os passos abaixo para começar a usar</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <Progress value={progress} className="h-2 mb-4" />
          <div className="flex justify-between">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-1 ${
                    isActive ? 'text-primary' : isCompleted ? 'text-green-500' : 'text-muted-foreground'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-primary text-primary-foreground' : 
                    isCompleted ? 'bg-green-500 text-white' : 'bg-muted'
                  }`}>
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className="text-xs hidden sm:block">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Restaurante *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Pizzaria do João"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone/WhatsApp</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="segment">Segmento</Label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    onBlur={handleCepSearch}
                  />
                </div>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={handleCepSearch}
                  disabled={cepLoading}
                >
                  {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Rua..."
                  />
                </div>
                <div>
                  <Label htmlFor="number">Nº</Label>
                  <Input
                    id="number"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 text-center">
              <div className="border-2 border-dashed rounded-lg p-8">
                {logoPreview ? (
                  <div className="space-y-4">
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="mx-auto h-32 w-32 object-contain rounded-lg"
                    />
                    <Button variant="outline" onClick={() => { setLogoPreview(null); setLogoUrl(''); }}>
                      Remover
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      {uploadingLogo ? (
                        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                      ) : (
                        <Upload className="h-12 w-12 text-muted-foreground" />
                      )}
                      <span className="text-muted-foreground">
                        {uploadingLogo ? 'Enviando...' : 'Clique para enviar seu logo'}
                      </span>
                      <span className="text-xs text-muted-foreground">PNG, JPG até 2MB</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                  </label>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                O logo aparecerá no cardápio online e nos recibos
              </p>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <p className="text-muted-foreground text-center mb-4">
                Adicione seu primeiro item do cardápio (opcional)
              </p>
              <div>
                <Label htmlFor="itemName">Nome do Item</Label>
                <Input
                  id="itemName"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Ex: Pizza Margherita"
                />
              </div>
              <div>
                <Label htmlFor="itemPrice">Preço (R$)</Label>
                <Input
                  id="itemPrice"
                  type="number"
                  step="0.01"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="39.90"
                />
              </div>
              <div>
                <Label htmlFor="itemCategory">Categoria</Label>
                <Input
                  id="itemCategory"
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  placeholder="Ex: Pizzas, Bebidas, Sobremesas"
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={saving}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkip} disabled={saving}>
              <SkipForward className="h-4 w-4 mr-2" />
              Pular
            </Button>
            
            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Próximo
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Concluir
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
