-- Adicionar colunas para Cielo na tabela restaurant_settings
ALTER TABLE public.restaurant_settings
ADD COLUMN IF NOT EXISTS cielo_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cielo_merchant_id text,
ADD COLUMN IF NOT EXISTS cielo_merchant_key text;