-- Notifications Table for Lease Expiry, Rent Pending, and Overdue Reminders
-- This script creates the notifications table and related functionality

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Notification Details
    type VARCHAR(50) NOT NULL CHECK (type IN ('lease_expiry', 'rent_pending', 'overdue_reminder', 'lease_expired')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Related Entity References
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Notification Status
    is_read BOOLEAN DEFAULT false,
    is_cleared BOOLEAN DEFAULT false,
    
    -- Notification Data (for dynamic content)
    notification_data JSONB DEFAULT '{}'::jsonb,
    
    -- Timing
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    read_at TIMESTAMP WITHOUT TIME ZONE,
    cleared_at TIMESTAMP WITHOUT TIME ZONE,
    
    -- Daily generation tracking (to prevent duplicate notifications)
    generation_date DATE DEFAULT CURRENT_DATE,
    
    -- Priority for sorting
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_cleared ON public.notifications(is_cleared);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_generation_date ON public.notifications(generation_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, is_cleared) WHERE is_read = false AND is_cleared = false;

-- 3. Create RLS policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

-- Policy: Users can insert their own notifications (for system-generated ones)
CREATE POLICY "Users can insert own notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read, clear)
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- 4. Create function to generate daily notifications
CREATE OR REPLACE FUNCTION generate_daily_notifications()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    lease_record RECORD;
    payment_record RECORD;
    current_date_val DATE := CURRENT_DATE;
    lease_expiry_date DATE;
    days_until_expiry INTEGER;
    last_payment_date DATE;
    days_since_last_payment INTEGER;
    notification_exists BOOLEAN;
BEGIN
    -- Loop through all active users
    FOR user_record IN 
        SELECT DISTINCT p.owner_id as user_id
        FROM public.properties p
        WHERE p.owner_id IS NOT NULL
        AND p.active = 'Y'
    LOOP
        -- Check for lease expiry notifications (15 days before expiry)
        FOR lease_record IN
            SELECT l.id, l.end_date, l.monthly_rent, l.is_active,
                   p.name as property_name, p.id as property_id,
                   t.name as tenant_name, t.id as tenant_id
            FROM public.leases l
            JOIN public.properties p ON l.property_id = p.id
            LEFT JOIN public.tenants t ON l.tenant_id = t.id
            WHERE p.owner_id = user_record.user_id
            AND l.is_active = true
            AND l.end_date IS NOT NULL
        LOOP
            lease_expiry_date := lease_record.end_date;
            days_until_expiry := lease_expiry_date - current_date_val;
            
            -- Generate notification for lease expiry (15 days before)
            IF days_until_expiry <= 15 AND days_until_expiry >= 0 THEN
                -- Check if notification already exists for today
                SELECT EXISTS(
                    SELECT 1 FROM public.notifications 
                    WHERE user_id = user_record.user_id
                    AND type = 'lease_expiry'
                    AND lease_id = lease_record.id
                    AND generation_date = current_date_val
                    AND is_cleared = false
                ) INTO notification_exists;
                
                IF NOT notification_exists THEN
                    INSERT INTO public.notifications (
                        user_id, type, title, message, property_id, lease_id, tenant_id,
                        notification_data, priority
                    ) VALUES (
                        user_record.user_id,
                        'lease_expiry',
                        'Lease Expiry Reminder',
                        'Lease for ' || lease_record.property_name || 
                        ' expires in ' || days_until_expiry || ' days',
                        lease_record.property_id,
                        lease_record.id,
                        lease_record.tenant_id,
                        jsonb_build_object(
                            'days_until_expiry', days_until_expiry,
                            'property_name', lease_record.property_name,
                            'tenant_name', lease_record.tenant_name,
                            'expiry_date', lease_expiry_date
                        ),
                        CASE 
                            WHEN days_until_expiry <= 3 THEN 5
                            WHEN days_until_expiry <= 7 THEN 4
                            WHEN days_until_expiry <= 15 THEN 3
                            ELSE 2
                        END
                    );
                END IF;
            END IF;
            
            -- Generate notification for expired lease
            IF days_until_expiry < 0 THEN
                -- Check if notification already exists for today
                SELECT EXISTS(
                    SELECT 1 FROM public.notifications 
                    WHERE user_id = user_record.user_id
                    AND type = 'lease_expired'
                    AND lease_id = lease_record.id
                    AND generation_date = current_date_val
                    AND is_cleared = false
                ) INTO notification_exists;
                
                IF NOT notification_exists THEN
                    INSERT INTO public.notifications (
                        user_id, type, title, message, property_id, lease_id, tenant_id,
                        notification_data, priority
                    ) VALUES (
                        user_record.user_id,
                        'lease_expired',
                        'Lease Expired',
                        'Lease for ' || lease_record.property_name || 
                        ' has expired ' || ABS(days_until_expiry) || ' days ago',
                        lease_record.property_id,
                        lease_record.id,
                        lease_record.tenant_id,
                        jsonb_build_object(
                            'days_overdue', ABS(days_until_expiry),
                            'property_name', lease_record.property_name,
                            'tenant_name', lease_record.tenant_name,
                            'expiry_date', lease_expiry_date
                        ),
                        5
                    );
                END IF;
            END IF;
        END LOOP;
        
        -- Check for rent pending and overdue notifications
        FOR lease_record IN
            SELECT l.id, l.monthly_rent, l.is_active,
                   p.name as property_name, p.id as property_id,
                   t.name as tenant_name, t.id as tenant_id
            FROM public.leases l
            JOIN public.properties p ON l.property_id = p.id
            LEFT JOIN public.tenants t ON l.tenant_id = t.id
            WHERE p.owner_id = user_record.user_id
            AND l.is_active = true
        LOOP
            -- Get the last payment for this lease
            SELECT MAX(payment_date) INTO last_payment_date
            FROM public.payments
            WHERE lease_id = lease_record.id
            AND status = 'completed';
            
            -- If no payment found, check if lease started more than 30 days ago
            IF last_payment_date IS NULL THEN
                SELECT l.start_date INTO last_payment_date
                FROM public.leases l
                WHERE l.id = lease_record.id;
            END IF;
            
            days_since_last_payment := current_date_val - last_payment_date;
            
            -- Generate rent pending notification (after 30 days without payment)
            IF days_since_last_payment >= 30 AND days_since_last_payment < 60 THEN
                -- Check if notification already exists for today
                SELECT EXISTS(
                    SELECT 1 FROM public.notifications 
                    WHERE user_id = user_record.user_id
                    AND type = 'rent_pending'
                    AND lease_id = lease_record.id
                    AND generation_date = current_date_val
                    AND is_cleared = false
                ) INTO notification_exists;
                
                IF NOT notification_exists THEN
                    INSERT INTO public.notifications (
                        user_id, type, title, message, property_id, lease_id, tenant_id,
                        notification_data, priority
                    ) VALUES (
                        user_record.user_id,
                        'rent_pending',
                        'Rent Payment Pending',
                        'Rent payment for ' || lease_record.property_name || 
                        ' is pending for ' || days_since_last_payment || ' days',
                        lease_record.property_id,
                        lease_record.id,
                        lease_record.tenant_id,
                        jsonb_build_object(
                            'days_pending', days_since_last_payment,
                            'property_name', lease_record.property_name,
                            'tenant_name', lease_record.tenant_name,
                            'amount', lease_record.monthly_rent
                        ),
                        3
                    );
                END IF;
            END IF;
            
            -- Generate overdue notification (after 60 days without payment)
            IF days_since_last_payment >= 60 THEN
                -- Check if notification already exists for today
                SELECT EXISTS(
                    SELECT 1 FROM public.notifications 
                    WHERE user_id = user_record.user_id
                    AND type = 'overdue_reminder'
                    AND lease_id = lease_record.id
                    AND generation_date = current_date_val
                    AND is_cleared = false
                ) INTO notification_exists;
                
                IF NOT notification_exists THEN
                    INSERT INTO public.notifications (
                        user_id, type, title, message, property_id, lease_id, tenant_id,
                        notification_data, priority
                    ) VALUES (
                        user_record.user_id,
                        'overdue_reminder',
                        'Rent Overdue',
                        'Rent payment for ' || lease_record.property_name || 
                        ' is overdue by ' || days_since_last_payment || ' days',
                        lease_record.property_id,
                        lease_record.id,
                        lease_record.tenant_id,
                        jsonb_build_object(
                            'days_overdue', days_since_last_payment,
                            'property_name', lease_record.property_name,
                            'tenant_name', lease_record.tenant_name,
                            'amount', lease_record.monthly_rent
                        ),
                        5
                    );
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM public.notifications 
    WHERE created_at < CURRENT_DATE - INTERVAL '30 days'
    AND is_cleared = true;
END;
$$ LANGUAGE plpgsql;

-- 6. Create function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.notifications
        WHERE user_id = user_uuid
        AND is_read = false
        AND is_cleared = false
    );
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE id = notification_uuid
    AND user_id = user_uuid
    AND is_cleared = false;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to clear notification
CREATE OR REPLACE FUNCTION clear_notification(notification_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications
    SET is_cleared = true, cleared_at = now()
    WHERE id = notification_uuid
    AND user_id = user_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to clear all notifications for a user
CREATE OR REPLACE FUNCTION clear_all_notifications(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    cleared_count INTEGER;
BEGIN
    UPDATE public.notifications
    SET is_cleared = true, cleared_at = now()
    WHERE user_id = user_uuid
    AND is_cleared = false;
    
    GET DIAGNOSTICS cleared_count = ROW_COUNT;
    RETURN cleared_count;
END;
$$ LANGUAGE plpgsql;
