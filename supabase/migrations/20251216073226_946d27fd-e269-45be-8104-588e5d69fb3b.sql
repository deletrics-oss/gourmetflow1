-- Adicionar campos para venda por peso em menu_items
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS sale_type VARCHAR(10) DEFAULT 'unit',
ADD COLUMN IF NOT EXISTS price_per_kg DECIMAL(10,2);

-- Comentários explicativos
COMMENT ON COLUMN menu_items.sale_type IS 'Tipo de venda: unit (unidade) ou weight (peso)';
COMMENT ON COLUMN menu_items.price_per_kg IS 'Preço por quilograma para produtos vendidos por peso';