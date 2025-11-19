-- Adicionar coluna motoboy_id na tabela orders se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'motoboy_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN motoboy_id UUID REFERENCES motoboys(id);
  END IF;
END $$;

-- Adicionar coluna customer_id na tabela orders se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_id UUID REFERENCES customers(id);
  END IF;
END $$;