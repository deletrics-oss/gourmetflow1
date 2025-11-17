-- Migration: Auto-create restaurant and 30-day trial on user signup

-- Function to create restaurant and trial for new user
CREATE OR REPLACE FUNCTION public.create_restaurant_and_trial()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_restaurant_id UUID;
  v_restaurant_slug TEXT;
BEGIN
  -- Generate a unique slug based on user email
  v_restaurant_slug := 'rest-' || substring(md5(NEW.id::text) from 1 for 8);
  
  -- Create restaurant for this user
  INSERT INTO public.restaurants (
    name,
    slug,
    email,
    owner_user_id,
    is_active
  ) VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Meu Restaurante'),
    v_restaurant_slug,
    NEW.email,
    NEW.id,
    true
  ) RETURNING id INTO v_restaurant_id;
  
  -- Associate user with restaurant as owner
  INSERT INTO public.user_restaurants (
    user_id,
    restaurant_id,
    role,
    is_active
  ) VALUES (
    NEW.id,
    v_restaurant_id,
    'owner',
    true
  );
  
  -- Create 30-day trial subscription (will be created by existing trigger)
  -- The trigger 'initialize_user_subscription' already handles this
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_restaurant ON auth.users;

-- Create trigger for restaurant creation (runs AFTER the profile/subscription trigger)
CREATE TRIGGER on_auth_user_created_restaurant
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_restaurant_and_trial();

-- Update existing trial subscription trigger to set proper duration
CREATE OR REPLACE FUNCTION public.initialize_user_subscription()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create subscription with 30-day trial
  INSERT INTO public.subscriptions (
    user_id,
    plan_type,
    status,
    trial_end
  ) VALUES (
    NEW.id,
    'free',
    'trial',
    now() + interval '30 days'
  );
  
  RETURN NEW;
END;
$$;