    -- Create property_images table
    CREATE TABLE IF NOT EXISTS property_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        image_name TEXT NOT NULL,
        image_size INTEGER,
        image_type TEXT,
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES auth.users(id)
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
    CREATE INDEX IF NOT EXISTS idx_property_images_is_primary ON property_images(property_id, is_primary);



    -- Policy to allow property owners to view their property images
    CREATE POLICY "Users can view their own property images" ON property_images
        FOR SELECT USING (
            property_id IN (
                SELECT id FROM properties WHERE owner_id = auth.uid()
            )
        );

    -- Policy to allow property owners to insert images for their properties
    CREATE POLICY "Users can insert images for their own properties" ON property_images
        FOR INSERT WITH CHECK (
            property_id IN (
                SELECT id FROM properties WHERE owner_id = auth.uid()
            )
        );

    -- Policy to allow property owners to update their property images
    CREATE POLICY "Users can update their own property images" ON property_images
        FOR UPDATE USING (
            property_id IN (
                SELECT id FROM properties WHERE owner_id = auth.uid()
            )
        );

    -- Policy to allow property owners to delete their property images
    CREATE POLICY "Users can delete their own property images" ON property_images
        FOR DELETE USING (
            property_id IN (
                SELECT id FROM properties WHERE owner_id = auth.uid()
            )
        );

    -- Function to ensure only one primary image per property
    CREATE OR REPLACE FUNCTION ensure_single_primary_image()
    RETURNS TRIGGER AS $$
    BEGIN
        -- If setting an image as primary, unset all other primary images for this property
        IF NEW.is_primary = TRUE THEN
            UPDATE property_images 
            SET is_primary = FALSE 
            WHERE property_id = NEW.property_id 
            AND id != NEW.id;
        END IF;
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create trigger to ensure only one primary image per property
    CREATE TRIGGER trigger_ensure_single_primary_image
        BEFORE INSERT OR UPDATE ON property_images
        FOR EACH ROW
        EXECUTE FUNCTION ensure_single_primary_image();

    -- Function to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create trigger to update updated_at timestamp
    CREATE TRIGGER trigger_update_property_images_updated_at
        BEFORE UPDATE ON property_images
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
