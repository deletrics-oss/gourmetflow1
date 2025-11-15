-- Criar tabela para níveis de acesso (roles predefinidos)
CREATE TABLE IF NOT EXISTS public.access_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.access_levels ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage access levels"
ON public.access_levels
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Inserir níveis de acesso padrão
INSERT INTO public.access_levels (name, description, permissions) VALUES
('garcom', 'Garçom - Acesso ao salão e pedidos', '{"screens": ["/dashboard", "/salao", "/pedidos", "/comandas"]}'::jsonb),
('gerente', 'Gerente - Acesso amplo ao sistema', '{"screens": ["/dashboard", "/cardapio", "/pedidos", "/comandas", "/salao", "/pdv", "/cozinha", "/caixa", "/estoque", "/clientes", "/relatorios", "/cupons", "/cashback"]}'::jsonb),
('caixa', 'Caixa - Acesso ao PDV e caixa', '{"screens": ["/dashboard", "/pdv", "/caixa", "/relatorios"]}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Trigger para updated_at
CREATE TRIGGER update_access_levels_updated_at
BEFORE UPDATE ON public.access_levels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();