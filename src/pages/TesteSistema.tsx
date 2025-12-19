import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ExternalLink, 
  Database,
  ChefHat,
  Truck,
  Smartphone,
  Monitor,
  CreditCard,
  Play,
  RotateCcw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestItem {
  id: string;
  label: string;
  description?: string;
  link?: string;
}

interface TestGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  prerequisites: string[];
  steps: TestItem[];
}

const testFlows: TestGroup[] = [
  {
    id: "balcao",
    title: "Fluxo 1: Balcão → Cozinha → Entrega",
    icon: <Truck className="h-5 w-5" />,
    prerequisites: [
      "Pelo menos 3 itens de menu cadastrados",
      "Pelo menos 1 motoboy cadastrado",
      "PagSeguro configurado (sandbox)"
    ],
    steps: [
      { id: "b1", label: "Acessar /balcao", link: "/balcao" },
      { id: "b2", label: "Selecionar 'Entrega' como tipo" },
      { id: "b3", label: "Adicionar 2+ itens ao pedido" },
      { id: "b4", label: "Preencher dados do cliente (nome, telefone, endereço)" },
      { id: "b5", label: "Confirmar pedido" },
      { id: "b6", label: "Verificar pedido aparece em /cozinha", link: "/cozinha" },
      { id: "b7", label: "Marcar pedido como 'Preparando'" },
      { id: "b8", label: "Marcar pedido como 'Pronto'" },
      { id: "b9", label: "Ir para /pdv e localizar pedido", link: "/pdv" },
      { id: "b10", label: "Processar pagamento (PIX ou Cartão)" },
      { id: "b11", label: "Verificar pedido finalizado com sucesso" }
    ]
  },
  {
    id: "tablet",
    title: "Fluxo 2: Tablet → Cozinha → Monitor Senhas",
    icon: <Smartphone className="h-5 w-5" />,
    prerequisites: [
      "Pelo menos 1 mesa cadastrada em /salao",
      "QR Code da mesa gerado",
      "Itens de menu disponíveis"
    ],
    steps: [
      { id: "t1", label: "Acessar /salao e gerar QR de uma mesa", link: "/salao" },
      { id: "t2", label: "Abrir /menu-tablet em nova aba", link: "/menu-tablet" },
      { id: "t3", label: "Navegar pelas categorias" },
      { id: "t4", label: "Adicionar itens ao carrinho" },
      { id: "t5", label: "Finalizar pedido no tablet" },
      { id: "t6", label: "Verificar pedido em /cozinha", link: "/cozinha" },
      { id: "t7", label: "Marcar como 'Preparando'" },
      { id: "t8", label: "Marcar como 'Pronto'" },
      { id: "t9", label: "Verificar senha em /monitor-senhas", link: "/monitor-senhas" },
      { id: "t10", label: "Fechar mesa em /pdv", link: "/pdv" }
    ]
  },
  {
    id: "totem",
    title: "Fluxo 3: Totem → PIX → Cozinha",
    icon: <Monitor className="h-5 w-5" />,
    prerequisites: [
      "PagSeguro sandbox configurado",
      "Itens de menu com preços",
      "Categorias ativas"
    ],
    steps: [
      { id: "p1", label: "Acessar /totem", link: "/totem" },
      { id: "p2", label: "Tocar para iniciar" },
      { id: "p3", label: "Informar nome do cliente" },
      { id: "p4", label: "Navegar pelas categorias" },
      { id: "p5", label: "Adicionar itens ao pedido" },
      { id: "p6", label: "Ir para pagamento" },
      { id: "p7", label: "Selecionar PIX" },
      { id: "p8", label: "Verificar QR Code PIX gerado" },
      { id: "p9", label: "Simular pagamento (sandbox) ou cancelar" },
      { id: "p10", label: "Verificar pedido em /cozinha", link: "/cozinha" },
      { id: "p11", label: "Verificar senha em /monitor-senhas", link: "/monitor-senhas" }
    ]
  }
];

