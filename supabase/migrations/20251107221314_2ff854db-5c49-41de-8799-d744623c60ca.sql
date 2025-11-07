-- Create motoboys table
CREATE TABLE IF NOT EXISTS public.motoboys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  cnh TEXT,
  vehicle_plate TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.motoboys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can manage motoboys"
ON public.motoboys
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.motoboys;