-- Settings Page Database Tables
-- This script creates the missing tables needed for the Settings Page functionality

-- 1. User Settings/Preferences Table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Notification Preferences
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT true,
    payment_reminders BOOLEAN DEFAULT true,
    lease_expiry_alerts BOOLEAN DEFAULT true,
    maintenance_alerts BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    
    -- Timing Settings
    reminder_timing VARCHAR(20) DEFAULT '3days' CHECK (reminder_timing IN ('immediate', '1day', '3days', '1week')),
    quiet_hours_enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    
    -- Profile Extensions
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    language VARCHAR(10) DEFAULT 'en',
    property_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- 2. Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    price INTEGER NOT NULL DEFAULT 0, -- in paise/cents
    properties_limit INTEGER NOT NULL DEFAULT 3,
    storage_limit_mb INTEGER NOT NULL DEFAULT 100,
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- 3. User Subscriptions Table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    
    -- Subscription Details
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
    started_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    cancelled_at TIMESTAMP WITHOUT TIME ZONE,
    
    -- Usage Tracking
    properties_used INTEGER DEFAULT 0,
    storage_used_mb INTEGER DEFAULT 0,
    api_calls_used INTEGER DEFAULT 0,
    
    -- Billing
    last_billed_at TIMESTAMP WITHOUT TIME ZONE,
    next_billing_at TIMESTAMP WITHOUT TIME ZONE,
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- 4. Billing History Table
CREATE TABLE IF NOT EXISTS public.billing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
    
    -- Invoice Details
    invoice_number VARCHAR(50) UNIQUE,
    amount INTEGER NOT NULL, -- in paise/cents
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    
    -- Billing Period
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    
    -- Payment Details
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    paid_at TIMESTAMP WITHOUT TIME ZONE,
    
    -- File Storage
    invoice_url TEXT,
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- 5. Login Activity Table
CREATE TABLE IF NOT EXISTS public.login_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Session Details
    session_id VARCHAR(255),
    device_info TEXT,
    browser VARCHAR(100),
    os VARCHAR(100),
    
    -- Location & Network
    ip_address INET,
    country VARCHAR(100),
    city VARCHAR(100),
    user_agent TEXT,
    
    -- Activity Details
    login_type VARCHAR(20) DEFAULT 'password' CHECK (login_type IN ('password', 'oauth', 'magic_link', 'sso')),
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'blocked')),
    failure_reason TEXT,
    
    -- Timestamps
    login_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    logout_at TIMESTAMP WITHOUT TIME ZONE,
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- 6. User Data Export Requests Table
CREATE TABLE IF NOT EXISTS public.data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Export Details
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    export_type VARCHAR(50) DEFAULT 'full' CHECK (export_type IN ('full', 'profile', 'properties', 'payments', 'documents')),
    
    -- File Details
    file_url TEXT,
    file_size_bytes BIGINT,
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    
    -- Processing
    started_at TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    error_message TEXT,
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_history_user_id ON public.billing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON public.billing_history(status);
CREATE INDEX IF NOT EXISTS idx_login_activity_user_id ON public.login_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_login_activity_login_at ON public.login_activity(login_at);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON public.data_export_requests(user_id);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, price, properties_limit, storage_limit_mb, features) VALUES
('Starter', 0, 3, 100, '["Basic property management", "Payment tracking", "Document storage (100MB)"]'),
('Professional', 99900, 15, 1024, '["Advanced analytics", "AI reconciliation", "Priority support", "Document storage (1GB)"]'),
('Enterprise', 249900, 50, -1, '["White-label solution", "API access", "Custom integrations", "Unlimited storage"]')
ON CONFLICT (name) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_history_updated_at BEFORE UPDATE ON public.billing_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_export_requests_updated_at BEFORE UPDATE ON public.data_export_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

-- User settings policies
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own billing history" ON public.billing_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own login activity" ON public.login_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own export requests" ON public.data_export_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own export requests" ON public.data_export_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.subscription_plans TO authenticated;
GRANT ALL ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.billing_history TO authenticated;
GRANT ALL ON public.login_activity TO authenticated;
GRANT ALL ON public.data_export_requests TO authenticated;
