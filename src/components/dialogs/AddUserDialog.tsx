import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const availableScreens = [
  { id: "/", label: "Dashboard" },
  { id: "/pedidos", label: "Pedidos Online" },
  { id: "/cardapio", label: "Cardápio" },
  { id: "/pdv", label: "PDV" },
  { id: "/salao", label: "Salão" },
  { id: "/comandas", label: "Comandas" },
  { id: "/cozinha", label: "Cozinha (KDS)" },
  { id: "/estoque", label: "Estoque" },
  { id: "/relatorios", label: "Relatórios" },
  { id: "/configuracoes", label: "Configurações" },
  { id: "/cupons", label: "Cupons" },
  { id: "/cashback", label: "Cashback" },
  { id: "/clientes", label: "Clientes" },
  { id: "/fornecedores", label: "Fornecedores" },
  { id: "/monitor-cozinha", label: "Monitor Cozinha" },
  { id: "/caixa", label: "Gestão de Caixa" },
  { id: "/usuarios", label: "Usuários" }
];

export function AddUserDialog({ open, onOpenChange, onSuccess }: AddUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "waiter" as "admin" | "manager" | "kitchen" | "waiter"
  });
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.full_name) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      // Criar usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // Atualizar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ phone: formData.phone })
        .eq('user_id', authData.user.id);

      if (profileError) console.error('Profile update error:', profileError);

      // Definir role
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: formData.role })
        .eq('user_id', authData.user.id);

      if (roleError) console.error('Role update error:', roleError);

      // Criar permissões de telas
      if (selectedScreens.length > 0) {
        const permissions = selectedScreens.map(screen => ({
          user_id: authData.user.id,
          screen_path: screen,
          can_access: true
        }));

        const { error: permError } = await supabase
          .from('user_permissions')
          .insert(permissions);

        if (permError) console.error('Permission error:', permError);
      }

      toast.success("Usuário criado com sucesso!");
      onSuccess();
      onOpenChange(false);
      setFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "waiter"
      });
      setSelectedScreens([]);
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setLoading(false);
    }
  };

  const toggleScreen = (screenId: string) => {
    setSelectedScreens(prev => 
      prev.includes(screenId) 
        ? prev.filter(s => s !== screenId)
        : [...prev, screenId]
    );
  };

  const selectAll = () => {
    setSelectedScreens(availableScreens.map(s => s.id));
  };

  const clearAll = () => {
    setSelectedScreens([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Função *</Label>
            <Select value={formData.role} onValueChange={(value: any) => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="manager">Gerente</SelectItem>
                <SelectItem value="kitchen">Cozinha</SelectItem>
                <SelectItem value="waiter">Garçom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Permissões de Acesso</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={selectAll}>
                  Selecionar Todos
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={clearAll}>
                  Limpar
                </Button>
              </div>
            </div>
            <ScrollArea className="h-64 border rounded-md p-4">
              <div className="grid grid-cols-2 gap-3">
                {availableScreens.map((screen) => (
                  <div key={screen.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={screen.id}
                      checked={selectedScreens.includes(screen.id)}
                      onCheckedChange={() => toggleScreen(screen.id)}
                    />
                    <label
                      htmlFor={screen.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {screen.label}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {selectedScreens.length} tela(s) selecionada(s)
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
