import { LayoutDashboard, ShoppingCart, UtensilsCrossed, Utensils, Receipt, ChefHat, BarChart3, Settings, Tag, DollarSign, Monitor, TrendingUp, CreditCard, Package, Users, LogOut, LucideIcon, Truck, Shield, Search, Wallet, Bike, Bot, Award, FileText, CreditCard as CardIcon, MessageCircle, Send, ClipboardList, Crown } from "lucide-react";
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
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Pedidos Online", href: "/pedidos", icon: ShoppingCart },
  { title: "Cardápio", href: "/cardapio", icon: UtensilsCrossed },
  { title: "Gestão Financeira", href: "/gestao-financeira", icon: Wallet },
  { title: "PDV", href: "/pdv", icon: CreditCard },
  { title: "Balcão", href: "/balcao", icon: Users },
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

const adminNavItems: NavItem[] = [
  { title: "Funcionários", href: "/funcionarios", icon: Users },
  { title: "Usuários (Auth)", href: "/usuarios", icon: Shield },
  { title: "Logs do Sistema", href: "/system-logs", icon: ClipboardList },
  { title: "Integrações", href: "/integracoes", icon: Bot },
  { title: "WhatsApp Manager", href: "/whatsapp-manager", icon: MessageCircle },
  { title: "Zap Bot (Legado)", href: "/zapbot", icon: Bot },
  { title: "Disparo em Massa", href: "/disparo-massa", icon: Send },
  { title: "Relatório Fidelidade", href: "/fidelidade", icon: Award },
  { title: "Nota Fiscal (NFC-e)", href: "/nfc-e", icon: FileText },
];

const subscriptionNavItems: NavItem[] = [
  { title: "Assinaturas", href: "/admin/assinaturas", icon: CreditCard },
  { title: "👑 Super Admin", href: "/super-admin", icon: Crown },
];

const monitorNavItems: NavItem[] = [
  { title: "Monitor Cozinha", href: "/monitor-cozinha", icon: Monitor },
];

interface SidebarContentProps {
  onNavigate?: () => void;
  showSearch?: boolean;
}

export function SidebarContent({ onNavigate, showSearch = true }: SidebarContentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isManager, isSuperAdmin, isOwner, signOut, user } = useAuth();
  const [showSearchDialog, setShowSearchDialog] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleNavigation = (href: string) => {
    navigate(href);
    onNavigate?.();
  };

  const openExternal = (url: string, name: string, specs: string) => {
    window.open(url, name, specs);
    onNavigate?.();
  };

  return (
    <>
      {showSearchDialog && <FloatingAISearch onClose={() => setShowSearchDialog(false)} />}
      
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Utensils className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold">ZAP PEDIDO</h1>
          <p className="text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>

      {showSearch && (
        <div className="px-3 py-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setShowSearchDialog(true)}>
            <Search className="h-4 w-4" />
            Pesquisa Inteligente
            <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded hidden sm:inline">Ctrl+K</kbd>
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-3">
          <p className="px-3 text-xs font-semibold text-muted-foreground">MENU PRINCIPAL</p>
          {mainNavItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-left",
                  isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-1 px-3">
          <p className="px-3 text-xs font-semibold text-muted-foreground">MARKETING</p>
          {marketingNavItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-left",
                  isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-1 px-3">
          <p className="px-3 text-xs font-semibold text-muted-foreground">CADASTROS</p>
          {cadastrosNavItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-left",
                  isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-1 px-3">
          <p className="px-3 text-xs font-semibold text-muted-foreground">MONITORES</p>
          {monitorNavItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-left",
                  isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </button>
            );
          })}
          {isManager && (
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 px-3 py-2.5 text-sm" 
              onClick={() => openExternal('/monitor-gestor-externo', 'Monitor Gestor', 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no')}
            >
              <TrendingUp className="h-4 w-4" />
              Monitor Gestor (Externo)
            </Button>
          )}
        </div>

        <div className="mt-6 space-y-1 px-3">
          <p className="px-3 text-xs font-semibold text-muted-foreground">TELAS EXTERNAS</p>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 px-3 py-2.5 text-sm" 
            onClick={() => openExternal('/balcao-externo', 'Balcão Externo', 'width=1920,height=1080')}
          >
            <Users className="h-4 w-4" />
            🏪 Balcão Externo
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 px-3 py-2.5 text-sm" 
            onClick={() => openExternal('/menu-tablet', 'Cardápio Tablet', 'width=1024,height=768')}
          >
            <UtensilsCrossed className="h-4 w-4" />
            📱 Cardápio Tablet
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 px-3 py-2.5 text-sm" 
            onClick={() => openExternal('/totem', 'Totem', 'width=1080,height=1920')}
          >
            <Monitor className="h-4 w-4" />
            🖥️ Totem Autoatendimento
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 px-3 py-2.5 text-sm" 
            onClick={() => openExternal('/monitor-senhas', 'Monitor Senhas', 'width=1920,height=1080')}
          >
            <Receipt className="h-4 w-4" />
            🎫 Monitor de Senhas
          </Button>
        </div>

        {isAdmin && (
          <div className="mt-6 space-y-1 px-3">
            <p className="px-3 text-xs font-semibold text-muted-foreground">ADMINISTRAÇÃO</p>
            {adminNavItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-left",
                    isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </button>
              );
            })}
          </div>
        )}

        {isSuperAdmin && (
          <div className="mt-6 space-y-1 px-3">
            <p className="px-3 text-xs font-semibold text-muted-foreground">SUPER ADMIN</p>
            {subscriptionNavItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-left",
                    isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t p-4 space-y-2">
        {!isAdmin && (
          <button 
            onClick={() => handleNavigation('/planos')}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 p-3 hover:from-primary/20 hover:to-primary/10 transition-all w-full"
          >
            <CardIcon className="h-4 w-4 text-primary" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Meu Plano</p>
              <p className="text-xs text-muted-foreground">Ver e gerenciar</p>
            </div>
          </button>
        )}
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground truncate">
              {isSuperAdmin ? '👑 Super Admin' : isOwner ? 'Dono' : isManager ? 'Gerente' : 'Funcionário'}
            </p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </>
  );
}
