-- Add Numeric Validation Constraints to Supabase Tables
-- This script adds CHECK constraints to prevent invalid numeric data at the database level
-- Execute this in Supabase SQL Editor

-- 1. Properties table constraints
ALTER TABLE public.properties 
ADD CONSTRAINT check_area_positive 
CHECK (area IS NULL OR (area >= 1 AND area <= 100000));

ALTER TABLE public.properties 
ADD CONSTRAINT check_bedrooms_valid 
CHECK (bedrooms IS NULL OR (bedrooms >= 0 AND bedrooms <= 50));

ALTER TABLE public.properties 
ADD CONSTRAINT check_bathrooms_valid 
CHECK (bathrooms IS NULL OR (bathrooms >= 0 AND bathrooms <= 50));

-- 2. Leases table constraints
ALTER TABLE public.leases 
ADD CONSTRAINT check_monthly_rent_positive 
CHECK (monthly_rent IS NULL OR (monthly_rent >= 0 AND monthly_rent <= 10000000));

ALTER TABLE public.leases 
ADD CONSTRAINT check_security_deposit_valid 
CHECK (security_deposit IS NULL OR (security_deposit >= 0 AND security_deposit <= 100000000));

ALTER TABLE public.leases 
ADD CONSTRAINT check_maintenance_charges_valid 
CHECK (maintenance_charges IS NULL OR (maintenance_charges >= 0 AND maintenance_charges <= 100000000));

-- 3. Payments table constraints
ALTER TABLE public.payments 
ADD CONSTRAINT check_payment_amount_positive 
CHECK (payment_amount IS NULL OR (payment_amount >= 0 AND payment_amount <= 100000000));

-- 4. User settings constraints
ALTER TABLE public.user_settings 
ADD CONSTRAINT check_property_count_valid 
CHECK (property_count IS NULL OR (property_count >= 0 AND property_count <= 1000));

-- 5. Subscription plans constraints
ALTER TABLE public.subscription_plans 
ADD CONSTRAINT check_price_non_negative 
CHECK (price IS NULL OR price >= 0);

ALTER TABLE public.subscription_plans 
ADD CONSTRAINT check_properties_limit_positive 
CHECK (properties_limit IS NULL OR properties_limit > 0);

ALTER TABLE public.subscription_plans 
ADD CONSTRAINT check_storage_limit_valid 
CHECK (storage_limit_mb IS NULL OR storage_limit_mb > 0 OR storage_limit_mb = -1);

-- 6. User subscriptions constraints
ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT check_properties_used_non_negative 
CHECK (properties_used IS NULL OR properties_used >= 0);

ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT check_storage_used_non_negative 
CHECK (storage_used_mb IS NULL OR storage_used_mb >= 0);

ALTER TABLE public.user_subscriptions 
ADD CONSTRAINT check_api_calls_used_non_negative 
CHECK (api_calls_used IS NULL OR api_calls_used >= 0);

-- 7. Property images constraints
ALTER TABLE public.property_images 
ADD CONSTRAINT check_image_size_positive 
CHECK (image_size IS NULL OR image_size > 0);

-- 8. Notifications constraints
ALTER TABLE public.notifications 
ADD CONSTRAINT check_priority_valid 
CHECK (priority IS NULL OR (priority >= 1 AND priority <= 5));

-- 9. Add comments for documentation
COMMENT ON CONSTRAINT check_area_positive ON public.properties IS 'Area must be between 1 and 100,000 sq ft';
COMMENT ON CONSTRAINT check_bedrooms_valid ON public.properties IS 'Bedrooms must be between 0 and 50';
COMMENT ON CONSTRAINT check_bathrooms_valid ON public.properties IS 'Bathrooms must be between 0 and 50';
COMMENT ON CONSTRAINT check_monthly_rent_positive ON public.leases IS 'Monthly rent must be between 0 and ₹10,000,000';
COMMENT ON CONSTRAINT check_security_deposit_valid ON public.leases IS 'Security deposit must be between 0 and ₹100,000,000';
COMMENT ON CONSTRAINT check_maintenance_charges_valid ON public.leases IS 'Maintenance charges must be between 0 and ₹100,000,000';
COMMENT ON CONSTRAINT check_payment_amount_positive ON public.payments IS 'Payment amount must be between 0 and ₹100,000,000';
COMMENT ON CONSTRAINT check_property_count_valid ON public.user_settings IS 'Property count must be between 0 and 1,000';

-- 10. Verify constraints were added
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.properties'::regclass 
   OR conrelid = 'public.leases'::regclass 
   OR conrelid = 'public.payments'::regclass
   OR conrelid = 'public.user_settings'::regclass
   OR conrelid = 'public.subscription_plans'::regclass
   OR conrelid = 'public.user_subscriptions'::regclass
   OR conrelid = 'public.property_images'::regclass
   OR conrelid = 'public.notifications'::regclass
ORDER BY conrelid, conname;
