import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { logActionWithContext } from '@/lib/logging';

interface UserWithPermissions {
  id: string;
  email: string;
  profile: {
    full_name: string;
  } | null;
  role: {
    role: 'admin' | 'manager' | 'kitchen' | 'waiter';
  } | null;
  permissions: {
    screen_path: string;
    can_access: boolean;
  }[];
}

const AVAILABLE_SCREENS = [
  { path: '/dashboard', name: 'Dashboard', description: 'Visão geral do sistema' },
  { path: '/cardapio', name: 'Cardápio', description: 'Gerenciar itens do menu' },
  { path: '/pedidos', name: 'Pedidos Online', description: 'Pedidos via web/WhatsApp' },
  { path: '/comandas', name: 'Comandas', description: 'Gerenciar comandas' },
  { path: '/salao', name: 'Salão', description: 'Mesas e atendimento' },
  { path: '/pdv', name: 'PDV', description: 'Ponto de venda' },
  { path: '/cozinha', name: 'Cozinha (KDS)', description: 'Painel de cozinha' },
  { path: '/caixa', name: 'Caixa', description: 'Movimentações financeiras' },
  { path: '/estoque', name: 'Estoque', description: 'Controle de estoque' },
  { path: '/fornecedores', name: 'Fornecedores', description: 'Cadastro de fornecedores' },
  { path: '/clientes', name: 'Clientes', description: 'Cadastro de clientes' },
  { path: '/relatorios', name: 'Relatórios', description: 'Relatórios gerenciais' },
  { path: '/cupons', name: 'Cupons', description: 'Cupons de desconto' },
  { path: '/cashback', name: 'Cashback', description: 'Programa de cashback' },
  { path: '/configuracoes', name: 'Configurações', description: 'Configurações do sistema' },
  { path: '/usuarios', name: 'Usuários', description: 'Gerenciar usuários' },
];

export default function PermissoesUsuarios() {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name');
      
      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Get all permissions from system_user_permissions
      const { data: permissions, error: permError } = await supabase
        .from('system_user_permissions')
        .select('user_id, screen_id, screen_name');
      
      if (permError) throw permError;

      // Combine the data - convert system_user_permissions to expected format
      const usersWithData = (profiles || []).map((profile) => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        const userPerms = permissions?.filter(p => p.user_id === profile.user_id) || [];
        
        // Convert system_user_permissions format to user_permissions format
        const userPermissions = userPerms.map(p => ({
          screen_path: p.screen_id,
          can_access: true // system_user_permissions only stores granted permissions
        }));
        
        return {
          id: profile.user_id,
          email: '', // Not available from profiles
          profile: {
            full_name: profile.full_name,
          },
          role: userRole ? { role: userRole.role } : null,
          permissions: userPermissions,
        };
      });

      setUsers(usersWithData as UserWithPermissions[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = async (userId: string, screenPath: string, currentAccess: boolean) => {
    try {
      // Find screen info
      const screen = AVAILABLE_SCREENS.find(s => s.path === screenPath);
      if (!screen) return;

      const { data: existing } = await supabase
        .from('system_user_permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('screen_id', screenPath)
        .maybeSingle();

      if (currentAccess && existing) {
        // Remove permission (delete)
        const { error } = await supabase
          .from('system_user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('screen_id', screenPath);

        if (error) throw error;

        // Log da ação
        await logActionWithContext(
          'remove_user_permission',
          'system_user_permissions',
          existing.id,
          { screen_name: screen.name, screen_path: screenPath }
        );
      } else if (!currentAccess && !existing) {
        // Add permission (insert)
        const { data, error } = await supabase
          .from('system_user_permissions')
          .insert({
            user_id: userId,
            screen_id: screenPath,
            screen_name: screen.name
          })
          .select()
          .single();

        if (error) throw error;

        // Log da ação
        await logActionWithContext(
          'grant_user_permission',
          'system_user_permissions',
          data?.id,
          { screen_name: screen.name, screen_path: screenPath }
        );
      }

      toast.success('Permissão atualizada!');
      fetchUsers();
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Erro ao atualizar permissão');
    }
  };

  const hasPermission = (user: UserWithPermissions, screenPath: string): boolean => {
    const perm = user.permissions.find(p => p.screen_path === screenPath);
    return perm ? perm.can_access : false;
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <div className="text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
              <Shield className="h-8 w-8" />
              Permissões de Usuários
            </h1>
            <p className="text-muted-foreground">Controle quais telas cada usuário pode acessar</p>
          </div>
        </div>

        <div className="grid gap-6">
          {users.filter(u => u.role?.role !== 'admin').map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {user.profile?.full_name || 'Usuário sem nome'}
                    </CardTitle>
                    <CardDescription>
                      <Badge className="mt-2">
                        {user.role?.role === 'manager' ? 'Gerente' : 
                         user.role?.role === 'kitchen' ? 'Cozinha' : 
                         user.role?.role === 'waiter' ? 'Garçom' : 'Sem role'}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tela</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Acesso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {AVAILABLE_SCREENS.map((screen) => (
                      <TableRow key={screen.path}>
                        <TableCell className="font-medium">{screen.name}</TableCell>
                        <TableCell className="text-muted-foreground">{screen.description}</TableCell>
                        <TableCell className="text-right">
                          <Checkbox
                            checked={hasPermission(user, screen.path)}
                            onCheckedChange={() => 
                              handlePermissionToggle(user.id, screen.path, hasPermission(user, screen.path))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
