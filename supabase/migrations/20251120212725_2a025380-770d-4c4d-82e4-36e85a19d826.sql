-- ================================================
-- FASE 1: Corrigir constraint e dados
-- ================================================

-- Drop constraint existente
ALTER TABLE cash_movements DROP CONSTRAINT IF EXISTS cash_movements_type_check;

-- Agora atualizar os dados sem o constraint
UPDATE cash_movements SET type = 'income' WHERE type NOT IN ('income', 'expense');

-- Padronizar categorias
UPDATE cash_movements SET category = 'sale' WHERE category = 'Venda';

-- Recriar constraint com valores corretos
ALTER TABLE cash_movements 
ADD CONSTRAINT cash_movements_type_check 
CHECK (type IN ('income', 'expense'));

-- ================================================
-- FASE 2: Adicionar colunas para gateways de pagamento
-- ================================================

-- PagSeguro
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS pagseguro_token TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS pagseguro_email TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS pagseguro_enabled BOOLEAN DEFAULT false;

-- Mercado Pago
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS mercadopago_access_token TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS mercadopago_public_key TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS mercadopago_enabled BOOLEAN DEFAULT false;

-- Rede
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS rede_pv TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS rede_token TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS rede_enabled BOOLEAN DEFAULT false;

-- Stone
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS stone_merchant_id TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS stone_api_key TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS stone_enabled BOOLEAN DEFAULT false;

-- Nubank
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS nubank_client_id TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS nubank_client_secret TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS nubank_enabled BOOLEAN DEFAULT false;

-- ================================================
-- FASE 3: Criar política RLS para orders
-- ================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'authenticated_can_update_orders'
  ) THEN
    CREATE POLICY "authenticated_can_update_orders" ON orders
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;