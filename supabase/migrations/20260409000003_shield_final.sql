-- GOURMETFLOW: BLINDAGEM MULTI-TENANT ABSOLUTA (EDIÇÃO V3 - GOD MODE)
-- Objetivo: Garantir isolamento total, integridade de dados e conformidade SaaS.
-- Correções: Ajuste de nomenclatura de colunas e inclusão de tabelas órfãs.

BEGIN;

-- 1. INJEÇÃO DE RESTAURANT_ID EM TABELAS ÓRFÃS (LEGADO E NOVAS)
ALTER TABLE IF EXISTS coupons ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS loyalty_transactions ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS comandas_fixas ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS audio_alerts ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS item_variations ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS order_items ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS order_status_history ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS monitor_settings ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS user_permissions ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS whatsapp_appointments ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS whatsapp_broadcast_contacts ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

-- 2. ÍNDICES DE PERFORMANCE E SEGURANÇA (ESTANQUEIDADE)
CREATE INDEX IF NOT EXISTS idx_coupons_restaurant ON coupons(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_trans_restaurant ON loyalty_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_comandas_fixas_restaurant ON comandas_fixas(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_item_variations_restaurant ON item_variations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_restaurant ON order_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_restaurant ON order_status_history(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_monitor_settings_restaurant ON monitor_settings(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_restaurant ON user_permissions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_appointments_restaurant ON whatsapp_appointments(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcast_contacts_restaurant ON whatsapp_broadcast_contacts(restaurant_id);

-- 3. UNICIDADE POR TENANT (WHATSAPP SDR) - CORRIGIDO
ALTER TABLE IF EXISTS whatsapp_devices 
DROP CONSTRAINT IF EXISTS whatsapp_devices_phone_key,
DROP CONSTRAINT IF EXISTS whatsapp_devices_phone_restaurant_key;

ALTER TABLE IF EXISTS whatsapp_devices
ADD CONSTRAINT whatsapp_devices_phone_restaurant_key UNIQUE (phone_number, restaurant_id);

-- 4. MIGRAÇÃO DE DADOS RETROATIVA (SEGURANÇA FINANCEIRA E OPERACIONAL)

-- Vincular transações de fidelidade órfãs
UPDATE loyalty_transactions lt
SET restaurant_id = c.restaurant_id
FROM customers c
WHERE lt.customer_id = c.id
AND lt.restaurant_id IS NULL;

-- Vincular variações de itens aos seus respectivos restaurantes
UPDATE item_variations iv
SET restaurant_id = mi.restaurant_id
FROM menu_items mi
WHERE iv.menu_item_id = mi.id
AND iv.restaurant_id IS NULL;

-- Vincular itens de pedido aos seus respectivos restaurantes
UPDATE order_items oi
SET restaurant_id = o.restaurant_id
FROM orders o
WHERE oi.order_id = o.id
AND oi.restaurant_id IS NULL;

-- Vincular histórico de status aos seus respectivos restaurantes
UPDATE order_status_history osh
SET restaurant_id = o.restaurant_id
FROM orders o
WHERE osh.order_id = o.id;

-- 5. REGRAS DE RLS (ROW LEVEL SECURITY) - ATIVAÇÃO GRADUAL
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

COMMIT;
