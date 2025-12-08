-- Fix 1: Remove dangerous NULL condition from customers RLS policy
DROP POLICY IF EXISTS "Restaurant staff can manage customers" ON public.customers;

-- Create proper RLS policy for customers (restaurant-scoped only)
CREATE POLICY "Restaurant staff can manage customers" 
ON public.customers 
FOR ALL 
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.user_restaurants 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id FROM public.user_restaurants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Fix 2: Update has_role function with proper search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;