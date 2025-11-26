-- FASE 1: Corrigir RLS da tabela tables
DROP POLICY IF EXISTS "Staff can manage tables" ON public.tables;
DROP POLICY IF EXISTS "Authenticated users can view tables" ON public.tables;
DROP POLICY IF EXISTS "Authenticated users can select tables" ON public.tables;
DROP POLICY IF EXISTS "Authenticated users can insert tables" ON public.tables;
DROP POLICY IF EXISTS "Authenticated users can update tables" ON public.tables;
DROP POLICY IF EXISTS "Authenticated users can delete free tables" ON public.tables;

CREATE POLICY "Authenticated users can select tables" 
ON public.tables FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert tables" 
ON public.tables FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tables" 
ON public.tables FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can delete free tables" 
ON public.tables FOR DELETE 
TO authenticated 
USING (status = 'free');

-- FASE 2: Adicionar novos status ao enum order_status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ready_for_payment' AND enumtypid = 'order_status'::regtype) THEN
        ALTER TYPE order_status ADD VALUE 'ready_for_payment';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_receipt' AND enumtypid = 'order_status'::regtype) THEN
        ALTER TYPE order_status ADD VALUE 'pending_receipt';
    END IF;
END $$;

COMMENT ON TYPE order_status IS 'Status: new, confirmed, preparing, ready, ready_for_payment, pending_receipt, out_for_delivery, completed, cancelled';

-- FASE 3: Corrigir função log_action (dropar duplicatas e criar versão única)
DROP FUNCTION IF EXISTS public.log_action(text, text, uuid, jsonb);
DROP FUNCTION IF EXISTS public.log_action(text, text, uuid, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.log_action(
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT NULL,
  p_restaurant_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  INSERT INTO public.system_logs (
    action, 
    entity_type, 
    entity_id, 
    details, 
    user_id, 
    restaurant_id,
    created_at
  ) VALUES (
    p_action, 
    p_entity_type, 
    p_entity_id, 
    p_details, 
    v_user_id, 
    p_restaurant_id,
    now()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to log action: %', SQLERRM;
    RETURN NULL;
END;
$$;