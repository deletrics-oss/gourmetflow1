import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionBlocker } from '@/components/SubscriptionBlocker';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireManager?: boolean;
}

export function ProtectedRoute({ children, requireAdmin, requireManager }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isManager, isSuperAdmin } = useAuth();
  const { canAccess, isExpired, isBlocked, loading: subLoading } = useSubscription();
  const location = useLocation();

  // Rotas que não precisam verificar assinatura
  const bypassRoutes = ['/planos', '/onboarding'];
  const shouldBypassSubscription = bypassRoutes.some(route => location.pathname.startsWith(route));

  if (loading || subLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireManager && !isManager) {
    return <Navigate to="/" replace />;
  }

  // Super Admin e Admin sempre têm acesso
  if (isSuperAdmin || isAdmin) {
    return <>{children}</>;
  }

  // Verificar bloqueio de assinatura (exceto em rotas bypass)
  if (!shouldBypassSubscription) {
    if (isBlocked) {
      return <SubscriptionBlocker reason="blocked" />;
    }

    if (!canAccess || isExpired) {
      return <SubscriptionBlocker reason="trial_expired" />;
    }
  }

  return <>{children}</>;
}
