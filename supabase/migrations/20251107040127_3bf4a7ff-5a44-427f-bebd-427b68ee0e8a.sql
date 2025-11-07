-- Criar tabela de usuários do sistema
CREATE TABLE IF NOT EXISTS public.system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'usuario',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de permissões de usuários
CREATE TABLE IF NOT EXISTS public.system_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.system_users(id) ON DELETE CASCADE,
  screen_id TEXT NOT NULL,
  screen_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, screen_id)
);

-- Enable RLS
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para system_users
CREATE POLICY "Admins podem gerenciar usuários do sistema"
  ON public.system_users
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuários podem ver próprio perfil"
  ON public.system_users
  FOR SELECT
  USING (true);

-- Políticas RLS para system_user_permissions
CREATE POLICY "Admins podem gerenciar permissões"
  ON public.system_user_permissions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Usuários podem ver próprias permissões"
  ON public.system_user_permissions
  FOR SELECT
  USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_system_users_updated_at
  BEFORE UPDATE ON public.system_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();