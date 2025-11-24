-- Verificar e criar policy para permitir INSERT em system_logs
DO $$
BEGIN
  -- Verifica se a policy já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_logs' 
    AND policyname = 'Allow authenticated users to insert logs'
  ) THEN
    -- Cria a policy se não existir
    CREATE POLICY "Allow authenticated users to insert logs"
      ON system_logs FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;