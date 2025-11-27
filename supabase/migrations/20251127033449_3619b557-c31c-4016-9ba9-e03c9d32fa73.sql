-- Adicionar flag para fluxo completo no tablet
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS tablet_full_flow BOOLEAN DEFAULT false;

-- Inserir novo evento de áudio para pedido pronto no totem
INSERT INTO audio_alerts (name, trigger_event, audio_url, is_active, description)
VALUES ('Pedido Totem Pronto', 'order_ready_totem', '/audios/pedidopronto.mp3', true, 'Notificação quando pedido do totem está pronto')
ON CONFLICT DO NOTHING;