import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, Trash2, Edit, Users2, Key } from 'lucide-react';
import { toast } from 'sonner';

const availableScreens = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'pdv', name: 'PDV' },
  { id: 'cardapio', name: 'Cardápio' },
  { id: 'pedidos', name: 'Pedidos' },
  { id: 'pedidos-online', name: 'Pedidos Online' },
  { id: 'comandas', name: 'Comandas' },
  { id: 'salao', name: 'Salão' },
  { id: 'cozinha', name: 'Cozinha (KDS)' },
  { id: 'estoque', name: 'Estoque' },
  { id: 'clientes', name: 'Clientes' },
  { id: 'fornecedores', name: 'Fornecedores' },
  { id: 'cupons', name: 'Cupons' },
  { id: 'cashback', name: 'Cashback' },
  { id: 'gestao-caixa', name: 'Gestão de Caixa' },
  { id: 'relatorios', name: 'Relatórios' },
  { id: 'configuracoes', name: 'Configurações' },
  { id: 'usuarios', name: 'Usuários' },
  { id: 'permissoes', name: 'Permissões' },
];

export default function Usuarios() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  // Form fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('usuario');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('system_users')
        .select(`
          *,
          permissions:system_user_permissions(screen_id, screen_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user: any = null) => {
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setUserType(user.user_type);
      setSelectedPermissions(user.permissions?.map((p: any) => p.screen_id) || []);
      setPassword('');
    } else {
      setEditingUser(null);
      setUsername('');
      setPassword('');
      setUserType('usuario');
      setSelectedPermissions([]);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setUserType('usuario');
    setSelectedPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username) {
      toast.error('Digite um nome de usuário');
      return;
    }

    if (!editingUser && !password) {
      toast.error('Digite uma senha');
      return;
    }

    try {
      if (editingUser) {
        // Update user
        const updateData: any = {
          user_type: userType,
        };

        // Only update password if provided
        if (password) {
          updateData.password_hash = password; // In production, hash this!
        }

        const { error: userError } = await supabase
          .from('system_users')
          .update(updateData)
          .eq('id', editingUser.id);

        if (userError) throw userError;

        // Update permissions
        // Delete old permissions
        await supabase
          .from('system_user_permissions')
          .delete()
          .eq('user_id', editingUser.id);

        // Insert new permissions
        if (selectedPermissions.length > 0) {
          const permissionsData = selectedPermissions.map(screenId => ({
            user_id: editingUser.id,
            screen_id: screenId,
            screen_name: availableScreens.find(s => s.id === screenId)?.name || screenId,
          }));

          const { error: permError } = await supabase
            .from('system_user_permissions')
            .insert(permissionsData);

          if (permError) throw permError;
        }

        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Create new user
        const { data: newUser, error: userError } = await supabase
          .from('system_users')
          .insert({
            username,
            password_hash: password, // In production, hash this!
            user_type: userType,
          })
          .select()
          .single();

        if (userError) throw userError;

        // Insert permissions
        if (selectedPermissions.length > 0 && newUser) {
          const permissionsData = selectedPermissions.map(screenId => ({
            user_id: newUser.id,
            screen_id: screenId,
            screen_name: availableScreens.find(s => s.id === screenId)?.name || screenId,
          }));

          const { error: permError } = await supabase
            .from('system_user_permissions')
            .insert(permissionsData);

          if (permError) throw permError;
        }

        toast.success('Usuário criado com sucesso!');
      }

      handleCloseDialog();
      loadUsers();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      toast.error(error.message || 'Erro ao salvar usuário');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      const { error } = await supabase
        .from('system_users')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Usuário excluído com sucesso!');
      loadUsers();
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  const handleSelectAll = () => {
    setSelectedPermissions(availableScreens.map(s => s.id));
  };

  const handleClearAll = () => {
    setSelectedPermissions([]);
  };

  return (
    <div className="space-y-6 bg-background text-foreground">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users2 className="h-8 w-8 text-primary" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground">Controle de acesso e permissões do sistema</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={user.user_type === 'admin' ? 'default' : 'secondary'}>
                      {user.user_type === 'admin' ? 'Administrador' : 'Usuário'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.permissions?.slice(0, 3).map((perm: any) => (
                        <Badge key={perm.screen_id} variant="outline" className="text-xs">
                          {perm.screen_name}
                        </Badge>
                      ))}
                      {user.permissions?.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.permissions.length - 3} mais
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'destructive'}>
                      {user.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(user)}
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para criar/editar usuário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-background text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Nome de Usuário *</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite o nome de usuário"
                  disabled={!!editingUser}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Senha {editingUser ? '(deixe em branco para manter)' : '*'}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha"
                  required={!editingUser}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="userType">Tipo de Usuário *</Label>
              <Select value={userType} onValueChange={setUserType}>
                <SelectTrigger id="userType" className="bg-background text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background text-foreground">
                  <SelectItem value="usuario">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Permissões de Acesso</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                    Selecionar Todos
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleClearAll}>
                    Limpar
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[300px] border rounded-md p-4">
                <div className="grid grid-cols-2 gap-4">
                  {availableScreens.map((screen) => (
                    <div key={screen.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={screen.id}
                        checked={selectedPermissions.includes(screen.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPermissions([...selectedPermissions, screen.id]);
                          } else {
                            setSelectedPermissions(selectedPermissions.filter((p) => p !== screen.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={screen.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {screen.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                <UserPlus className="h-4 w-4" />
                {editingUser ? 'Atualizar' : 'Criar'} Usuário
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
