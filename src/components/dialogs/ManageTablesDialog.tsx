import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ManageTablesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ManageTablesDialog({ open, onOpenChange, onSuccess }: ManageTablesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState<Array<{ id: string; number: number; capacity: number; status: string }>>([]);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');

  useEffect(() => {
    if (open) {
      loadTables();
    }
  }, [open]);

  const loadTables = async () => {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('number');

    if (error) {
      console.error('Erro ao carregar mesas:', error);
      return;
    }

    setTables(data || []);
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('tables').insert({
        number: parseInt(newTableNumber),
        capacity: parseInt(newTableCapacity),
        status: 'free',
      });

      if (error) throw error;

      toast.success('Mesa adicionada com sucesso!');
      setNewTableNumber('');
      setNewTableCapacity('4');
      loadTables();
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao adicionar mesa:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma mesa com este número');
      } else {
        toast.error('Erro ao adicionar mesa');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta mesa?')) return;

    try {
      const { error } = await supabase.from('tables').delete().eq('id', id);

      if (error) throw error;

      toast.success('Mesa removida com sucesso!');
      loadTables();
      onSuccess();
    } catch (error) {
      console.error('Erro ao remover mesa:', error);
      toast.error('Erro ao remover mesa');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Mesas</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAddTable} className="space-y-4 mb-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tableNumber">Número da Mesa *</Label>
              <Input
                id="tableNumber"
                type="number"
                min="1"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                placeholder="Ex: 1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableCapacity">Capacidade *</Label>
              <Input
                id="tableCapacity"
                type="number"
                min="1"
                value={newTableCapacity}
                onChange={(e) => setNewTableCapacity(e.target.value)}
                placeholder="Ex: 4"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button type="submit" disabled={loading} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>
        </form>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma mesa cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                tables.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell>Mesa {table.number}</TableCell>
                    <TableCell>{table.capacity} pessoas</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        table.status === 'free' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                        table.status === 'occupied' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        {table.status === 'free' ? 'Livre' : table.status === 'occupied' ? 'Ocupada' : 'Reservada'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTable(table.id)}
                        disabled={table.status !== 'free'}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
