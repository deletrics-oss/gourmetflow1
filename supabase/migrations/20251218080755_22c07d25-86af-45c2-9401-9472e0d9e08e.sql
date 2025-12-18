-- PASSO 1: Remover constraint antiga PRIMEIRO
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

-- PASSO 2: Migrar planos existentes para novos nomes
UPDATE subscriptions SET plan_type = 'delivery1' WHERE plan_type = 'essencial';
UPDATE subscriptions SET plan_type = 'delivery2' WHERE plan_type = 'essencial_mesas';
UPDATE subscriptions SET plan_type = 'delivery3' WHERE plan_type = 'customizado';

-- PASSO 3: Adicionar nova constraint com novos valores
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_type_check 
CHECK (plan_type = ANY (ARRAY['delivery1', 'delivery2', 'delivery3']));

-- PASSO 4: Atualizar trigger de inicialização para novos usuários começarem em delivery1
CREATE OR REPLACE FUNCTION public.initialize_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (
    user_id,
    plan_type,
    status,
    trial_end
  ) VALUES (
    NEW.id,
    'delivery1',
    'trial',
    now() + interval '30 days'
  );
  RETURN NEW;
END;
$function$;