-- Fix search_path for update_nfce_updated_at function (CASCADE)
DROP FUNCTION IF EXISTS public.update_nfce_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_nfce_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_nfce_settings_updated_at
  BEFORE UPDATE ON public.nfce_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nfce_updated_at();

CREATE TRIGGER update_nfce_issued_updated_at
  BEFORE UPDATE ON public.nfce_issued
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nfce_updated_at();
