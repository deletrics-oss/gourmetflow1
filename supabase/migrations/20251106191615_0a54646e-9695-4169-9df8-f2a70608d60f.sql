-- Adicionar campos de endereço completo nas configurações do restaurante
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zipcode TEXT,
ADD COLUMN IF NOT EXISTS complement TEXT;