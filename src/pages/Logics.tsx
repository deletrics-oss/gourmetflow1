import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2, Edit, Sparkles, FileJson, Zap, Upload, Calendar, Brain, Copy, CheckSquare, Square } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

export default function LogicsPage() {
    const [searchParams] = useSearchParams();
    const typeFilter = searchParams.get('type');

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newLogicName, setNewLogicName] = useState("");
    const [newLogicDescription, setNewLogicDescription] = useState("");
    const [newLogicType, setNewLogicType] = useState<'json' | 'ai' | 'hybrid' | 'ai_scheduling'>('json');
    const [aiPrompt, setAiPrompt] = useState("");
    const [uploadedJson, setUploadedJson] = useState<any>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const { toast } = useToast();

    const { data: logics, isLoading } = useQuery<any[]>({
        queryKey: ['/api/logics'],
        queryFn: () => apiRequest('GET', '/api/logics'),
    });

    const createLogicMutation = useMutation({
        mutationFn: async (data: { name: string; description: string; logicJson: any; logicType: 'json' | 'ai' | 'hybrid' | 'ai_scheduling'; aiPrompt?: string }) => {
            return await apiRequest("POST", "/api/logics", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/logics'] });
            setIsCreateDialogOpen(false);
            resetForm();
            toast({ title: "Lógica criada!", description: "Nova lógica adicionada com sucesso" });
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao criar lógica",
                description: error?.message || "Tente novamente",
                variant: "destructive"
            });
        },
    });

    const deleteLogicMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiRequest("DELETE", `/api/logics/${id}`, {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/logics'] });
            setSelectedIds(prev => prev.filter(selectedId => !logics?.find(l => l.id === selectedId)));
            toast({ title: "Lógica deletada!" });
        },
        onError: () => {
            toast({ title: "Erro ao deletar", variant: "destructive" });
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            for (const id of ids) {
                await apiRequest("DELETE", `/api/logics/${id}`, {});
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/logics'] });
            setSelectedIds([]);
            toast({ title: "Lógicas deletadas!", description: "Os itens selecionados foram removidos." });
        },
        onError: () => {
            toast({ title: "Erro ao deletar em massa", variant: "destructive" });
        },
    });

    const cloneLogicMutation = useMutation({
        mutationFn: async (logic: any) => {
            const cloneData = {
                name: `${logic.name} - Cópia`,
                description: logic.description,
                logicType: logic.logicType,
                logicJson: logic.logicJson,
                aiPrompt: logic.aiPrompt
            };
            return await apiRequest("POST", "/api/logics", cloneData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/logics'] });
            toast({ title: "Lógica clonada!", description: "Uma cópia foi criada com sucesso." });
        },
        onError: () => {
            toast({ title: "Erro ao clonar lógica", variant: "destructive" });
        }
    });

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredLogics?.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredLogics?.map(l => l.id) || []);
        }
    };

    const resetForm = () => {
        setNewLogicName("");
        setNewLogicDescription("");
        setNewLogicType('json');
        setAiPrompt("");
        setUploadedJson(null);
    };

    const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const json = JSON.parse(text);

            if (!json.rules || !Array.isArray(json.rules)) {
                toast({ title: "JSON inválido", description: "O arquivo deve conter um array 'rules'", variant: "destructive" });
                return;
            }

            setUploadedJson(json);
            setNewLogicName(json.name || file.name.replace('.json', ''));
            setNewLogicDescription(json.description || '');
            setNewLogicType('json');

            toast({ title: "JSON carregado!", description: `${json.rules.length} regras encontradas` });
        } catch (error) {
            toast({ title: "Erro ao ler arquivo", description: "Arquivo JSON inválido", variant: "destructive" });
        }
    };

    const handleGenerateStandard = async () => {
        if (!confirm("Isso irá gerar lógicas padrão (Aprendizado) baseadas nas melhores práticas do sistema. Deseja continuar?")) return;

        try {
            // 1. Lógica de Agendamento Otimizada (IA)
            await createLogicMutation.mutateAsync({
                name: "Aprendizado: Agendamento Otimizado",
                description: "Fluxo padrão com tratamento de recusas, verificação de horário e tom humanizado.",
                logicType: "ai_scheduling",
                logicJson: {},
                aiPrompt: `VOCÊ É O ASSISTENTE DA EMPRESA.
SUA MISSÃO É AGENDAR CLIENTES E RESPONDER DÚVIDAS.

DIRETRIZES DE APRENDIZADO (PADRÃO):
1.  **Humanização**: Use emojis, seja cordial, mas objetivo.
2.  **Negociação**: Se o cliente recusar um horário, pergunte "Qual seria o melhor horário pra você?" em vez de insistir.
3.  **Recusas**: Se o cliente disser "não quero", "hoje não", "obrigado", NUNCA insista. Responda: "Entendo, combinado! Fico à disposição quando precisar. Dê uma olhada no nosso site: {website}".
4.  **Informações**: Sempre consulte os dados da empresa (Endereço, Site) antes de responder "não sei".
5.  **Cancelamento**: Se o cliente quiser cancelar, aceite e confirme: "Entendido, agendamento cancelado. Quer reagendar?".

(Este prompt incorpora as melhorias aprendidas nos testes)`
            });

            // 2. Filtro de Spam/Golpes (JSON)
            await createLogicMutation.mutateAsync({
                name: "Aprendizado: Filtro de Segurança",
                description: "Bloqueia automaticamente palavras-chave suspeitas e spam.",
                logicType: "json",
                logicJson: {
                    name: "Filtro de Segurança",
                    rules: [
                        {
                            keywords: ["ganhar dinheiro", "investimento", "bitcoin", "urubu do pix", "renda extra"],
                            response: "[AUTO] Mensagem bloqueada por segurança.",
                            action: "block"
                        },
                        {
                            keywords: ["clique no link", "prêmio", "sorteio"],
                            response: "Por favor, não envie links não solicitados.",
                            action: "warn"
                        }
                    ]
                }
            });

            toast({ title: "Aprendizado Aplicado! 🧠", description: "Lógicas padrão geradas com sucesso." });
        } catch (error) {
            console.error(error);
            toast({ title: "Erro ao aplicar aprendizado", variant: "destructive" });
        }
    };

    const filteredLogics = logics?.filter(logic => {
        if (!typeFilter) return true;
        // Include ai_scheduling in 'ai' filter
        if (typeFilter === 'ai' && logic.logicType === 'ai_scheduling') return true;
        return logic.logicType === typeFilter;
    });

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'ai': return <Sparkles className="w-4 h-4" />;
            case 'hybrid': return <Zap className="w-4 h-4" />;
            case 'ai_scheduling': return <Calendar className="w-4 h-4" />;
            default: return <FileJson className="w-4 h-4" />;
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'ai': return <Badge variant="secondary">🤖 IA</Badge>;
            case 'hybrid': return <Badge variant="default">⚡ Híbrido</Badge>;
            case 'ai_scheduling': return <Badge className="bg-blue-500 text-white">📅 Agendamento IA</Badge>;
            default: return <Badge variant="outline">📋 JSON</Badge>;
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold">
                        {typeFilter === 'json' ? 'Lógicas JSON' : typeFilter === 'ai' ? 'Lógicas IA' : 'Lógicas'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {typeFilter === 'json'
                            ? 'Lógicas baseadas em regras e palavras-chave'
                            : typeFilter === 'ai'
                                ? 'Lógicas com inteligência artificial'
                                : 'Gerencie todas as lógicas do bot'}
                    </p>
                </div>

                <div className="flex gap-2">
                    <Button onClick={handleGenerateStandard} className="bg-purple-600 hover:bg-purple-700 text-white border-none">
                        <Brain className="w-4 h-4 mr-2" />
                        Aprendizado (Padrão)
                    </Button>

                    {selectedIds.length > 0 && (
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (confirm(`Deseja deletar ${selectedIds.length} lógicas selecionadas?`)) {
                                    bulkDeleteMutation.mutate(selectedIds);
                                }
                            }}
                            disabled={bulkDeleteMutation.isPending}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir ({selectedIds.length})
                        </Button>
                    )}

                    <Button variant="outline" onClick={toggleSelectAll}>
                        {selectedIds.length === filteredLogics?.length && filteredLogics?.length > 0 ? (
                            <CheckSquare className="w-4 h-4 mr-2 text-primary" />
                        ) : (
                            <Square className="w-4 h-4 mr-2" />
                        )}
                        {selectedIds.length === filteredLogics?.length && filteredLogics?.length > 0 ? "Desmarcar Tudo" : "Selecionar Tudo"}
                    </Button>

                    <label htmlFor="json-file-upload">
                        <input
                            id="json-file-upload"
                            type="file"
                            accept=".json"
                            onChange={handleJsonUpload}
                            className="hidden"
                        />
                        <Button variant="outline" asChild>
                            <span>
                                <Upload className="w-4 h-4 mr-2" />
                                Upload JSON
                            </span>
                        </Button>
                    </label>

                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Nova Lógica
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Criar Nova Lógica</DialogTitle>
                                <DialogDescription>
                                    Configure uma nova lógica para o bot
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="logic-name">Nome</Label>
                                    <Input
                                        id="logic-name"
                                        placeholder="Ex: Atendimento Inicial"
                                        value={newLogicName}
                                        onChange={(e) => setNewLogicName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="logic-description">Descrição</Label>
                                    <Textarea
                                        id="logic-description"
                                        placeholder="Descreva o comportamento desta lógica"
                                        value={newLogicDescription}
                                        onChange={(e) => setNewLogicDescription(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Tipo de Lógica</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        <Button
                                            variant={newLogicType === 'json' ? 'default' : 'outline'}
                                            onClick={() => setNewLogicType('json')}
                                            className="flex flex-col h-auto py-3"
                                        >
                                            <FileJson className="w-5 h-5 mb-1" />
                                            <span className="text-xs">JSON</span>
                                        </Button>
                                        <Button
                                            variant={newLogicType === 'ai' ? 'default' : 'outline'}
                                            onClick={() => setNewLogicType('ai')}
                                            className="flex flex-col h-auto py-3"
                                        >
                                            <Sparkles className="w-5 h-5 mb-1" />
                                            <span className="text-xs">IA</span>
                                        </Button>
                                        <Button
                                            variant={newLogicType === 'hybrid' ? 'default' : 'outline'}
                                            onClick={() => setNewLogicType('hybrid')}
                                            className="flex flex-col h-auto py-3"
                                        >
                                            <Zap className="w-5 h-5 mb-1" />
                                            <span className="text-xs">Híbrido</span>
                                        </Button>
                                        <Button
                                            variant={newLogicType === 'ai_scheduling' ? 'default' : 'outline'}
                                            onClick={() => setNewLogicType('ai_scheduling')}
                                            className="flex flex-col h-auto py-3"
                                        >
                                            <Calendar className="w-5 h-5 mb-1" />
                                            <span className="text-xs">Agendamento</span>
                                        </Button>
                                    </div>
                                </div>

                                {newLogicType === 'ai_scheduling' && (
                                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                        <p className="text-sm text-blue-600 dark:text-blue-400">
                                            <strong>📅 Agendamento com IA</strong><br />
                                            Esta lógica permite que clientes agendem serviços através de conversas naturais no WhatsApp.
                                            A IA entenderá pedidos como "quero agendar um corte amanhã às 15h" e criará o agendamento automaticamente.
                                        </p>
                                    </div>
                                )}

                                {(newLogicType === 'ai' || newLogicType === 'hybrid' || newLogicType === 'ai_scheduling') && (
                                    <div className="space-y-2">
                                        <Label htmlFor="ai-prompt">Prompt da IA</Label>
                                        <Textarea
                                            id="ai-prompt"
                                            placeholder="Defina a personalidade e instruções da IA..."
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            rows={4}
                                        />
                                    </div>
                                )}
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={() => createLogicMutation.mutate({
                                        name: newLogicName,
                                        description: newLogicDescription,
                                        logicJson: uploadedJson || {},
                                        logicType: newLogicType,
                                        aiPrompt: (newLogicType === 'ai' || newLogicType === 'hybrid' || newLogicType === 'ai_scheduling') ? aiPrompt : undefined,
                                    })}
                                    disabled={!newLogicName || createLogicMutation.isPending}
                                >
                                    {createLogicMutation.isPending ? "Criando..." : "Criar"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-full mt-2" />
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            ) : filteredLogics && filteredLogics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLogics.map((logic) => (
                        <Card key={logic.id} className="hover-elevate">
                            <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={cn(
                                                "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors",
                                                selectedIds.includes(logic.id) ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelection(logic.id);
                                            }}
                                        >
                                            {selectedIds.includes(logic.id) && <CheckSquare className="w-3 h-3 text-white" />}
                                        </div>
                                        {getTypeIcon(logic.logicType)}
                                        <CardTitle className="text-lg">{logic.name}</CardTitle>
                                    </div>
                                    {getTypeBadge(logic.logicType)}
                                </div>
                                <CardDescription className="mt-2">
                                    {logic.description || "Sem descrição"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => window.location.href = `/logicas/${logic.id}`}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Editar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="px-2"
                                        title="Clonar"
                                        onClick={() => cloneLogicMutation.mutate(logic)}
                                        disabled={cloneLogicMutation.isPending}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="px-2"
                                        onClick={() => {
                                            if (confirm('Tem certeza que deseja deletar esta lógica?')) {
                                                deleteLogicMutation.mutate(logic.id);
                                            }
                                        }}
                                        disabled={deleteLogicMutation.isPending}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        {typeFilter === 'json' ? (
                            <FileJson className="w-16 h-16 text-muted-foreground mb-4" />
                        ) : typeFilter === 'ai' ? (
                            <Sparkles className="w-16 h-16 text-muted-foreground mb-4" />
                        ) : (
                            <Zap className="w-16 h-16 text-muted-foreground mb-4" />
                        )}
                        <h3 className="text-lg font-semibold mb-2">Nenhuma lógica criada</h3>
                        <p className="text-sm text-muted-foreground text-center mb-6">
                            Crie sua primeira lógica {typeFilter ? `do tipo ${typeFilter.toUpperCase()}` : ''} para começar
                        </p>
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Lógica
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
