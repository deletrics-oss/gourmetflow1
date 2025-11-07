-- Ajustar tabela cash_movements
ALTER TABLE cash_movements 
  ADD COLUMN IF NOT EXISTS movement_date date DEFAULT CURRENT_DATE,
  ALTER COLUMN amount TYPE numeric USING amount::numeric;