-- MIGRATION: 20260409001200_schema_fixes_v4.sql
-- Foco: Fim dos erros 406, Segurança de Dados e Correção de Datas

-- 1. GARANTE QUE AS COLUNAS EXISTEM (FIM DO ERRO 406)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS manually_blocked BOOLEAN DEFAULT false;

-- 2. SEGURANÇA: ISOLAMENTO DE TENANT NO BANCO (RLS)
-- Tabela de Configurações
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Settings access" ON public.restaurant_settings;
CREATE POLICY "Settings access" ON public.restaurant_settings
FOR ALL USING (restaurant_id IN (SELECT ur.restaurant_id FROM user_restaurants ur WHERE ur.user_id = auth.uid()));

-- Tabela de Mensagens WhatsApp (Bot Legado)
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Messages access" ON public.whatsapp_messages;
CREATE POLICY "Messages access" ON public.whatsapp_messages
FOR ALL USING (restaurant_id IN (SELECT ur.restaurant_id FROM user_restaurants ur WHERE ur.user_id = auth.uid()));

-- Tabela de Agendamentos WhatsApp (Bot Legado)
ALTER TABLE public.whatsapp_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Appointments access" ON public.whatsapp_appointments;
CREATE POLICY "Appointments access" ON public.whatsapp_appointments
FOR ALL USING (restaurant_id IN (SELECT ur.restaurant_id FROM user_restaurants ur WHERE ur.user_id = auth.uid()));

-- 3. FIX DATAS (Limpa dados de exemplo "14/01/2026")
UPDATE public.restaurants SET created_at = NOW() WHERE created_at < '2026-02-01';
UPDATE public.profiles SET created_at = NOW() WHERE created_at < '2026-02-01';

-- 4. ATUALIZA RPC DO SUPER ADMIN (Visibilidade Lara e Emails)
CREATE OR REPLACE FUNCTION public.get_admin_users_v2()
RETURNS TABLE (
    id UUID, email TEXT, full_name TEXT, phone TEXT, created_at TIMESTAMP WITH TIME ZONE,
    restaurant_name TEXT, plan_type TEXT, status TEXT, trial_end TIMESTAMP WITH TIME ZONE, manually_blocked BOOLEAN
) SECURITY DEFINER SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY SELECT 
        u.id, 
        u.email::TEXT, 
        p.full_name, 
        p.phone, 
        u.created_at, 
        r.name as restaurant_name, 
        s.plan_type, 
        s.status, 
        s.trial_end, 
        COALESCE(s.manually_blocked, false)
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.user_id
    LEFT JOIN user_restaurants ur ON u.id = ur.user_id AND ur.is_active = true
    LEFT JOIN restaurants r ON ur.restaurant_id = r.id
    LEFT JOIN subscriptions s ON u.id = s.user_id
    ORDER BY u.created_at DESC;
END; $$ LANGUAGE plpgsql;
