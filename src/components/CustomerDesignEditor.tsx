import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Upload, X, Eye, Palette, Type, Image as ImageIcon } from 'lucide-react';

interface DesignSettings {
  logo_url?: string;
  background_url?: string;
  background_color?: string;
  primary_color?: string;
  accent_color?: string;
  totem_welcome_message?: string;
  menu_header_message?: string;
  customer_theme?: string;
  show_logo_on_menu?: boolean;
  menu_font?: string;
}

interface Props {
  settings: DesignSettings;
  onSave: (settings: DesignSettings) => void;
}

const themes = [
  { id: 'modern', name: 'Moderno', description: 'Design limpo com sombras suaves' },
  { id: 'classic', name: 'Clássico', description: 'Estilo tradicional e acolhedor' },
  { id: 'minimal', name: 'Minimalista', description: 'Ultra limpo e direto' },
  { id: 'vibrant', name: 'Vibrante', description: 'Cores fortes e animado' }
];

const fonts = [
  { id: 'default', name: 'Inter (Padrão)' },
  { id: 'elegant', name: 'Playfair Display (Elegante)' },
  { id: 'friendly', name: 'Poppins (Amigável)' },
  { id: 'modern', name: 'Montserrat (Moderno)' }
];

const gradients = [
  { name: 'Sunset', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { name: 'Ocean', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Forest', value: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)' },
  { name: 'Night', value: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' },
  { name: 'Warm', value: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)' }
];

export function CustomerDesignEditor({ settings, onSave }: Props) {
  const [localSettings, setLocalSettings] = useState<DesignSettings>(settings);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [backgroundType, setBackgroundType] = useState<'color' | 'image' | 'gradient'>(
    settings.background_url ? 'image' : 'color'
  );

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 2MB)');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('menu-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName);

      setLocalSettings({ ...localSettings, logo_url: publicUrl });
      toast.success('Logo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast.error('Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 5MB)');
      return;
    }

    setUploadingBg(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `bg-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(fileName);

      setLocalSettings({ ...localSettings, background_url: publicUrl, background_color: undefined });
      toast.success('Background enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar background:', error);
      toast.error('Erro ao enviar background');
    } finally {
      setUploadingBg(false);
    }
  };

  const handleSave = () => {
    onSave(localSettings);
  };

  const openPreview = (type: 'totem' | 'menu' | 'tablet') => {
    const urls = {
      totem: '/totem',
      menu: '/customer-menu',
      tablet: '/menu-tablet?tableId=demo'
    };
    window.open(urls[type], '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Design das Telas de Cliente</h3>
        <p className="text-sm text-muted-foreground">
          Personalize a aparência do Totem, Menu Online e Tablet
        </p>
      </div>

      <Tabs defaultValue="logo" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="background">Background</TabsTrigger>
          <TabsTrigger value="colors">Cores</TabsTrigger>
          <TabsTrigger value="messages">Mensagens</TabsTrigger>
          <TabsTrigger value="theme">Tema</TabsTrigger>
        </TabsList>

        <TabsContent value="logo" className="space-y-4">
          <Card className="p-6">
            <Label className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4" />
              Logo do Estabelecimento
            </Label>
            
            {localSettings.logo_url && (
              <div className="mb-4 relative inline-block">
                <img 
                  src={localSettings.logo_url} 
                  alt="Logo" 
                  className="h-32 w-auto rounded-lg border"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2"
                  onClick={() => setLocalSettings({ ...localSettings, logo_url: undefined })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="relative"
                disabled={uploadingLogo}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="w-4 h-4 mr-2" />
                {uploadingLogo ? 'Enviando...' : 'Upload Logo'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Formatos: PNG, JPG, WEBP (máx 2MB)
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="background" className="space-y-4">
          <Card className="p-6">
            <Label className="mb-4 block">Tipo de Background</Label>
            
            <div className="flex gap-2 mb-4">
              <Button
                variant={backgroundType === 'color' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBackgroundType('color')}
              >
                Cor Sólida
              </Button>
              <Button
                variant={backgroundType === 'image' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBackgroundType('image')}
              >
                Imagem
              </Button>
              <Button
                variant={backgroundType === 'gradient' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setBackgroundType('gradient')}
              >
                Gradiente
              </Button>
            </div>

            {backgroundType === 'color' && (
              <div className="space-y-2">
                <Label>Cor de Fundo</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={localSettings.background_color || '#f8fafc'}
                    onChange={(e) => setLocalSettings({ 
                      ...localSettings, 
                      background_color: e.target.value,
                      background_url: undefined 
                    })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={localSettings.background_color || '#f8fafc'}
                    onChange={(e) => setLocalSettings({ 
                      ...localSettings, 
                      background_color: e.target.value,
                      background_url: undefined 
                    })}
                    placeholder="#f8fafc"
                  />
                </div>
              </div>
            )}

            {backgroundType === 'image' && (
              <div className="space-y-4">
                {localSettings.background_url && (
                  <div className="relative inline-block">
                    <img 
                      src={localSettings.background_url} 
                      alt="Background" 
                      className="h-40 w-auto rounded-lg border"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2"
                      onClick={() => setLocalSettings({ ...localSettings, background_url: undefined })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="relative"
                  disabled={uploadingBg}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingBg ? 'Enviando...' : 'Upload Imagem'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Formatos: PNG, JPG, WEBP (máx 5MB)
                </p>
              </div>
            )}

            {backgroundType === 'gradient' && (
              <div className="space-y-4">
                <Label>Gradientes Pré-definidos</Label>
                <div className="grid grid-cols-2 gap-3">
                  {gradients.map((grad) => (
                    <button
                      key={grad.name}
                      onClick={() => setLocalSettings({ 
                        ...localSettings, 
                        background_color: grad.value,
                        background_url: undefined 
                      })}
                      className="h-20 rounded-lg border-2 hover:border-primary transition-colors relative overflow-hidden"
                      style={{ background: grad.value }}
                    >
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="text-white font-medium text-sm">{grad.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4" />
                Cor Principal
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Usada em botões, links e destaques
              </p>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localSettings.primary_color || '#e53e3e'}
                  onChange={(e) => setLocalSettings({ ...localSettings, primary_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={localSettings.primary_color || '#e53e3e'}
                  onChange={(e) => setLocalSettings({ ...localSettings, primary_color: e.target.value })}
                  placeholder="#e53e3e"
                />
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4" />
                Cor de Destaque
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Usada em badges, preços e elementos secundários
              </p>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localSettings.accent_color || '#f59e0b'}
                  onChange={(e) => setLocalSettings({ ...localSettings, accent_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={localSettings.accent_color || '#f59e0b'}
                  onChange={(e) => setLocalSettings({ ...localSettings, accent_color: e.target.value })}
                  placeholder="#f59e0b"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <Label>Mensagem de Boas-vindas (Totem)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Primeira tela do totem de autoatendimento
              </p>
              <Input
                value={localSettings.totem_welcome_message || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, totem_welcome_message: e.target.value })}
                placeholder="Bem-vindo! Faça seu pedido"
              />
            </div>

            <div>
              <Label>Mensagem do Cabeçalho (Menu)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Exibida no topo do cardápio online e tablet
              </p>
              <Input
                value={localSettings.menu_header_message || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, menu_header_message: e.target.value })}
                placeholder="O que você deseja?"
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-4">
                <Type className="w-4 h-4" />
                Tema Visual
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setLocalSettings({ ...localSettings, customer_theme: theme.id })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      localSettings.customer_theme === theme.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium mb-1">{theme.name}</div>
                    <div className="text-xs text-muted-foreground">{theme.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Fonte do Cardápio</Label>
              <select
                value={localSettings.menu_font || 'default'}
                onChange={(e) => setLocalSettings({ ...localSettings, menu_font: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3"
              >
                {fonts.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="p-6">
        <Label className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4" />
          Preview
        </Label>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openPreview('totem')}>
            <Eye className="w-4 h-4 mr-2" />
            Totem
          </Button>
          <Button variant="outline" onClick={() => openPreview('menu')}>
            <Eye className="w-4 h-4 mr-2" />
            Menu Online
          </Button>
          <Button variant="outline" onClick={() => openPreview('tablet')}>
            <Eye className="w-4 h-4 mr-2" />
            Tablet
          </Button>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          💾 Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
