import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { AddUserDialog } from '@/components/dialogs/AddUserDialog';
import { useAuth } from '@/hooks/useAuth';

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  profile: {
    full_name: string;
    phone: string;
  } | null;
  role: {
    role: 'admin' | 'manager' | 'kitchen' | 'waiter';
  } | null;
}

const roleLabels = {
  admin: 'Administrador',
  manager: 'Gerente',
  kitchen: 'Cozinha',
  waiter: 'Garçom',
};

export default function Usuarios() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { userRole } = useAuth();

  const fetchUsers = async () => {
    try {
      // Get all profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          full_name,
          phone,
          created_at
        `);
      
      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithData = (profiles || []).map((profile) => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          email: '', // We can't get email from profiles, so we'll need to get it differently
          created_at: profile.created_at,
          profile: {
            full_name: profile.full_name,
            phone: profile.phone,
          },
          role: userRole ? { role: userRole.role } : null,
        };
      });

      setUsers(usersWithData as UserWithRole[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários. Verifique suas permissões.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Role atualizada com sucesso!');
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;

    try {
      // Delete user profile and role (cascade will handle it)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast.success('Usuário removido com sucesso!');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erro ao deletar usuário. Você precisa ser administrador.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Gerenciamento de Usuários
            </h1>
            <p className="text-gray-600">Gerencie usuários e permissões do sistema</p>
          </div>
          {userRole === 'admin' && (
            <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar Usuário
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuários do Sistema</CardTitle>
            <CardDescription>
              Total de {users.length} usuários cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.profile?.full_name || '-'}</TableCell>
                    <TableCell>{user.profile?.phone || '-'}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role?.role || 'waiter'}
                        onValueChange={(value) => handleUpdateRole(user.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="manager">Gerente</SelectItem>
                          <SelectItem value="kitchen">Cozinha</SelectItem>
                          <SelectItem value="waiter">Garçom</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          title="Remover usuário"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AddUserDialog 
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={fetchUsers}
        />
      </div>
    </div>
  );
}
