import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import { 
  Users, 
  UserPlus, 
  Shield, 
  RefreshCw,
  CheckCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Employee {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  permissions: string[];
}

const availableScreens = [
  { id: "/dashboard", label: "Dashboard" },
  { id: "/pedidos", label: "Pedidos Online" },
  { id: "/cardapio", label: "Cardápio" },
  { id: "/pdv", label: "PDV" },
  { id: "/balcao", label: "Balcão" },
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
  { id: "/gestao-financeira", label: "Gestão Financeira" },
];

const roleLabels: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  manager: "Gerente",
  kitchen: "Cozinha",
  waiter: "Garçom",
  staff: "Funcionário",
};

export function EmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "staff" as string
  });
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);

  useEffect(() => {
    loadRestaurantAndEmployees();
  }, []);

  const loadRestaurantAndEmployees = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRestaurant } = await supabase
        .from("user_restaurants")
        .select("restaurant_id, role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!userRestaurant) {
        toast.error("Restaurante não encontrado");
        return;
      }

      setRestaurantId(userRestaurant.restaurant_id);

      const { data: employeesData, error } = await supabase
        .from("user_restaurants")
        .select(`
          id,
          user_id,
          role,
          is_active,
          created_at
        `)
        .eq("restaurant_id", userRestaurant.restaurant_id);

      if (error) throw error;

      const employeesWithDetails = await Promise.all(
        (employeesData || []).map(async (emp) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("user_id", emp.user_id)
            .single();

          const { data: permissions } = await supabase
            .from("user_permissions")
            .select("screen_path")
            .eq("user_id", emp.user_id)
            .eq("can_access", true);

          return {
            id: emp.id,
            user_id: emp.user_id,
            email: "email@exemplo.com",
            full_name: profile?.full_name || "Sem nome",
            phone: profile?.phone || null,
            role: emp.role,
            is_active: emp.is_active,
            created_at: emp.created_at,
            permissions: permissions?.map(p => p.screen_path) || [],
          };
        })
      );

      setEmployees(employeesWithDetails);
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error);
      toast.error("Erro ao carregar funcionários");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            invited_by_restaurant: restaurantId,
            invited_role: formData.role
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      if (formData.phone) {
        await supabase
          .from("profiles")
          .update({ phone: formData.phone })
          .eq("user_id", authData.user.id);
      }

      const roleMap: Record<string, string> = {
        admin: "admin",
        manager: "manager",
        kitchen: "kitchen",
        waiter: "waiter",
        staff: "waiter"
      };

      await supabase
        .from("user_roles")
        .upsert({
          user_id: authData.user.id,
          role: roleMap[formData.role] || "waiter"
        });

      if (selectedScreens.length > 0) {
        const permissions = selectedScreens.map(screen => ({
          user_id: authData.user.id,
          screen_path: screen,
          can_access: true
        }));

        await supabase
          .from("user_permissions")
          .insert(permissions);
      }

      toast.success("Funcionário convidado com sucesso!");
      setShowAddDialog(false);
      resetForm();
      await loadRestaurantAndEmployees();
    } catch (error: any) {
      console.error("Erro ao convidar funcionário:", error);
      toast.error(error.message || "Erro ao convidar funcionário");
    }
  };

  const handleToggleActive = async (employee: Employee) => {
    try {
      const { error } = await supabase
        .from("user_restaurants")
        .update({ is_active: !employee.is_active })
        .eq("id", employee.id);

      if (error) throw error;

      toast.success(employee.is_active ? "Funcionário desativado" : "Funcionário ativado");
      await loadRestaurantAndEmployees();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleEditPermissions = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSelectedScreens(employee.permissions);
    setShowEditDialog(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedEmployee) return;

    try {
      await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", selectedEmployee.user_id);

      if (selectedScreens.length > 0) {
        const permissions = selectedScreens.map(screen => ({
          user_id: selectedEmployee.user_id,
          screen_path: screen,
          can_access: true
        }));

        await supabase
          .from("user_permissions")
          .insert(permissions);
      }

      toast.success("Permissões atualizadas!");
      setShowEditDialog(false);
      await loadRestaurantAndEmployees();
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      toast.error("Erro ao salvar permissões");
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      full_name: "",
      phone: "",
      role: "staff"
    });
    setSelectedScreens([]);
  };

  const toggleScreen = (screenId: string) => {
    setSelectedScreens(prev => 
      prev.includes(screenId) 
        ? prev.filter(s => s !== screenId)
        : [...prev, screenId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-semibold">Gestão de Funcionários</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={loadRestaurantAndEmployees} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {employees.filter(e => e.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {employees.filter(e => !e.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {employees.filter(e => e.role === 'admin' || e.role === 'owner').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Equipe</CardTitle>
          <CardDescription>
            Funcionários com acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum funcionário cadastrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Função</TableHead>
                    <TableHead className="hidden md:table-cell">Permissões</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.full_name}</div>
                          <div className="text-sm text-muted-foreground sm:hidden">
                            {roleLabels[employee.role] || employee.role}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={employee.role === 'owner' ? 'default' : 'secondary'}>
                          {roleLabels[employee.role] || employee.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {employee.permissions.length} tela(s)
                        </span>
                      </TableCell>
                      <TableCell>
                        {employee.is_active ? (
                          <Badge className="bg-green-500">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Ativo</span>
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Inativo</span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditPermissions(employee)}
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          {employee.role !== 'owner' && (
                            <Button
                              size="sm"
                              variant={employee.is_active ? "destructive" : "default"}
                              onClick={() => handleToggleActive(employee)}
                            >
                              {employee.is_active ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convidar Funcionário</DialogTitle>
            <DialogDescription>
              Preencha os dados para convidar um novo membro
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddEmployee} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="role">Função *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Funcionário</SelectItem>
                    <SelectItem value="waiter">Garçom</SelectItem>
                    <SelectItem value="kitchen">Cozinha</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Permissões de Tela</Label>
              <ScrollArea className="h-48 border rounded-md p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableScreens.map((screen) => (
                    <div key={screen.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={screen.id}
                        checked={selectedScreens.includes(screen.id)}
                        onCheckedChange={() => toggleScreen(screen.id)}
                      />
                      <Label htmlFor={screen.id} className="text-sm font-normal cursor-pointer">
                        {screen.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Permissões</DialogTitle>
            <DialogDescription>
              {selectedEmployee?.full_name}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-64 border rounded-md p-3">
            <div className="space-y-2">
              {availableScreens.map((screen) => (
                <div key={screen.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-${screen.id}`}
                    checked={selectedScreens.includes(screen.id)}
                    onCheckedChange={() => toggleScreen(screen.id)}
                  />
                  <Label htmlFor={`edit-${screen.id}`} className="text-sm font-normal cursor-pointer">
                    {screen.label}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePermissions}>
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
