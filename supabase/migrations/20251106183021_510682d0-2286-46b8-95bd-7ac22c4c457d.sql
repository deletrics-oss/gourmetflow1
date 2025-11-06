-- Drop the view with security definer issue and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS public.customer_order_history;

-- Recreate the view properly without security definer
CREATE VIEW public.customer_order_history 
WITH (security_invoker = true) AS
SELECT 
  c.id as customer_id,
  c.phone,
  c.name,
  COUNT(o.id) as total_orders,
  SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
  SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
  MAX(o.created_at) as last_order_date,
  SUM(CASE WHEN o.status = 'completed' THEN o.total ELSE 0 END) as total_spent
FROM public.customers c
LEFT JOIN public.orders o ON c.phone = o.customer_phone
GROUP BY c.id, c.phone, c.name;