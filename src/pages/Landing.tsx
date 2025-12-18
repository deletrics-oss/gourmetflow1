import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Utensils, LayoutDashboard, ChefHat, Truck, CreditCard, Users, BarChart3, Smartphone, Loader2 } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Landing() {
  const { user, loading } = useAuth();

  // Redirecionar usuários logados para o dashboard
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 max-w-3xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary shadow-lg">
              <Utensils className="h-9 w-9 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground">
            GourmetFlow
          </h1>
          <p className="text-xl text-muted-foreground">
            Sistema Completo de Gestão para Restaurantes, Bares e Lanchonetes
          </p>
          <p className="text-lg text-muted-foreground/80">
            PDV, Mesas, Comandas, Cozinha, Delivery e muito mais em uma única plataforma
          </p>
          <div className="flex gap-4 justify-center flex-wrap pt-4">
            <Button size="lg" asChild>
              <Link to="/login">
                Começar Teste Grátis
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#planos">
                Ver Planos
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            ✨ 30 dias grátis • Sem cartão de crédito • Cancele quando quiser
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <LayoutDashboard className="w-10 h-10 text-primary mb-2" />
              <CardTitle>PDV Completo</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Ponto de venda moderno com gestão de caixa, múltiplas formas de pagamento e integração PIX
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <Users className="w-10 h-10 text-primary mb-2" />
              <CardTitle>Mesas e Comandas</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Controle completo do salão com mesas, comandas físicas e acompanhamento em tempo real
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <ChefHat className="w-10 h-10 text-primary mb-2" />
              <CardTitle>Monitor Cozinha</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Pedidos em tempo real na cozinha com alertas sonoros e controle de status por item
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-colors">
            <CardHeader>
              <Truck className="w-10 h-10 text-primary mb-2" />
              <CardTitle>Delivery Integrado</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Cardápio online, cálculo de taxa por zona e gestão de motoboys em uma só tela
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* More Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <Card className="border-border/50">
            <CardHeader>
              <CreditCard className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                PIX, cartões, dinheiro e integração com PagSeguro
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Relatórios</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Dashboards completos com vendas, produtos e fidelidade
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <Smartphone className="w-8 h-8 text-primary mb-2" />
              <CardTitle className="text-lg">Tablet e Totem</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Autoatendimento para clientes com pagamento integrado
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Section */}
        <div id="planos" className="max-w-6xl mx-auto scroll-mt-8">
          <h2 className="text-3xl font-bold text-center mb-3">Escolha seu Plano</h2>
          <p className="text-center text-muted-foreground mb-8">Todos os planos incluem 30 dias de teste grátis</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Trial */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Trial Grátis</CardTitle>
                <div className="text-3xl font-bold">R$ 0</div>
                <CardDescription>30 dias de acesso completo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Acesso a todas as funções</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">PDV e Balcão</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Monitor Cozinha</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Cardápio Online</span>
                  </li>
                </ul>
                <Button className="w-full" variant="outline" asChild>
                  <Link to="/login">Começar Grátis</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Delivery Básico */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Delivery Básico</CardTitle>
                <div className="text-3xl font-bold">R$ 59,99<span className="text-base font-normal">/mês</span></div>
                <CardDescription>Para delivery e balcão</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">PDV completo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Cardápio online</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Gestão de clientes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Relatórios básicos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Delivery integrado</span>
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <Link to="/login">Assinar Agora</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Delivery Pro */}
            <Card className="border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Mais Popular
              </div>
              <CardHeader>
                <CardTitle>Delivery Pro</CardTitle>
                <div className="text-3xl font-bold">R$ 99,99<span className="text-base font-normal">/mês</span></div>
                <CardDescription>Para restaurantes com salão</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Tudo do Delivery Básico</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Gestão de Mesas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Comandas físicas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Tablet na mesa</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Totem autoatendimento</span>
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <Link to="/login">Assinar Agora</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Delivery Completo */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Delivery Completo</CardTitle>
                <div className="text-3xl font-bold">R$ 159,99<span className="text-base font-normal">/mês</span></div>
                <CardDescription>Solução completa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">Tudo anterior</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">🤖 WhatsApp Bot integrado</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">🎨 Design de cardápio com IA</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">🍕 Integração iFood e 99Food</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">📄 NFC-e Nota Fiscal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">⭐ Suporte 24/7</span>
                  </li>
                </ul>
                <Button className="w-full" variant="default" asChild>
                  <Link to="/login">Assinar Full</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              <span className="font-semibold">GourmetFlow</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="/termos" className="hover:text-foreground transition-colors">
                Termos de Uso
              </Link>
              <Link to="/privacidade" className="hover:text-foreground transition-colors">
                Política de Privacidade
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 GourmetFlow. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}