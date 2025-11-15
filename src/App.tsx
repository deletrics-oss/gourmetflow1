import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppProvider } from "@/contexts/AppContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FloatingAISearch } from "@/components/FloatingAISearch";
import { SubscriptionAlert } from "@/components/SubscriptionAlert";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Pedidos from "./pages/Pedidos";
import Cardapio from "./pages/Cardapio";
import Salao from "./pages/Salao";
import TableOrder from "./pages/TableOrder";
import Comandas from "./pages/Comandas";
import Cozinha from "./pages/Cozinha";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Cupons from "./pages/Cupons";
import Cashback from "./pages/Cashback";
import PDV from "./pages/PDV";
import MonitorCozinha from "./pages/MonitorCozinha";
import MonitorGestor from "./pages/MonitorGestor";
import Estoque from "./pages/Estoque";
import Usuarios from "./pages/Usuarios";
import PermissoesUsuarios from "./pages/PermissoesUsuarios";
import Clientes from "./pages/Clientes";
import Fornecedores from "./pages/Fornecedores";
import Motoboys from "./pages/Motoboys";
import Despesas from "./pages/Despesas";
import NotFound from "./pages/NotFound";
import CustomerMenu from "./pages/CustomerMenu";
import TableCustomerMenu from "./pages/TableCustomerMenu";
import MonitorCozinhaExterno from "./pages/MonitorCozinhaExterno";
import CozinhaExterno from "./pages/CozinhaExterno";
import MonitorGestorExterno from "./pages/MonitorGestorExterno";
import Caixa from "./pages/Caixa";
import Planos from "./pages/Planos";
import ZapBot from "./pages/ZapBot";
import DisparoMassa from "./pages/DisparoMassa";
import RelatorioFidelidade from "./pages/RelatorioFidelidade";
import NotaFiscal from "./pages/NotaFiscal";
import AdminAssinaturas from "./pages/AdminAssinaturas";
import GestaoFinanceira from "./pages/GestaoFinanceira";

const queryClient = new QueryClient();

const App = () => {
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <AppProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <SubscriptionAlert />
              {showSearch && <FloatingAISearch onClose={() => setShowSearch(false)} />}
              <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            {/* Public Routes - Monitores Externos */}
        <Route path="/monitor-cozinha-externo" element={<MonitorCozinhaExterno />} />
        <Route path="/cozinha-externo" element={<CozinhaExterno />} />
        <Route path="/monitor-gestor-externo" element={<MonitorGestorExterno />} />
            {/* Public Routes - Cardápio do Cliente */}
            <Route path="/customer-menu" element={<CustomerMenu />} />
            <Route path="/table-menu" element={<TableCustomerMenu />} />
            
            <Route path="/*" element={
              <ProtectedRoute>
                <div className="flex h-screen">
                  <Sidebar />
                  <main className="flex-1 overflow-y-auto">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/pedidos" element={<Pedidos />} />
                      <Route path="/cardapio" element={<Cardapio />} />
                      <Route path="/salao" element={<Salao />} />
                      <Route path="/table/:tableId" element={<TableOrder />} />
                      <Route path="/comandas" element={<Comandas />} />
                      <Route path="/cozinha" element={<Cozinha />} />
                      <Route path="/estoque" element={<Estoque />} />
                      <Route path="/pdv" element={<PDV />} />
                      <Route path="/gestao-financeira" element={<GestaoFinanceira />} />
                      <Route path="/monitor-cozinha" element={<MonitorCozinha />} />
                      <Route path="/monitor-gestor" element={
                        <ProtectedRoute requireManager>
                          <MonitorGestor />
                        </ProtectedRoute>
                      } />
                      <Route path="/relatorios" element={<Relatorios />} />
                      <Route path="/configuracoes" element={<Configuracoes />} />
                      <Route path="/cupons" element={<Cupons />} />
                      <Route path="/cashback" element={<Cashback />} />
                      <Route path="/clientes" element={<Clientes />} />
                      <Route path="/fornecedores" element={<Fornecedores />} />
                      <Route path="/motoboys" element={<Motoboys />} />
                      <Route path="/despesas" element={<Despesas />} />
                      <Route path="/usuarios" element={
                        <ProtectedRoute requireAdmin>
                          <Usuarios />
                        </ProtectedRoute>
                      } />
                      <Route path="/permissoes" element={
                        <ProtectedRoute requireAdmin>
                          <PermissoesUsuarios />
                        </ProtectedRoute>
                      } />
                      <Route path="/admin/assinaturas" element={
                        <ProtectedRoute requireAdmin>
                          <AdminAssinaturas />
                        </ProtectedRoute>
                      } />
                      <Route path="/planos" element={<Planos />} />
                      <Route path="/zap-bot" element={
                        <ProtectedRoute requireAdmin>
                          <ZapBot />
                        </ProtectedRoute>
                      } />
                      <Route path="/disparo-massa" element={
                        <ProtectedRoute requireAdmin>
                          <DisparoMassa />
                        </ProtectedRoute>
                      } />
                      <Route path="/fidelidade" element={
                        <ProtectedRoute requireAdmin>
                          <RelatorioFidelidade />
                        </ProtectedRoute>
                      } />
                      <Route path="/nfc-e" element={
                        <ProtectedRoute requireAdmin>
                          <NotaFiscal />
                        </ProtectedRoute>
                      } />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            } />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AppProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
