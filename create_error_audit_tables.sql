-- Create error_logs table for error tracking
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    error_type VARCHAR(50) NOT NULL CHECK (error_type IN ('react_error', 'javascript_error', 'api_error', 'unhandled_promise_rejection')),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    component_name VARCHAR(255),
    url TEXT,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    extra_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_events table for audit trail
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'property_created', 'property_updated', 'property_deleted',
        'lease_created', 'lease_updated', 'lease_ended',
        'payment_received', 'payment_updated', 'payment_deleted'
    )),
    entity_id UUID NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    changes JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON public.error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);

CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON public.audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity_id ON public.audit_events(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_type ON public.audit_events(type);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON public.audit_events(timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for error_logs
CREATE POLICY "Users can view their own error logs" ON public.error_logs
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "System can insert error logs" ON public.error_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update error logs" ON public.error_logs
    FOR UPDATE USING (true);

-- Create RLS policies for audit_events
CREATE POLICY "Users can view their own audit events" ON public.audit_events
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "System can insert audit events" ON public.audit_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update audit events" ON public.audit_events
    FOR UPDATE USING (true);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at columns if they don't exist
ALTER TABLE public.error_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_error_logs_updated_at ON public.error_logs;
CREATE TRIGGER update_error_logs_updated_at
    BEFORE UPDATE ON public.error_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_audit_events_updated_at ON public.audit_events;
CREATE TRIGGER update_audit_events_updated_at
    BEFORE UPDATE ON public.audit_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.error_logs TO authenticated;
GRANT ALL ON public.audit_events TO authenticated;
GRANT ALL ON public.error_logs TO anon;
GRANT ALL ON public.audit_events TO anon;

-- Add comments for documentation
COMMENT ON TABLE public.error_logs IS 'Stores application errors and exceptions for monitoring and debugging';
COMMENT ON TABLE public.audit_events IS 'Stores audit trail events for tracking user actions and system changes';

COMMENT ON COLUMN public.error_logs.error_type IS 'Type of error: react_error, javascript_error, api_error, unhandled_promise_rejection';
COMMENT ON COLUMN public.error_logs.resolved IS 'Whether the error has been resolved or addressed';
COMMENT ON COLUMN public.error_logs.extra_info IS 'Additional context information in JSON format';

COMMENT ON COLUMN public.audit_events.type IS 'Type of audit event: property_*, lease_*, payment_*';
COMMENT ON COLUMN public.audit_events.entity_id IS 'ID of the entity that was affected';
COMMENT ON COLUMN public.audit_events.changes IS 'Before/after values in JSON format';
