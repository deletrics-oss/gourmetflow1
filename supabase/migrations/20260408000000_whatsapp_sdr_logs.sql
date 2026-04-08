-- Tabela de deduplicação e logs SDR
CREATE TABLE IF NOT EXISTS public.whatsapp_sdr_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id text UNIQUE,
    restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
    instance_name text,
    contact text,
    message_in text,
    message_out text,
    tools_used jsonb DEFAULT '[]'::jsonb,
    status text,
    error text,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS
ALTER TABLE public.whatsapp_sdr_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_sdr_logs" ON public.whatsapp_sdr_logs
    FOR ALL USING (
        restaurant_id IN (
            SELECT restaurant_id FROM public.user_restaurants 
            WHERE user_id = auth.uid() AND is_active = true
        )
    );
