-- Adicionar campos de personalização visual para telas de cliente
ALTER TABLE public.restaurant_settings 
ADD COLUMN IF NOT EXISTS background_url text,
ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#f8fafc',
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#e53e3e',
ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#f59e0b',
ADD COLUMN IF NOT EXISTS totem_welcome_message text DEFAULT 'Bem-vindo! Faça seu pedido',
ADD COLUMN IF NOT EXISTS menu_header_message text DEFAULT 'O que você deseja?',
ADD COLUMN IF NOT EXISTS customer_theme text DEFAULT 'modern',
ADD COLUMN IF NOT EXISTS show_logo_on_menu boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS menu_font text DEFAULT 'default';