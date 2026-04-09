-- HABILITAR LEITURA PÚBLICA PARA SaaS MULTI-TENANT
-- Permite que clientes anônimos visualizem cardápios e monitores se tiverem o restaurant_id

-- 1. Tabela: restaurants
ALTER POLICY "Permitir leitura pública de restaurantes por ID" ON public.restaurants FOR SELECT USING (true);

-- 2. Tabela: restaurant_settings
DROP POLICY IF EXISTS "Leitura pública de configurações" ON public.restaurant_settings;
CREATE POLICY "Leitura pública de configurações" ON public.restaurant_settings
FOR SELECT USING (true);

-- 3. Tabela: categories
DROP POLICY IF EXISTS "Leitura pública de categorias" ON public.categories;
CREATE POLICY "Leitura pública de categorias" ON public.categories
FOR SELECT USING (is_active = true);

-- 4. Tabela: menu_items
DROP POLICY IF EXISTS "Leitura pública de itens" ON public.menu_items;
CREATE POLICY "Leitura pública de itens" ON public.menu_items
FOR SELECT USING (is_available = true);

-- 5. Tabela: orders (Permitir que o monitor de senhas veja apenas o básico)
DROP POLICY IF EXISTS "Leitura pública de pedidos para monitores" ON public.orders;
CREATE POLICY "Leitura pública de pedidos para monitores" ON public.orders
FOR SELECT USING (
  created_at >= (CURRENT_DATE)::timestamp with time zone
);

-- 6. Tabela: order_items
DROP POLICY IF EXISTS "Leitura pública de itens do pedido" ON public.order_items;
CREATE POLICY "Leitura pública de itens do pedido" ON public.order_items
FOR SELECT USING (true);

-- Garantir que anon tenha permissão de SELECT
GRANT SELECT ON public.restaurants TO anon;
GRANT SELECT ON public.restaurant_settings TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT ON public.orders TO anon;
GRANT SELECT ON public.order_items TO anon;
GRANT SELECT ON public.product_complements TO anon;
GRANT SELECT ON public.product_complement_items TO anon;
