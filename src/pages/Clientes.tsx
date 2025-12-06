import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Search, User, AlertTriangle, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useCEP } from "@/hooks/useCEP";
import { useRestaurant } from "@/hooks/useRestaurant";

export default function Clientes() {
  const { restaurantId } = useRestaurant();
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const { buscarCEP, loading: cepLoading } = useCEP();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cpf: "",
    zipcode: "",
    address: { street: "", number: "", neighborhood: "", city: "", state: "" },
    notes: "",
    is_suspicious: false
  });

  useEffect(() => {
    if (restaurantId) {
      loadCustomers();
    }
    
    // Realtime subscription para novos clientes
    const channel = supabase
      .channel('customers_changes')
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'customers'
      }, () => {
        if (restaurantId) loadCustomers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const loadCustomers = async () => {
    if (!restaurantId) return;
    
    try {
      const { data, error } = await supabase
        .from('customers' as any)
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const { data: historyData } = await supabase
        .from('customer_order_history' as any)
        .select('*');
      
      setCustomers(data || []);
      setCustomerHistory(historyData || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

  const viewCustomerHistory = async (customer: any) => {
    setSelectedCustomer(customer);
    setHistoryDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Preencha nome e telefone');
      return;
    }

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers' as any)
          .update(formData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast.success('Cliente atualizado!');
      } else {
        const { error } = await supabase
          .from('customers' as any)
          .insert([{ ...formData, restaurant_id: restaurantId }]);

        if (error) throw error;
        toast.success('Cliente cadastrado!');
      }

      setDialogOpen(false);
      resetForm();
      loadCustomers();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este cliente?')) return;

    try {
      const { error} = await supabase
        .from('customers' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Cliente excluído!');
      loadCustomers();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      toast.error('Erro ao excluir cliente');
    }
  };

  const toggleSuspicious = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('customers' as any)
        .update({ is_suspicious: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(!currentStatus ? 'Cliente marcado como suspeito' : 'Marcação removida');
      loadCustomers();
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const handleClone = async (customer: any) => {
    setFormData({
      name: customer.name + ' (Cópia)',
      phone: '',
      cpf: '',
      zipcode: customer.zipcode || '',
      address: customer.address || { street: "", number: "", neighborhood: "", city: "", state: "" },
      notes: customer.notes || "",
      is_suspicious: false
    });
    setDialogOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (selectedCustomers.length === 0) {
      toast.error('Selecione clientes para remover');
      return;
    }

    if (!confirm(`Deseja excluir ${selectedCustomers.length} cliente(s)?`)) return;

    try {
      const { error } = await supabase
        .from('customers' as any)
        .delete()
        .in('id', selectedCustomers);

      if (error) throw error;
      toast.success('Clientes excluídos!');
      setSelectedCustomers([]);
      loadCustomers();
    } catch (error) {
      console.error('Erro ao excluir clientes:', error);
      toast.error('Erro ao excluir clientes');
    }
  };

  const toggleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  const openEditDialog = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      cpf: customer.cpf || "",
      zipcode: customer.zipcode || "",
      address: customer.address || { street: "", number: "", neighborhood: "", city: "", state: "" },
      notes: customer.notes || "",
      is_suspicious: customer.is_suspicious || false
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      cpf: "",
      zipcode: "",
      address: { street: "", number: "", neighborhood: "", city: "", state: "" },
      notes: "",
      is_suspicious: false
    });
    setEditingCustomer(null);
  };

  const handleCEPSearch = async () => {
    if (!formData.zipcode) {
      toast.error('Digite um CEP');
      return;
    }

    const cepData = await buscarCEP(formData.zipcode);
    if (cepData) {
      setFormData({
        ...formData,
        address: {
          street: cepData.street,
          number: formData.address.number,
          neighborhood: cepData.neighborhood,
          city: cepData.city,
          state: cepData.state
        }
      });
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.cpf?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8" />
            Cadastro de Clientes
          </h1>
          <p className="text-muted-foreground">Gerencie os clientes do restaurante</p>
        </div>
        <div className="flex gap-2">
          {selectedCustomers.length > 0 && (
            <Button variant="destructive" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remover ({selectedCustomers.length})
            </Button>
          )}
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <Card className="p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum cliente cadastrado
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => {
                const history = customerHistory.find(h => h.customer_id === customer.id);
                const isSelected = selectedCustomers.includes(customer.id);
                
                return (
                  <TableRow key={customer.id} className={customer.is_suspicious ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCustomers([...selectedCustomers, customer.id]);
                          } else {
                            setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {customer.name}
                        {customer.is_suspicious && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Suspeito
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.cpf || '-'}</TableCell>
                    <TableCell>{customer.address?.city || '-'}</TableCell>
                    <TableCell>
                      {customer.created_at ? new Date(customer.created_at).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>
                      {history ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewCustomerHistory(customer)}
                          className="gap-2"
                        >
                          {history.total_orders} pedidos
                          {history.completed_orders > 0 && (
                            <span className="text-green-600">({history.completed_orders} ✓)</span>
                          )}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">Nenhum pedido</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleSuspicious(customer.id, customer.is_suspicious)}
                          title={customer.is_suspicious ? "Remover marcação de suspeito" : "Marcar como suspeito"}
                        >
                          <AlertTriangle className={`h-4 w-4 ${customer.is_suspicious ? 'text-red-600' : 'text-muted-foreground'}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleClone(customer)}
                          title="Clonar cliente"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(customer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(customer.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Endereço</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.zipcode}
                      onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                      placeholder="00000-000"
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
                <div></div>
                <div className="col-span-2">
                  <Label>Rua</Label>
                  <Input
                    value={formData.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input
                    value={formData.address.number}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, number: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input
                    value={formData.address.neighborhood}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, neighborhood: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={formData.address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Input
                    value={formData.address.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value }
                    })}
                    maxLength={2}
                    placeholder="SP"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Notas sobre o cliente..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="suspicious"
                checked={formData.is_suspicious}
                onCheckedChange={(checked) => setFormData({ ...formData, is_suspicious: checked as boolean })}
              />
              <Label htmlFor="suspicious" className="flex items-center gap-2 cursor-pointer">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Marcar como cliente suspeito
              </Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Pedidos - {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                  <p className="text-2xl font-bold">
                    {customerHistory.find(h => h.customer_id === selectedCustomer.id)?.total_orders || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos Concluídos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {customerHistory.find(h => h.customer_id === selectedCustomer.id)?.completed_orders || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Gasto</p>
                  <p className="text-2xl font-bold">
                    R$ {(customerHistory.find(h => h.customer_id === selectedCustomer.id)?.total_spent || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Último Pedido</p>
                  <p className="text-sm font-medium">
                    {customerHistory.find(h => h.customer_id === selectedCustomer.id)?.last_order_date 
                      ? new Date(customerHistory.find(h => h.customer_id === selectedCustomer.id)?.last_order_date).toLocaleDateString('pt-BR')
                      : 'Nunca'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
