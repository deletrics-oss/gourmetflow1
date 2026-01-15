import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase-client";
import { toast } from "sonner";
import { Save, Plus, Trash2, GripVertical, DollarSign, Clock, CreditCard } from "lucide-react";

interface BillingConfig {
    id: string;
    trial_days: number;
    stripe_enabled: boolean;
    pix_enabled: boolean;
    pix_key: string | null;
    pix_beneficiary: string | null;
    pix_bank: string | null;
}

interface BillingPlan {
    id: string;
    plan_key: string;
    name: string;
    price: number;
    stripe_price_id: string | null;
    features: string[];
    not_included: string[];
    badge: string | null;
    is_recommended: boolean;
    is_trial: boolean;
    is_active: boolean;
    sort_order: number;
}

export default function Cobranca() {
    const [config, setConfig] = useState<BillingConfig | null>(null);
    const [plans, setPlans] = useState<BillingPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Carregar configuração
            const { data: configData, error: configError } = await supabase
                .from('billing_config')
                .select('*')
                .single();

            if (configError && configError.code !== 'PGRST116') throw configError;

            if (configData) {
                setConfig(configData);
            } else {
                // Criar configuração padrão
                const { data: newConfig, error: createError } = await supabase
                    .from('billing_config')
                    .insert({ trial_days: 30, stripe_enabled: true, pix_enabled: false })
                    .select()
                    .single();
                if (createError) throw createError;
                setConfig(newConfig);
            }

            // Carregar planos
            const { data: plansData, error: plansError } = await supabase
                .from('billing_plans')
                .select('*')
                .order('sort_order');

            if (plansError) throw plansError;
            setPlans(plansData || []);
        } catch (error) {
            console.error('Error loading billing data:', error);
            toast.error('Erro ao carregar configurações de cobrança');
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        if (!config) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('billing_config')
                .update({
                    trial_days: config.trial_days,
                    stripe_enabled: config.stripe_enabled,
                    pix_enabled: config.pix_enabled,
                    pix_key: config.pix_key,
                    pix_beneficiary: config.pix_beneficiary,
                    pix_bank: config.pix_bank,
                })
                .eq('id', config.id);

            if (error) throw error;
            toast.success('Configurações salvas com sucesso!');
        } catch (error) {
            console.error('Error saving config:', error);
            toast.error('Erro ao salvar configurações');
        } finally {
            setSaving(false);
        }
    };

    const savePlan = async (plan: BillingPlan) => {
        try {
            const { error } = await supabase
                .from('billing_plans')
                .update({
                    name: plan.name,
                    price: plan.price,
                    stripe_price_id: plan.stripe_price_id,
                    features: plan.features,
                    not_included: plan.not_included,
                    badge: plan.badge,
                    is_recommended: plan.is_recommended,
                    is_active: plan.is_active,
                    sort_order: plan.sort_order,
                })
                .eq('id', plan.id);

            if (error) throw error;
            toast.success(`Plano "${plan.name}" salvo!`);
        } catch (error) {
            console.error('Error saving plan:', error);
            toast.error('Erro ao salvar plano');
        }
    };

    const addPlan = async () => {
        try {
            const newKey = `plan_${Date.now()}`;
            const { data, error } = await supabase
                .from('billing_plans')
                .insert({
                    plan_key: newKey,
                    name: 'Novo Plano',
                    price: 0,
                    features: [],
                    not_included: [],
                    sort_order: plans.length,
                })
                .select()
                .single();

            if (error) throw error;
            setPlans([...plans, data]);
            toast.success('Novo plano criado!');
        } catch (error) {
            console.error('Error adding plan:', error);
            toast.error('Erro ao criar plano');
        }
    };

    const deletePlan = async (plan: BillingPlan) => {
        if (!confirm(`Tem certeza que deseja excluir o plano "${plan.name}"?`)) return;

        try {
            const { error } = await supabase
                .from('billing_plans')
                .delete()
                .eq('id', plan.id);

            if (error) throw error;
            setPlans(plans.filter(p => p.id !== plan.id));
            toast.success('Plano excluído!');
        } catch (error) {
            console.error('Error deleting plan:', error);
            toast.error('Erro ao excluir plano');
        }
    };

    const updatePlan = (id: string, field: keyof BillingPlan, value: any) => {
        setPlans(plans.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    if (loading) {
        return <div className="p-6 text-center">Carregando...</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Configurações de Cobrança</h1>
                    <p className="text-muted-foreground">Configure planos, preços e período de teste</p>
                </div>
            </div>

            {/* Configuração Geral */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Configuração Geral
                    </CardTitle>
                    <CardDescription>Trial e métodos de pagamento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>Dias de Trial Gratuito</Label>
                            <Input
                                type="number"
                                value={config?.trial_days || 30}
                                onChange={(e) => setConfig(prev => prev ? { ...prev, trial_days: parseInt(e.target.value) || 0 } : null)}
                            />
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={config?.stripe_enabled || false}
                                    onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, stripe_enabled: checked } : null)}
                                />
                                <Label>Stripe Ativo</Label>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={config?.pix_enabled || false}
                                    onCheckedChange={(checked) => setConfig(prev => prev ? { ...prev, pix_enabled: checked } : null)}
                                />
                                <Label>PIX Ativo</Label>
                            </div>
                        </div>
                    </div>

                    {config?.pix_enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                            <div>
                                <Label>Chave PIX</Label>
                                <Input
                                    value={config?.pix_key || ''}
                                    onChange={(e) => setConfig(prev => prev ? { ...prev, pix_key: e.target.value } : null)}
                                    placeholder="CPF, CNPJ, email ou chave aleatória"
                                />
                            </div>
                            <div>
                                <Label>Beneficiário</Label>
                                <Input
                                    value={config?.pix_beneficiary || ''}
                                    onChange={(e) => setConfig(prev => prev ? { ...prev, pix_beneficiary: e.target.value } : null)}
                                    placeholder="Nome do beneficiário"
                                />
                            </div>
                            <div>
                                <Label>Banco</Label>
                                <Input
                                    value={config?.pix_bank || ''}
                                    onChange={(e) => setConfig(prev => prev ? { ...prev, pix_bank: e.target.value } : null)}
                                    placeholder="Nome do banco"
                                />
                            </div>
                        </div>
                    )}

                    <Button onClick={saveConfig} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                </CardContent>
            </Card>

            {/* Planos */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Planos de Assinatura
                            </CardTitle>
                            <CardDescription>Configure os planos disponíveis para seus clientes</CardDescription>
                        </div>
                        <Button onClick={addPlan} variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Plano
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {plans.map((plan) => (
                        <div key={plan.id} className="border rounded-lg p-4 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                                    <Badge variant={plan.is_active ? "default" : "secondary"}>
                                        {plan.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                    {plan.is_trial && <Badge variant="outline">Trial</Badge>}
                                    {plan.badge && <Badge variant="outline">{plan.badge}</Badge>}
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => savePlan(plan)}>
                                        <Save className="w-4 h-4" />
                                    </Button>
                                    {!plan.is_trial && (
                                        <Button size="sm" variant="destructive" onClick={() => deletePlan(plan)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <Label>Nome do Plano</Label>
                                    <Input
                                        value={plan.name}
                                        onChange={(e) => updatePlan(plan.id, 'name', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Preço (R$)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={plan.price}
                                        onChange={(e) => updatePlan(plan.id, 'price', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div>
                                    <Label>Stripe Price ID</Label>
                                    <Input
                                        value={plan.stripe_price_id || ''}
                                        onChange={(e) => updatePlan(plan.id, 'stripe_price_id', e.target.value)}
                                        placeholder="price_XXXXX"
                                    />
                                </div>
                                <div>
                                    <Label>Badge</Label>
                                    <Input
                                        value={plan.badge || ''}
                                        onChange={(e) => updatePlan(plan.id, 'badge', e.target.value)}
                                        placeholder="Ex: Mais Popular"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Funcionalidades (uma por linha)</Label>
                                    <Textarea
                                        rows={4}
                                        value={(plan.features || []).join('\n')}
                                        onChange={(e) => updatePlan(plan.id, 'features', e.target.value.split('\n').filter(f => f.trim()))}
                                        placeholder="PDV completo&#10;Cardápio online&#10;Gestão de clientes"
                                    />
                                </div>
                                <div>
                                    <Label>Não Incluído (uma por linha)</Label>
                                    <Textarea
                                        rows={4}
                                        value={(plan.not_included || []).join('\n')}
                                        onChange={(e) => updatePlan(plan.id, 'not_included', e.target.value.split('\n').filter(f => f.trim()))}
                                        placeholder="WhatsApp Bot&#10;Design com IA"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={plan.is_active}
                                        onCheckedChange={(checked) => updatePlan(plan.id, 'is_active', checked)}
                                    />
                                    <Label>Ativo</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={plan.is_recommended}
                                        onCheckedChange={(checked) => updatePlan(plan.id, 'is_recommended', checked)}
                                    />
                                    <Label>Recomendado</Label>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
