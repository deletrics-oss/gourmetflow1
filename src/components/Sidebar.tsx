import { LayoutDashboard, ShoppingCart, UtensilsCrossed, Utensils, Receipt, ChefHat, BarChart3, Settings, Tag, DollarSign, Monitor, TrendingUp, CreditCard, Package, Users, LogOut, LucideIcon, Truck, Shield, Search, Wallet, Bike } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { FloatingAISearch } from "@/components/FloatingAISearch";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Pedidos Online", href: "/pedidos", icon: ShoppingCart },
  { title: "Cardápio", href: "/cardapio", icon: UtensilsCrossed },
  { title: "PDV", href: "/pdv", icon: CreditCard },
  { title: "Salão", href: "/salao", icon: Utensils },
  { title: "Comandas", href: "/comandas", icon: Receipt },
  { title: "Cozinha (KDS)", href: "/cozinha", icon: ChefHat },
  { title: "Estoque", href: "/estoque", icon: Package },
  { title: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { title: "Configurações", href: "/configuracoes", icon: Settings },
];

const marketingNavItems: NavItem[] = [
  { title: "Cupons", href: "/cupons", icon: Tag },
  { title: "Cashback", href: "/cashback", icon: DollarSign },
];

const cadastrosNavItems: NavItem[] = [
  { title: "Clientes", href: "/clientes", icon: Users },
  { title: "Fornecedores", href: "/fornecedores", icon: Truck },
  { title: "Motoboys", href: "/motoboys", icon: Bike },
  { title: "Despesas", href: "/despesas", icon: Receipt },
];

const monitorNavItems: NavItem[] = [
  { title: "Monitor Cozinha", href: "/monitor-cozinha", icon: Monitor },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isManager, signOut, user } = useAuth();
  const [showSearch, setShowSearch] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {showSearch && <FloatingAISearch onClose={() => setShowSearch(false)} />}
      <div className="flex h-screen w-64 flex-col border-r bg-sidebar">
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Utensils className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">GourmetFlow</h1>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>

        <div className="px-3 py-3">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-4 w-4" />
            Pesquisa Inteligente
            <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">Ctrl+K</kbd>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-3">
            <p className="px-3 text-xs font-semibold text-muted-foreground">MENU PRINCIPAL</p>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 space-y-1 px-3">
          <p className="px-3 text-xs font-semibold text-muted-foreground">MARKETING</p>
          {marketingNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 space-y-1 px-3">
          <p className="px-3 text-xs font-semibold text-muted-foreground">CADASTROS</p>
          {cadastrosNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 space-y-1 px-3">
          <p className="px-3 text-xs font-semibold text-muted-foreground">MONITORES</p>
          {monitorNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
          {isManager && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3 py-2.5 text-sm"
              onClick={() => window.open('/monitor-gestor-externo', 'Monitor Gestor', 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no')}
            >
              <TrendingUp className="h-4 w-4" />
              Monitor Gestor (Externo)
            </Button>
          )}
        </div>

        {isAdmin && (
          <div className="mt-6 space-y-1 px-3">
            <p className="px-3 text-xs font-semibold text-muted-foreground">ADMINISTRAÇÃO</p>
            <Link
              to="/usuarios"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                location.pathname === "/usuarios"
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Shield className="h-4 w-4" />
              Usuários
            </Link>
            <Link
              to="/caixa"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                location.pathname === "/caixa"
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Wallet className="h-4 w-4" />
              Gestão de Caixa
            </Link>
          </div>
        )}
      </div>

      <div className="border-t p-4 space-y-2">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground truncate">
              {isAdmin ? 'Administrador' : isManager ? 'Gerente' : 'Funcionário'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
    </>
  );
}
