-- Create RPC functions to increment broadcast stats atomicity
CREATE OR REPLACE FUNCTION public.increment_broadcast_sent(b_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.whatsapp_broadcasts
  SET sent_count = sent_count + 1
  WHERE id = b_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_broadcast_failed(b_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.whatsapp_broadcasts
  SET failed_count = failed_count + 1
  WHERE id = b_id;
END;
$$;
