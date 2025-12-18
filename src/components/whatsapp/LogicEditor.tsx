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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Plus, Workflow, Trash2, Save, Loader2, Sparkles, Code, Brain, Edit, ShoppingCart, UtensilsCrossed, Coins, Award, XCircle, UserX, UserCheck } from "lucide-react";

interface LogicRule {
  id: string;
  trigger: string;
  triggerType: 'contains' | 'exact' | 'regex' | 'startsWith';
  response: string;
  priority: number;
}

interface LogicConfig {
  id: string;
  name: string;
  description: string | null;
  logic_type: string;
  logic_json: any;
  ai_prompt: string | null;
  is_active: boolean;
  created_at: string;
}

interface Props {
  restaurantId: string;
}

const SPECIAL_ACTIONS = [
  { key: '#CARDAPIO', label: 'Cardápio', icon: UtensilsCrossed, description: 'Mostra o cardápio do restaurante' },
  { key: '#PEDIR', label: 'Fazer Pedido', icon: ShoppingCart, description: 'Inicia fluxo de pedido' },
  { key: '#CASHBACK', label: 'Cashback', icon: Coins, description: 'Mostra saldo de cashback' },
  { key: '#PONTOS', label: 'Pontos', icon: Award, description: 'Mostra pontos de fidelidade' },
  { key: '#CANCELAR', label: 'Cancelar', icon: XCircle, description: 'Cancela pedido em andamento' },
  { key: '#PARAR', label: 'Opt-out', icon: UserX, description: 'Remove do cadastro (LGPD)' },
  { key: '#HUMANO', label: 'Atendente', icon: UserCheck, description: 'Transfere para humano' },
];