const TesteSistema = () => {
  const [completedTests, setCompletedTests] = useState<Record<string, boolean>>({});
  const [dbStats, setDbStats] = useState<{
    orders: number;
    orderItems: number;
    customers: number;
    menuItems: number;
    tables: number;
    motoboys: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDbStats();
    loadSavedProgress();
  }, []);

  const loadSavedProgress = () => {
    const saved = localStorage.getItem("test-progress");
    if (saved) {
      setCompletedTests(JSON.parse(saved));
    }
  };

  const saveProgress = (tests: Record<string, boolean>) => {
    localStorage.setItem("test-progress", JSON.stringify(tests));
  };

  const loadDbStats = async () => {
    setLoading(true);
    try {
      const [orders, orderItems, customers, menuItems, tables, motoboys] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("order_items").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("menu_items").select("id", { count: "exact", head: true }),
        supabase.from("tables").select("id", { count: "exact", head: true }),
        supabase.from("motoboys").select("id", { count: "exact", head: true })
      ]);

      setDbStats({
        orders: orders.count || 0,
        orderItems: orderItems.count || 0,
        customers: customers.count || 0,
        menuItems: menuItems.count || 0,
        tables: tables.count || 0,
        motoboys: motoboys.count || 0
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
    setLoading(false);
  };

  const toggleTest = (testId: string) => {
    const newTests = { ...completedTests, [testId]: !completedTests[testId] };
    setCompletedTests(newTests);
    saveProgress(newTests);
  };

  const resetProgress = () => {
    setCompletedTests({});
    localStorage.removeItem("test-progress");
    toast.success("Progresso resetado!");
  };

  const getFlowProgress = (flow: TestGroup) => {
    const completed = flow.steps.filter(s => completedTests[s.id]).length;
    return { completed, total: flow.steps.length };
  };

  const getTotalProgress = () => {
    const allSteps = testFlows.flatMap(f => f.steps);
    const completed = allSteps.filter(s => completedTests[s.id]).length;
    return { completed, total: allSteps.length };
  };

  const totalProgress = getTotalProgress();
  const progressPercent = Math.round((totalProgress.completed / totalProgress.total) * 100);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">🧪 Teste do Sistema</h1>
          <p className="text-muted-foreground">
            Valide os 3 fluxos principais antes do lançamento
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={progressPercent === 100 ? "default" : "secondary"} className="text-lg px-4 py-2">
            {progressPercent}% Completo ({totalProgress.completed}/{totalProgress.total})
          </Badge>
          <Button variant="outline" size="sm" onClick={resetProgress}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar
          </Button>
        </div>
      </div>

      {/* Database Stats */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Status do Banco de Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : dbStats ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{dbStats.menuItems}</p>
                <p className="text-sm text-muted-foreground">Itens Menu</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{dbStats.tables}</p>
                <p className="text-sm text-muted-foreground">Mesas</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{dbStats.motoboys}</p>
                <p className="text-sm text-muted-foreground">Motoboys</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{dbStats.orders}</p>
                <p className="text-sm text-muted-foreground">Pedidos</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{dbStats.orderItems}</p>
                <p className="text-sm text-muted-foreground">Itens Pedido</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{dbStats.customers}</p>
                <p className="text-sm text-muted-foreground">Clientes</p>
              </div>
            </div>
          ) : (
            <p className="text-destructive">Erro ao carregar dados</p>
          )}
          <Button variant="ghost" size="sm" className="mt-3" onClick={loadDbStats}>
            Atualizar Contagem
          </Button>
        </CardContent>
      </Card>

      {/* Prerequisite Checks */}
      {dbStats && (dbStats.menuItems < 3 || dbStats.tables === 0) && (
        <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <AlertDescription>
            <strong>⚠️ Pré-requisitos faltando:</strong>
            <ul className="list-disc list-inside mt-2">
              {dbStats.menuItems < 3 && (
                <li>
                  Cadastre pelo menos 3 itens no menu - 
                  <a href="/cardapio" className="text-primary underline ml-1">Ir para Cardápio</a>
                </li>
              )}
              {dbStats.tables === 0 && (
                <li>
                  Cadastre pelo menos 1 mesa - 
                  <a href="/salao" className="text-primary underline ml-1">Ir para Salão</a>
                </li>
              )}
              {dbStats.motoboys === 0 && (
                <li>
                  Cadastre pelo menos 1 motoboy - 
                  <a href="/motoboys" className="text-primary underline ml-1">Ir para Motoboys</a>
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Test Flows */}
      <Tabs defaultValue="balcao" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          {testFlows.map(flow => {
            const progress = getFlowProgress(flow);
            return (
              <TabsTrigger key={flow.id} value={flow.id} className="flex items-center gap-2">
                {progress.completed === progress.total ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : progress.completed > 0 ? (
                  <Clock className="h-4 w-4 text-yellow-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="hidden md:inline">Fluxo {flow.id === "balcao" ? "1" : flow.id === "tablet" ? "2" : "3"}</span>
                <span className="text-xs">({progress.completed}/{progress.total})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {testFlows.map(flow => (
          <TabsContent key={flow.id} value={flow.id}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {flow.icon}
                  {flow.title}
                </CardTitle>
                <CardDescription>
                  <div className="mt-2">
                    <strong>Pré-requisitos:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {flow.prerequisites.map((prereq, i) => (
                        <li key={i}>{prereq}</li>
                      ))}
                    </ul>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {flow.steps.map((step, index) => (
                    <div 
                      key={step.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        completedTests[step.id] 
                          ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" 
                          : "bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        id={step.id}
                        checked={completedTests[step.id] || false}
                        onCheckedChange={() => toggleTest(step.id)}
                      />
                      <span className="font-mono text-sm text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <label 
                        htmlFor={step.id}
                        className={`flex-1 cursor-pointer ${
                          completedTests[step.id] ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {step.label}
                      </label>
                      {step.link && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={step.link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Flow Complete Message */}
                {getFlowProgress(flow).completed === getFlowProgress(flow).total && (
                  <Alert className="mt-4 border-green-500 bg-green-50 dark:bg-green-950">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription>
                      ✅ <strong>Fluxo validado com sucesso!</strong> Todos os passos foram concluídos.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Quick Links */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>🔗 Links Rápidos para Teste</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" asChild>
              <a href="/balcao" target="_blank">
                <Truck className="h-4 w-4 mr-2" />
                Balcão
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/cozinha" target="_blank">
                <ChefHat className="h-4 w-4 mr-2" />
                Cozinha
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/pdv" target="_blank">
                <CreditCard className="h-4 w-4 mr-2" />
                PDV
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/menu-tablet" target="_blank">
                <Smartphone className="h-4 w-4 mr-2" />
                Tablet
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/totem" target="_blank">
                <Monitor className="h-4 w-4 mr-2" />
                Totem
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/monitor-senhas" target="_blank">
                <Monitor className="h-4 w-4 mr-2" />
                Monitor Senhas
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/salao" target="_blank">
                <Play className="h-4 w-4 mr-2" />
                Salão
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/cardapio" target="_blank">
                <Play className="h-4 w-4 mr-2" />
                Cardápio
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Complete */}
      {progressPercent === 100 && (
        <Alert className="mt-6 border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <AlertDescription className="text-lg">
            🎉 <strong>Parabéns! Todos os testes foram concluídos com sucesso!</strong>
            <br />
            O sistema está pronto para produção.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default TesteSistema;
