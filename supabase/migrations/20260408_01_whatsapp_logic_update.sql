-- 1. Adicionar as colunas obrigatórias
ALTER TABLE public.whatsapp_logic_configs ADD COLUMN IF NOT EXISTS ai_prompt TEXT;
ALTER TABLE public.whatsapp_logic_configs ADD COLUMN IF NOT EXISTS knowledge_base TEXT;
ALTER TABLE public.whatsapp_logic_configs ADD COLUMN IF NOT EXISTS logic_type TEXT DEFAULT 'json';
ALTER TABLE public.whatsapp_logic_configs ADD COLUMN IF NOT EXISTS logic_json JSONB DEFAULT '{}'::jsonb;

-- 2. Adicionar as novas regras de SDR (Global / Whitelist / Off)
ALTER TABLE public.whatsapp_logic_configs ADD COLUMN IF NOT EXISTS sdr_mode text DEFAULT 'global';
ALTER TABLE public.whatsapp_logic_configs ADD COLUMN IF NOT EXISTS whitelist_phones jsonb DEFAULT '[]'::jsonb;

-- 3. Forçar a API do Supabase a atualizar o mapa (Limpar Erro PGRST204)
NOTIFY pgrst, 'reload schema';
