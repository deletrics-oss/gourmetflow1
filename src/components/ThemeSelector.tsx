import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/card';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: 'light', label: 'Modo Claro', description: 'Interface clara e brilhante', icon: Sun },
    { value: 'dark', label: 'Modo Escuro', description: 'Interface escura e confortável', icon: Moon },
    { value: 'system', label: 'Sistema', description: 'Segue configuração do sistema', icon: Monitor },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Monitor className="h-6 w-6 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Personalização da Interface</h3>
          <p className="text-sm text-muted-foreground">Personalize cores, fontes e visual do sistema</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {themes.map(({ value, label, description, icon: Icon }) => (
          <Card
            key={value}
            className={`p-6 cursor-pointer transition-all hover:shadow-md ${
              theme === value
                ? 'border-2 border-primary bg-primary/5'
                : 'border-2 border-transparent'
            }`}
            onClick={() => setTheme(value as 'light' | 'dark' | 'system')}
          >
            <div className="flex flex-col items-center text-center">
              <Icon className="h-12 w-12 mb-3" />
              <h4 className="font-semibold mb-1">{label}</h4>
              <p className="text-sm text-muted-foreground">{description}</p>
              {theme === value && (
                <p className="text-xs text-primary mt-2 font-medium">✓ Ativo</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-sm">
          <strong>Dica:</strong> O tema {theme === 'light' ? 'claro' : theme === 'dark' ? 'escuro' : 'do sistema'} está ativo. {theme === 'dark' ? 'Cores mais suaves para trabalhar à noite.' : theme === 'light' ? 'Interface brilhante para o dia.' : 'Tema segue a configuração do seu dispositivo.'}
        </p>
      </div>
    </div>
  );
}
