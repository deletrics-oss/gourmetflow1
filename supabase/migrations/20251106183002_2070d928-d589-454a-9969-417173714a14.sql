-- Adicionar campo created_at na tabela customers (se não existir)
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Criar tabela para permissões de usuário por tela
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  screen_path TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, screen_path)
);

-- Habilitar RLS na tabela de permissões
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_permissions
CREATE POLICY "Admins can manage all permissions"
  ON public.user_permissions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Adicionar trigger para atualizar updated_at
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar view para histórico de pedidos por cliente
CREATE OR REPLACE VIEW public.customer_order_history AS
SELECT 
  c.id as customer_id,
  c.phone,
  c.name,
  COUNT(o.id) as total_orders,
  SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
  SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
  MAX(o.created_at) as last_order_date,
  SUM(CASE WHEN o.status = 'completed' THEN o.total ELSE 0 END) as total_spent
FROM public.customers c
LEFT JOIN public.orders o ON c.phone = o.customer_phone
GROUP BY c.id, c.phone, c.name;

-- Garantir que email na orders seja opcional
ALTER TABLE public.orders
ALTER COLUMN customer_phone DROP NOT NULL;