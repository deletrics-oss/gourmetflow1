import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Search, Bike } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export default function Motoboys() {
  const [motoboys, setMotoboys] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMotoboy, setEditingMotoboy] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cnh: "",
    vehicle_plate: "",
    is_active: true
  });

  useEffect(() => {
    loadMotoboys();
  }, []);

  const loadMotoboys = async () => {
    try {
      const { data, error } = await supabase
        .from('motoboys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMotoboys(data || []);
    } catch (error) {
      console.error('Erro ao carregar motoboys:', error);
      toast.error('Erro ao carregar motoboys');
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Preencha nome e telefone');
      return;
    }

    try {
      // Buscar restaurant_id do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { data: userRestaurant } = await supabase
        .from('user_restaurants')
        .select('restaurant_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!userRestaurant) {
        toast.error('Restaurante não encontrado');
        return;
      }

      const dataToSave = {
        ...formData,
        restaurant_id: userRestaurant.restaurant_id
      };

      if (editingMotoboy) {
        const { error } = await supabase
          .from('motoboys')
          .update(dataToSave)
          .eq('id', editingMotoboy.id);

        if (error) throw error;
        toast.success('Motoboy atualizado!');
      } else {
        const { error } = await supabase
          .from('motoboys')
          .insert([dataToSave]);

        if (error) throw error;
        toast.success('Motoboy cadastrado!');
      }

      setDialogOpen(false);
      resetForm();
      loadMotoboys();
    } catch (error: any) {
      console.error('Erro ao salvar motoboy:', error);
      toast.error(error?.message || 'Erro ao salvar motoboy');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este motoboy?')) return;

    try {
      const { error } = await supabase
        .from('motoboys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Motoboy excluído!');
      loadMotoboys();
    } catch (error) {
      console.error('Erro ao excluir motoboy:', error);
      toast.error('Erro ao excluir motoboy');
    }
  };

  const openEditDialog = (motoboy: any) => {
    setEditingMotoboy(motoboy);
    setFormData({
      name: motoboy.name,
      phone: motoboy.phone || "",
      cnh: motoboy.cnh || "",
      vehicle_plate: motoboy.vehicle_plate || "",
      is_active: motoboy.is_active !== undefined ? motoboy.is_active : true
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      cnh: "",
      vehicle_plate: "",
      is_active: true
    });
    setEditingMotoboy(null);
  };

  const filteredMotoboys = motoboys.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone?.includes(searchTerm) ||
    m.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bike className="h-8 w-8" />
            Cadastro de Motoboys
          </h1>
          <p className="text-muted-foreground">Gerencie os entregadores</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Motoboy
        </Button>
      </div>

      <Card className="p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou placa..."
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
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>CNH</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMotoboys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum motoboy cadastrado
                </TableCell>
              </TableRow>
            ) : (
              filteredMotoboys.map((motoboy) => (
                <TableRow key={motoboy.id}>
                  <TableCell className="font-medium">{motoboy.name}</TableCell>
                  <TableCell>{motoboy.phone || '-'}</TableCell>
                  <TableCell>{motoboy.cnh || '-'}</TableCell>
                  <TableCell>{motoboy.vehicle_plate || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={motoboy.is_active ? "default" : "secondary"}>
                      {motoboy.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(motoboy)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(motoboy.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMotoboy ? 'Editar' : 'Novo'} Motoboy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label>CNH</Label>
              <Input
                value={formData.cnh}
                onChange={(e) => setFormData({...formData, cnh: e.target.value})}
                placeholder="000000000000"
              />
            </div>
            <div>
              <Label>Placa do Veículo</Label>
              <Input
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value.toUpperCase()})}
                placeholder="ABC-1234"
                maxLength={8}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
              />
              <Label htmlFor="is_active">Motoboy Ativo</Label>
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
    </div>
  );
}
