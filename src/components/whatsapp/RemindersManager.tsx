import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Clock, Trash2, Save, Loader2, Bell, Users, Gift, Calendar } from "lucide-react";

interface Reminder {
  id: string;
  name: string;
  message_template: string;
  trigger_type: string;
  trigger_days: number;
  is_active: boolean;
  send_time: string;
  last_run_at: string | null;
  created_at: string;
}

interface Props {
  restaurantId: string;
}

const TRIGGER_TYPES = [
  { value: "inactivity", label: "Clientes Inativos", icon: Users, description: "Enviar para clientes que não compram há X dias" },
  { value: "cashback_available", label: "Cashback Disponível", icon: Gift, description: "Lembrar clientes com cashback para usar" },
  { value: "loyalty_milestone", label: "Marco de Fidelidade", icon: Bell, description: "Parabenizar ao atingir 100, 500 ou 1000 pontos" },
  { value: "weekly_promo", label: "Promoção Semanal", icon: Calendar, description: "Envio semanal de promoções" },
];

const VARIABLES = [
  { var: "{nome}", desc: "Nome do cliente" },
  { var: "{cashback}", desc: "Valor do cashback" },
  { var: "{pontos}", desc: "Pontos de fidelidade" },
  { var: "{restaurante}", desc: "Nome do restaurante" },
];

export function RemindersManager({ restaurantId }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [form, setForm] = useState({
    name: "",
    message_template: "",
    trigger_type: "inactivity",
    trigger_days: 7,
    send_time: "10:00",
  });

  useEffect(() => {
    loadReminders();
  }, [restaurantId]);

  const loadReminders = async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_reminders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error("Erro ao carregar lembretes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.message_template.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      if (editingReminder) {
        const { error } = await supabase
          .from("whatsapp_reminders")
          .update({
            name: form.name,
            message_template: form.message_template,
            trigger_type: form.trigger_type,
            trigger_days: form.trigger_days,
            send_time: form.send_time,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingReminder.id);

        if (error) throw error;
        toast.success("Lembrete atualizado!");
      } else {
        const { error } = await supabase
          .from("whatsapp_reminders")
          .insert({
            restaurant_id: restaurantId,
            name: form.name,
            message_template: form.message_template,
            trigger_type: form.trigger_type,
            trigger_days: form.trigger_days,
            send_time: form.send_time,
          });

        if (error) throw error;
        toast.success("Lembrete criado!");
      }

      setDialogOpen(false);
      setEditingReminder(null);
      setForm({ name: "", message_template: "", trigger_type: "inactivity", trigger_days: 7, send_time: "10:00" });
      loadReminders();
    } catch (error) {
      console.error("Erro ao salvar lembrete:", error);
      toast.error("Erro ao salvar lembrete");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (reminder: Reminder) => {
    try {
      const { error } = await supabase
        .from("whatsapp_reminders")
        .update({ is_active: !reminder.is_active })
        .eq("id", reminder.id);

      if (error) throw error;
      loadReminders();
    } catch (error) {
      console.error("Erro ao alternar lembrete:", error);
      toast.error("Erro ao alternar lembrete");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lembrete?")) return;

    try {
      const { error } = await supabase.from("whatsapp_reminders").delete().eq("id", id);
      if (error) throw error;
      toast.success("Lembrete excluído!");
      loadReminders();
    } catch (error) {
      console.error("Erro ao excluir lembrete:", error);
      toast.error("Erro ao excluir lembrete");
    }
  };

  const openEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setForm({
      name: reminder.name,
      message_template: reminder.message_template,
      trigger_type: reminder.trigger_type,
      trigger_days: reminder.trigger_days,
      send_time: reminder.send_time,
    });
    setDialogOpen(true);
  };

  const getTriggerInfo = (type: string) => TRIGGER_TYPES.find(t => t.value === type);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Lembretes Automáticos
        </h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingReminder(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Lembrete</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingReminder ? "Editar Lembrete" : "Novo Lembrete"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Lembrete de Inatividade" />
              </div>
              <div>
                <Label>Tipo de Gatilho</Label>
                <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <t.icon className="h-4 w-4" />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{getTriggerInfo(form.trigger_type)?.description}</p>
              </div>
              {form.trigger_type === "inactivity" && (
                <div>
                  <Label>Dias de Inatividade</Label>
                  <Input type="number" value={form.trigger_days} onChange={(e) => setForm({ ...form, trigger_days: parseInt(e.target.value) || 7 })} min={1} max={365} />
                </div>
              )}
              <div>
                <Label>Horário de Envio</Label>
                <Input type="time" value={form.send_time} onChange={(e) => setForm({ ...form, send_time: e.target.value })} />
              </div>
              <div>
                <Label>Mensagem</Label>
                <Textarea value={form.message_template} onChange={(e) => setForm({ ...form, message_template: e.target.value })} placeholder="Olá {nome}! Sentimos sua falta..." rows={4} />
                <div className="flex flex-wrap gap-1 mt-2">
                  {VARIABLES.map(v => (
                    <Badge key={v.var} variant="outline" className="cursor-pointer text-xs" onClick={() => setForm({ ...form, message_template: form.message_template + v.var })} title={v.desc}>
                      {v.var}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingReminder ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {reminders.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum lembrete</h3>
          <p className="text-muted-foreground mb-4">Crie lembretes automáticos para manter contato com seus clientes</p>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Criar Primeiro Lembrete</Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reminders.map((reminder) => {
            const triggerInfo = getTriggerInfo(reminder.trigger_type);
            const Icon = triggerInfo?.icon || Bell;
            return (
              <Card key={reminder.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{reminder.name}</h3>
                  </div>
                  <Switch checked={reminder.is_active} onCheckedChange={() => handleToggle(reminder)} />
                </div>
                <Badge variant="outline">{triggerInfo?.label}</Badge>
                <p className="text-sm text-muted-foreground line-clamp-2">{reminder.message_template}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>⏰ {reminder.send_time}</span>
                  {reminder.last_run_at && <span>Último: {new Date(reminder.last_run_at).toLocaleDateString("pt-BR")}</span>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(reminder)}>Editar</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(reminder.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
