-- Adicionar campo de onboarding na restaurant_settings
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;