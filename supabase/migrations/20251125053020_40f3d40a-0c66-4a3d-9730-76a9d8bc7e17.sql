-- FASE 1: Adicionar coluna number_of_guests na tabela orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS number_of_guests INTEGER DEFAULT 2;

COMMENT ON COLUMN public.orders.number_of_guests IS 'Número de pessoas na mesa/comanda';

-- FASE 8: Trigger para auto-liberar mesa quando todas comandas são fechadas
CREATE OR REPLACE FUNCTION update_table_status_on_order_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um pedido é completado, verificar se ainda há outros pedidos ativos na mesa
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status NOT IN ('completed', 'cancelled') AND NEW.table_id IS NOT NULL THEN
    -- Contar pedidos ativos na mesa
    IF NOT EXISTS (
      SELECT 1 FROM public.orders 
      WHERE table_id = NEW.table_id 
      AND status NOT IN ('completed', 'cancelled')
      AND id != NEW.id
    ) THEN
      -- Se não há mais pedidos ativos, liberar a mesa
      UPDATE public.tables 
      SET status = 'free' 
      WHERE id = NEW.table_id;
      
      -- Log automático de mesa liberada
      INSERT INTO public.system_logs (action, entity_type, entity_id, details)
      VALUES (
        'table_auto_freed',
        'tables',
        NEW.table_id,
        jsonb_build_object(
          'reason', 'all_orders_completed',
          'order_id', NEW.id,
          'order_number', NEW.order_number
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_update_table_status ON public.orders;
CREATE TRIGGER trigger_update_table_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION update_table_status_on_order_complete();