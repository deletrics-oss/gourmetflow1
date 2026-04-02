import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Upload, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRestaurant } from "@/hooks/useRestaurant";

export default function LogicEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { restaurantId } = useRestaurant();

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [logicType, setLogicType] = useState<'json' | 'ai' | 'hybrid' | 'ai_scheduling'>('json');
    const [logicJsonStr, setLogicJsonStr] = useState("{}");
    const [aiPrompt, setAiPrompt] = useState("");
    const [knowledgeBase, setKnowledgeBase] = useState("");
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [isSystemIntegrated, setIsSystemIntegrated] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch existing logic
    const { data: logic, isLoading } = useQuery({
        queryKey: [`/api/logics/${id}`, restaurantId],
        queryFn: () => apiRequest("GET", `/api/logics/${id}`, undefined, { headers: { 'x-restaurant-id': restaurantId || '' } }),
        enabled: !!id && !!restaurantId,
    });

    useEffect(() => {
        if (logic) {
            setName(logic.name);
            setDescription(logic.description || "");
            setLogicType(logic.logicType);
            setAiPrompt(logic.aiPrompt || "");
            setKnowledgeBase(logic.knowledgeBase || "");

            try {
                const parsed = typeof logic.logicJson === 'string'
                    ? JSON.parse(logic.logicJson)
                    : logic.logicJson;
                setLogicJsonStr(JSON.stringify(parsed, null, 2));
            } catch (e) {
                setLogicJsonStr("{}");
            }
            setIsSystemIntegrated(logic.isSystemIntegrated !== 0);
        }
    }, [logic]);

    // Update Mutation
    const updateLogicMutation = useMutation({
        mutationFn: async (data: any) => {
            return await apiRequest("PATCH", `/api/logics/${id}`, { ...data, restaurantId }, { headers: { 'x-restaurant-id': restaurantId || '' } });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/logics'] });
            queryClient.invalidateQueries({ queryKey: [`/api/logics/${id}`] });
            toast({ title: "Lógica salva", description: "As alterações foram salvas com sucesso." });
        },
        onError: (error: any) => {
            toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        },
    });

    // AI Generate Logic
    const generateWithAI = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/logics/generate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-restaurant-id': restaurantId || ''
                },
                body: JSON.stringify({ description, logicType, restaurantId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Falha ao gerar');
            }

            const data = await response.json();

            if (logicType === 'ai' || logicType === 'hybrid') {
                if (data.aiPrompt) {
                    setAiPrompt(data.aiPrompt);
                    toast({ title: "✨ Prompt gerado com IA!", description: "Revise e ajuste conforme necessário" });
                }
            }

            if (logicType === 'json' || logicType === 'hybrid') {
                if (data.logicJson) {
                    setLogicJsonStr(JSON.stringify(data.logicJson, null, 2));
                    if (data.logicJson.name) setName(data.logicJson.name);
                    if (data.logicJson.description) setDescription(data.logicJson.description);
                    toast({ title: "✨ JSON gerado com IA!", description: "Revise as regras e salve" });
                }
            }

        } catch (error: any) {
            toast({ title: "Erro ao gerar", description: error.message, variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = () => {
        let parsedJson = {};
        if (logicType === 'json' || logicType === 'hybrid') {
            try {
                parsedJson = JSON.parse(logicJsonStr);
                setJsonError(null);
            } catch (e: any) {
                setJsonError("Erro de sintaxe JSON: " + e.message);
                return;
            }
        }

        updateLogicMutation.mutate({
            name,
            description,
            logicType,
            logicJson: parsedJson,
            aiPrompt,
            knowledgeBase,
            isSystemIntegrated: isSystemIntegrated ? 1 : 0,
        });
    };

    const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const json = JSON.parse(text);
            setLogicJsonStr(JSON.stringify(json, null, 2));
            setJsonError(null);
            toast({ title: "JSON carregado!" });
        } catch (error) {
            toast({ title: "Arquivo inválido", variant: "destructive" });
        }
    };

    if (isLoading) return <div className="p-8">Carregando...</div>;

    return (
        <div className="p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-3xl font-bold">Editar Lógica</h1>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/logicas')}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={updateLogicMutation.isPending}>
                        <Save className="w-4 h-4 mr-2" />
                        {updateLogicMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configurações Gerais */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Configurações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Descrição</Label>
                            </div>
                            <Textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Descreva o que esta lógica deve fazer..."
                            />
                            <p className="text-xs text-muted-foreground">
                                💡 A IA usará esta descrição para gerar a lógica
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={logicType} onValueChange={(v: any) => setLogicType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="json">JSON (Regras)</SelectItem>
                                    <SelectItem value="ai">IA (Gemini)</SelectItem>
                                    <SelectItem value="hybrid">Híbrido</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* AI Generate Button */}
                        <Button
                            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                            onClick={generateWithAI}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...</>
                            ) : (
                                <><Sparkles className="w-4 h-4 mr-2" /> Gerar com IA</>
                            )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                            Gera lógica baseada nos serviços, profissionais e dados do negócio
                        </p>

                        {/* System Integration Toggle */}
                        <div className="flex items-center space-x-2 pt-4 border-t">
                            <input
                                type="checkbox"
                                id="systemIntegrated"
                                checked={isSystemIntegrated}
                                onChange={e => setIsSystemIntegrated(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <Label htmlFor="systemIntegrated" className="text-sm">
                                🔗 Integrada com Sistema
                            </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Quando ativado: agendamento automático, lembretes, notificações ao dono.
                        </p>
                    </CardContent>
                </Card>

                {/* Editor Principal */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>
                            {logicType === 'ai' ? 'Prompt da IA' : 'Regras JSON'}
                        </CardTitle>
                        <div className="flex gap-2">
                            {(logicType === 'json' || logicType === 'hybrid') && (
                                <label className="cursor-pointer">
                                    <input type="file" accept=".json" className="hidden" onChange={handleJsonUpload} />
                                    <Button variant="outline" size="sm" asChild>
                                        <span><Upload className="w-4 h-4 mr-2" /> Importar JSON</span>
                                    </Button>
                                </label>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(logicType === 'ai' || logicType === 'hybrid' || logicType === 'ai_scheduling') && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Prompt do Sistema</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={generateWithAI}
                                        disabled={isGenerating}
                                    >
                                        <Sparkles className="w-4 h-4 mr-1" /> Gerar Prompt
                                    </Button>
                                </div>
                                <Textarea
                                    value={aiPrompt}
                                    onChange={e => setAiPrompt(e.target.value)}
                                    className="min-h-[200px] font-mono"
                                    placeholder="Você é um assistente..."
                                />
                                <p className="text-sm text-muted-foreground">Instruções para o comportamento da IA.</p>
                            </div>
                        )}

                        {(logicType === 'ai' || logicType === 'hybrid') && (
                            <div className="space-y-2">
                                <Label>Base de Conhecimento (Contexto extra)</Label>
                                <Textarea
                                    value={knowledgeBase}
                                    onChange={e => setKnowledgeBase(e.target.value)}
                                    className="min-h-[150px]"
                                    placeholder="Adicione informações que não estão no cardápio..."
                                />
                                <p className="text-sm text-muted-foreground">Isso ajuda a IA a responder perguntas específicas sobre o negócio.</p>
                            </div>
                        )}

                        {(logicType === 'json' || logicType === 'hybrid') && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Configuração JSON {logicType === 'hybrid' && '(Fallback/Prioridade)'}</Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={generateWithAI}
                                        disabled={isGenerating}
                                    >
                                        <Sparkles className="w-4 h-4 mr-1" /> Gerar JSON
                                    </Button>
                                </div>
                                <Textarea
                                    value={logicJsonStr}
                                    onChange={(e) => setLogicJsonStr(e.target.value)}
                                    className="min-h-[400px] font-mono text-sm"
                                    placeholder='{"rules": []}'
                                />
                                {jsonError && (
                                    <p className="text-sm text-destructive font-bold">{jsonError}</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