export function LogicEditor({ restaurantId }: Props) {
  const [logics, setLogics] = useState<LogicConfig[]>([]);
  const [selectedLogic, setSelectedLogic] = useState<LogicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newLogic, setNewLogic] = useState({
    name: "",
    description: "",
    logic_type: "json",
  });

  useEffect(() => {
    loadLogics();
  }, [restaurantId]);

  const loadLogics = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_logic_configs')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogics(data || []);
    } catch (error) {
      console.error('Erro ao carregar lógicas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLogic = async () => {
    if (!newLogic.name.trim()) {
      toast.error("Digite um nome para a lógica");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.from('whatsapp_logic_configs').insert({
        restaurant_id: restaurantId,
        name: newLogic.name.trim(),
        description: newLogic.description.trim() || null,
        logic_type: newLogic.logic_type,
        logic_json: { rules: [], default_reply: "Olá! Como posso ajudar?" },
        ai_prompt: newLogic.logic_type === 'ai' ? `Você é um assistente virtual de um restaurante. Seja educado e prestativo.

AÇÕES ESPECIAIS DISPONÍVEIS:
- Use #CARDAPIO quando o cliente pedir para ver o cardápio
- Use #PEDIR quando o cliente quiser fazer um pedido
- Use #CASHBACK para mostrar o saldo de cashback
- Use #PONTOS para mostrar pontos de fidelidade
- Use #CANCELAR se o cliente quiser cancelar
- Use #PARAR se o cliente quiser sair da lista
- Use #HUMANO para transferir para atendimento humano

Responda de forma natural e inclua a ação especial quando apropriado.` : null,
      }).select().single();

      if (error) throw error;

      toast.success("Lógica criada!");
      setNewLogic({ name: "", description: "", logic_type: "json" });
      setAddDialogOpen(false);
      loadLogics();
      if (data) setSelectedLogic(data);
    } catch (error) {
      console.error('Erro ao criar lógica:', error);
      toast.error("Erro ao criar lógica");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLogic = async () => {
    if (!selectedLogic) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('whatsapp_logic_configs')
        .update({
          name: selectedLogic.name,
          description: selectedLogic.description,
          logic_type: selectedLogic.logic_type,
          logic_json: selectedLogic.logic_json,
          ai_prompt: selectedLogic.ai_prompt,
          is_active: selectedLogic.is_active,
        })
        .eq('id', selectedLogic.id);

      if (error) throw error;

      toast.success("Lógica salva!");
      loadLogics();
    } catch (error) {
      console.error('Erro ao salvar lógica:', error);
      toast.error("Erro ao salvar lógica");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLogic = async (logicId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta lógica?")) return;

    try {
      const { error } = await supabase.from('whatsapp_logic_configs').delete().eq('id', logicId);
      if (error) throw error;

      toast.success("Lógica excluída!");
      if (selectedLogic?.id === logicId) setSelectedLogic(null);
      loadLogics();
    } catch (error) {
      console.error('Erro ao excluir lógica:', error);
      toast.error("Erro ao excluir lógica");
    }
  };

  const handleAddRule = () => {
    if (!selectedLogic) return;

    const newRule: LogicRule = {
      id: `rule_${Date.now()}`,
      trigger: "",
      triggerType: "contains",
      response: "",
      priority: selectedLogic.logic_json.rules.length + 1,
    };

    setSelectedLogic({
      ...selectedLogic,
      logic_json: {
        ...selectedLogic.logic_json,
        rules: [...selectedLogic.logic_json.rules, newRule],
      },
    });
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<LogicRule>) => {
    if (!selectedLogic) return;

    setSelectedLogic({
      ...selectedLogic,
      logic_json: {
        ...selectedLogic.logic_json,
        rules: selectedLogic.logic_json.rules.map(rule =>
          rule.id === ruleId ? { ...rule, ...updates } : rule
        ),
      },
    });
  };

  const handleDeleteRule = (ruleId: string) => {
    if (!selectedLogic) return;

    setSelectedLogic({
      ...selectedLogic,
      logic_json: {
        ...selectedLogic.logic_json,
        rules: selectedLogic.logic_json.rules.filter(rule => rule.id !== ruleId),
      },
    });
  };

  const handleInsertAction = (actionKey: string, targetField: 'response' | 'ai_prompt' | 'default_reply', ruleId?: string) => {
    if (!selectedLogic) return;

    if (targetField === 'ai_prompt') {
      setSelectedLogic({
        ...selectedLogic,
        ai_prompt: (selectedLogic.ai_prompt || '') + ' ' + actionKey,
      });
    } else if (targetField === 'default_reply') {
      setSelectedLogic({
        ...selectedLogic,
        logic_json: {
          ...selectedLogic.logic_json,
          default_reply: selectedLogic.logic_json.default_reply + ' ' + actionKey,
        },
      });
    } else if (ruleId) {
      handleUpdateRule(ruleId, {
        response: selectedLogic.logic_json.rules.find(r => r.id === ruleId)?.response + ' ' + actionKey,
      });
    }
  };

  const getLogicTypeBadge = (type: string) => {
    switch (type) {
      case 'ai':
        return <Badge className="bg-purple-500"><Brain className="h-3 w-3 mr-1" />IA</Badge>;
      case 'hybrid':
        return <Badge className="bg-blue-500"><Sparkles className="h-3 w-3 mr-1" />Híbrido</Badge>;
      default:
        return <Badge variant="secondary"><Code className="h-3 w-3 mr-1" />JSON</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Logic List */}
      <Card className="md:col-span-1 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Lógicas</h3>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Lógica</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={newLogic.name}
                    onChange={(e) => setNewLogic({ ...newLogic, name: e.target.value })}
                    placeholder="Ex: Atendimento Padrão"
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={newLogic.description}
                    onChange={(e) => setNewLogic({ ...newLogic, description: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={newLogic.logic_type}
                    onValueChange={(value) => setNewLogic({ ...newLogic, logic_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON (Regras)</SelectItem>
                      <SelectItem value="ai">IA (Lovable AI)</SelectItem>
                      <SelectItem value="hybrid">Híbrido (Regras + IA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddLogic} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Criar Lógica
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {logics.length === 0 ? (
          <div className="text-center py-8">
            <Workflow className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma lógica criada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logics.map((logic) => (
              <button
                key={logic.id}
                onClick={() => setSelectedLogic(logic)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedLogic?.id === logic.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium truncate">{logic.name}</p>
                  {getLogicTypeBadge(logic.logic_type)}
                </div>
                <p className={`text-xs truncate ${
                  selectedLogic?.id === logic.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {logic.description || `${logic.logic_json.rules.length} regras`}
                </p>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Logic Editor */}
      <Card className="md:col-span-2 p-4">
        {selectedLogic ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">{selectedLogic.name}</h3>
                {getLogicTypeBadge(selectedLogic.logic_type)}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ativa</span>
                  <Switch
                    checked={selectedLogic.is_active}
                    onCheckedChange={(checked) => setSelectedLogic({ ...selectedLogic, is_active: checked })}
                  />
                </div>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteLogic(selectedLogic.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button onClick={handleSaveLogic} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar
                </Button>
              </div>
            </div>

            {/* Special Actions Chips */}
            <Card className="p-3 bg-muted/50">
              <p className="text-xs font-medium mb-2">Ações Especiais (clique para inserir):</p>
              <div className="flex flex-wrap gap-2">
                {SPECIAL_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Badge
                      key={action.key}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        if (selectedLogic.logic_type !== 'json') {
                          handleInsertAction(action.key, 'ai_prompt');
                        } else {
                          handleInsertAction(action.key, 'default_reply');
                        }
                        toast.success(`${action.key} inserido`);
                      }}
                      title={action.description}
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {action.label}
                    </Badge>
                  );
                })}
              </div>
            </Card>

            <Tabs defaultValue={selectedLogic.logic_type === 'ai' ? 'ai' : 'rules'}>
              <TabsList>
                {selectedLogic.logic_type !== 'ai' && (
                  <TabsTrigger value="rules">Regras</TabsTrigger>
                )}
                {selectedLogic.logic_type !== 'json' && (
                  <TabsTrigger value="ai">Prompt IA</TabsTrigger>
                )}
                <TabsTrigger value="default">Resposta Padrão</TabsTrigger>
              </TabsList>

              {selectedLogic.logic_type !== 'ai' && (
                <TabsContent value="rules" className="space-y-4">
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleAddRule}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Regra
                    </Button>
                  </div>

                  {selectedLogic.logic_json.rules.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg border-dashed">
                      <p className="text-muted-foreground">Nenhuma regra ainda</p>
                      <Button variant="link" onClick={handleAddRule}>
                        Adicionar primeira regra
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedLogic.logic_json.rules.map((rule, index) => (
                        <Card key={rule.id} className="p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">Regra {index + 1}</Badge>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Tipo de Gatilho</Label>
                              <Select
                                value={rule.triggerType}
                                onValueChange={(value) => handleUpdateRule(rule.id, { triggerType: value as LogicRule['triggerType'] })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="contains">Contém</SelectItem>
                                  <SelectItem value="exact">Exato</SelectItem>
                                  <SelectItem value="startsWith">Começa com</SelectItem>
                                  <SelectItem value="regex">Regex</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Gatilho</Label>
                              <Input
                                value={rule.trigger}
                                onChange={(e) => handleUpdateRule(rule.id, { trigger: e.target.value })}
                                placeholder="Ex: cardápio, preço"
                                className="h-8"
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-xs">Resposta</Label>
                              <div className="flex gap-1">
                                {SPECIAL_ACTIONS.slice(0, 3).map((action) => {
                                  const Icon = action.icon;
                                  return (
                                    <Button
                                      key={action.key}
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2"
                                      onClick={() => handleInsertAction(action.key, 'response', rule.id)}
                                      title={action.description}
                                    >
                                      <Icon className="h-3 w-3" />
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                            <Textarea
                              value={rule.response}
                              onChange={(e) => handleUpdateRule(rule.id, { response: e.target.value })}
                              placeholder="Digite a resposta..."
                              rows={2}
                            />
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )}

              {selectedLogic.logic_type !== 'json' && (
                <TabsContent value="ai" className="space-y-4">
                  <div>
                    <Label>Prompt do Sistema</Label>
                    <Textarea
                      value={selectedLogic.ai_prompt || ""}
                      onChange={(e) => setSelectedLogic({ ...selectedLogic, ai_prompt: e.target.value })}
                      placeholder="Instruções para a IA..."
                      rows={10}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Este prompt define o comportamento da IA. Use as ações especiais acima para adicionar funcionalidades.
                    </p>
                  </div>
                </TabsContent>
              )}

              <TabsContent value="default" className="space-y-4">
                <div>
                  <Label>Resposta Padrão</Label>
                  <Textarea
                    value={selectedLogic.logic_json.default_reply}
                    onChange={(e) => setSelectedLogic({
                      ...selectedLogic,
                      logic_json: { ...selectedLogic.logic_json, default_reply: e.target.value }
                    })}
                    placeholder="Resposta quando nenhuma regra corresponder..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Esta mensagem será enviada quando nenhuma regra corresponder à mensagem recebida.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Selecione ou crie uma lógica para editar</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
