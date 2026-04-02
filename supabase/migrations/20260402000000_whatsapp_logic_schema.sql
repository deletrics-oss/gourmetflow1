-- Migration: WhatsApp Logic Schema Sync v2
-- Adds missing columns for SDR Gemini and advanced logic configuration

-- 1. Add columns to whatsapp_logic_configs
ALTER TABLE public.whatsapp_logic_configs ADD COLUMN IF NOT EXISTS ai_prompt TEXT;
ALTER TABLE public.whatsapp_logic_configs ADD COLUMN IF NOT EXISTS knowledge_base TEXT; -- New column for extended context
ALTER TABLE public.whatsapp_logic_configs ADD COLUMN IF NOT EXISTS logic_type TEXT DEFAULT 'json'; -- ai, json, hybrid, ai_scheduling
ALTER TABLE public.whatsapp_logic_configs ADD COLUMN IF NOT EXISTS logic_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.whatsapp_logic_configs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add columns to whatsapp_devices to link logic
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_devices' AND column_name='active_logic_id') THEN
        ALTER TABLE public.whatsapp_devices ADD COLUMN active_logic_id UUID REFERENCES public.whatsapp_logic_configs(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Ensure RLS for whatsapp_logic_configs
ALTER TABLE public.whatsapp_logic_configs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own restaurant logic" ON public.whatsapp_logic_configs;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Users can manage their own restaurant logic" ON public.whatsapp_logic_configs
    FOR ALL
    TO authenticated
    USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid()));

-- 4. Conversations and Messages RLS (Safety)
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own restaurant conversations" ON public.whatsapp_conversations;
    DROP POLICY IF EXISTS "Users can manage their own restaurant messages" ON public.whatsapp_messages;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Users can manage their own restaurant conversations" ON public.whatsapp_conversations
    FOR ALL TO authenticated USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own restaurant messages" ON public.whatsapp_messages
    FOR ALL TO authenticated USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid()));
