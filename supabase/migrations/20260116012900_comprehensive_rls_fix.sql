-- ============================================
-- COMPREHENSIVE FIX FOR ALL RLS POLICIES
-- AND MISSING COLUMNS
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: FIX ALL RLS POLICIES (OPEN ACCESS)
-- ============================================

-- ORDERS
ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.orders;', ' '), '') FROM pg_policies WHERE tablename = 'orders' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_all" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ORDER_ITEMS
ALTER TABLE IF EXISTS public.order_items DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.order_items;', ' '), '') FROM pg_policies WHERE tablename = 'order_items' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_all" ON public.order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CATEGORIES
ALTER TABLE IF EXISTS public.categories DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.categories;', ' '), '') FROM pg_policies WHERE tablename = 'categories' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_all" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- MENU_ITEMS
ALTER TABLE IF EXISTS public.menu_items DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.menu_items;', ' '), '') FROM pg_policies WHERE tablename = 'menu_items' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "menu_items_all" ON public.menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CUSTOMERS
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.customers;', ' '), '') FROM pg_policies WHERE tablename = 'customers' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_all" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- INVENTORY
ALTER TABLE IF EXISTS public.inventory DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.inventory;', ' '), '') FROM pg_policies WHERE tablename = 'inventory' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_all" ON public.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- MOTOBOYS
ALTER TABLE IF EXISTS public.motoboys DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.motoboys;', ' '), '') FROM pg_policies WHERE tablename = 'motoboys' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.motoboys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "motoboys_all" ON public.motoboys FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TABLES
ALTER TABLE IF EXISTS public.tables DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.tables;', ' '), '') FROM pg_policies WHERE tablename = 'tables' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tables_all" ON public.tables FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DELIVERY_ZONES
ALTER TABLE IF EXISTS public.delivery_zones DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.delivery_zones;', ' '), '') FROM pg_policies WHERE tablename = 'delivery_zones' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_zones_all" ON public.delivery_zones FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- COUPONS
ALTER TABLE IF EXISTS public.coupons DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.coupons;', ' '), '') FROM pg_policies WHERE tablename = 'coupons' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons_all" ON public.coupons FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CASHBACK_SETTINGS
ALTER TABLE IF EXISTS public.cashback_settings DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.cashback_settings;', ' '), '') FROM pg_policies WHERE tablename = 'cashback_settings' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.cashback_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashback_settings_all" ON public.cashback_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CASHBACK_TRANSACTIONS
ALTER TABLE IF EXISTS public.cashback_transactions DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.cashback_transactions;', ' '), '') FROM pg_policies WHERE tablename = 'cashback_transactions' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.cashback_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cashback_transactions_all" ON public.cashback_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SUPPLIERS
ALTER TABLE IF EXISTS public.suppliers DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.suppliers;', ' '), '') FROM pg_policies WHERE tablename = 'suppliers' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_all" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EXPENSES
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.expenses;', ' '), '') FROM pg_policies WHERE tablename = 'expenses' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_all" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EMPLOYEES
ALTER TABLE IF EXISTS public.employees DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.employees;', ' '), '') FROM pg_policies WHERE tablename = 'employees' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_all" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- USER_PREFERENCES
ALTER TABLE IF EXISTS public.user_preferences DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.user_preferences;', ' '), '') FROM pg_policies WHERE tablename = 'user_preferences' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_preferences_all" ON public.user_preferences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- USER_ROLES
ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.user_roles;', ' '), '') FROM pg_policies WHERE tablename = 'user_roles' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_all" ON public.user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- USER_RESTAURANTS
ALTER TABLE IF EXISTS public.user_restaurants DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.user_restaurants;', ' '), '') FROM pg_policies WHERE tablename = 'user_restaurants' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.user_restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_restaurants_all" ON public.user_restaurants FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RESTAURANTS
ALTER TABLE IF EXISTS public.restaurants DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.restaurants;', ' '), '') FROM pg_policies WHERE tablename = 'restaurants' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurants_all" ON public.restaurants FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RESTAURANT_SETTINGS
ALTER TABLE IF EXISTS public.restaurant_settings DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.restaurant_settings;', ' '), '') FROM pg_policies WHERE tablename = 'restaurant_settings' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.restaurant_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurant_settings_all" ON public.restaurant_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SUBSCRIPTIONS
ALTER TABLE IF EXISTS public.subscriptions DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.subscriptions;', ' '), '') FROM pg_policies WHERE tablename = 'subscriptions' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_all" ON public.subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PROFILES
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.profiles;', ' '), '') FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_all" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SYSTEM_LOGS
ALTER TABLE IF EXISTS public.system_logs DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.system_logs;', ' '), '') FROM pg_policies WHERE tablename = 'system_logs' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_logs_all" ON public.system_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- BOT_LOGICS
ALTER TABLE IF EXISTS public.bot_logics DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.bot_logics;', ' '), '') FROM pg_policies WHERE tablename = 'bot_logics' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.bot_logics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bot_logics_all" ON public.bot_logics FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- BILLING_CONFIG
ALTER TABLE IF EXISTS public.billing_config DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.billing_config;', ' '), '') FROM pg_policies WHERE tablename = 'billing_config' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.billing_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_config_all" ON public.billing_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- BILLING_PLANS
ALTER TABLE IF EXISTS public.billing_plans DISABLE ROW LEVEL SECURITY;
DO $$ BEGIN EXECUTE (SELECT COALESCE(string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.billing_plans;', ' '), '') FROM pg_policies WHERE tablename = 'billing_plans' AND schemaname = 'public'); END $$;
ALTER TABLE IF EXISTS public.billing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_plans_all" ON public.billing_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- PART 2: ADD MISSING COLUMNS
-- ============================================

-- CUSTOMERS - adicionar colunas faltantes
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS zipcode TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS complement TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMPTZ;

-- INVENTORY - adicionar colunas faltantes
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS restaurant_id UUID;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS supplier_id UUID;

-- MOTOBOYS - adicionar colunas faltantes
ALTER TABLE public.motoboys ADD COLUMN IF NOT EXISTS restaurant_id UUID;
ALTER TABLE public.motoboys ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'moto';
ALTER TABLE public.motoboys ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE public.motoboys ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'fixed';
ALTER TABLE public.motoboys ADD COLUMN IF NOT EXISTS commission_value DECIMAL(10,2) DEFAULT 5.00;

-- ============================================
-- PART 3: GRANT PUBLIC READ ACCESS (anon)
-- ============================================

-- Allow anon to read menu for public cardapio
CREATE POLICY IF NOT EXISTS "anon_read_categories" ON public.categories FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "anon_read_menu_items" ON public.menu_items FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "anon_read_restaurants" ON public.restaurants FOR SELECT TO anon USING (true);

-- Allow anon to insert orders (for customer menu)
CREATE POLICY IF NOT EXISTS "anon_insert_orders" ON public.orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_insert_order_items" ON public.order_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_insert_customers" ON public.customers FOR INSERT TO anon WITH CHECK (true);

-- ============================================
-- DONE!
-- ============================================
SELECT 'All RLS policies have been reset to OPEN access for authenticated users!' AS status;
