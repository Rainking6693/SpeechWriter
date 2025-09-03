-- Add user preferences and compliance tables for political/ethics mode
-- Migration created on 2025-09-03

-- User preferences for jurisdiction, ethics mode, and compliance settings
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Jurisdiction settings
    jurisdiction TEXT NOT NULL DEFAULT 'US' CHECK (jurisdiction IN ('US', 'EU', 'UK', 'CA', 'AU', 'OTHER')),
    jurisdiction_confirmed BOOLEAN DEFAULT FALSE,
    
    -- Ethics mode settings
    ethics_mode TEXT NOT NULL DEFAULT 'standard' CHECK (ethics_mode IN ('standard', 'academic', 'political', 'corporate')),
    academic_honesty_accepted BOOLEAN DEFAULT FALSE,
    academic_honesty_accepted_at TIMESTAMP,
    
    -- Content filtering preferences
    content_filtering_enabled BOOLEAN DEFAULT TRUE,
    political_content_warnings BOOLEAN DEFAULT TRUE,
    
    -- Export disclaimer preferences
    export_disclaimer_accepted BOOLEAN DEFAULT FALSE,
    export_disclaimer_version TEXT DEFAULT '1.0',
    
    -- Additional compliance settings (JSON)
    compliance_settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Content compliance flags for speeches
CREATE TABLE IF NOT EXISTS content_compliance_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    speech_id UUID NOT NULL, -- References speeches table
    
    -- Flag details
    flag_type TEXT NOT NULL, -- 'political', 'academic', 'ethical', 'legal'
    flag_reason TEXT NOT NULL,
    flag_description TEXT,
    
    -- Severity and status
    severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    
    -- User acknowledgment
    acknowledged_by_user_id UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    acknowledgment_note TEXT,
    
    -- Metadata (JSON)
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Export compliance records
CREATE TABLE IF NOT EXISTS export_compliance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    speech_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Export details
    export_type TEXT NOT NULL, -- 'pdf', 'docx', 'txt'
    jurisdiction TEXT NOT NULL CHECK (jurisdiction IN ('US', 'EU', 'UK', 'CA', 'AU', 'OTHER')),
    ethics_mode TEXT NOT NULL CHECK (ethics_mode IN ('standard', 'academic', 'political', 'corporate')),
    
    -- Compliance checks
    compliance_checks_completed BOOLEAN DEFAULT FALSE,
    disclaimer_included BOOLEAN DEFAULT FALSE,
    disclaimer_version TEXT,
    
    -- Flags acknowledged
    flags_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_flag_ids JSONB DEFAULT '[]',
    
    -- Export metadata (JSON)
    export_metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_jurisdiction ON user_preferences(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_user_preferences_ethics_mode ON user_preferences(ethics_mode);

CREATE INDEX IF NOT EXISTS idx_content_compliance_flags_speech_id ON content_compliance_flags(speech_id);
CREATE INDEX IF NOT EXISTS idx_content_compliance_flags_flag_type ON content_compliance_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_content_compliance_flags_status ON content_compliance_flags(status);
CREATE INDEX IF NOT EXISTS idx_content_compliance_flags_severity ON content_compliance_flags(severity);

CREATE INDEX IF NOT EXISTS idx_export_compliance_records_speech_id ON export_compliance_records(speech_id);
CREATE INDEX IF NOT EXISTS idx_export_compliance_records_user_id ON export_compliance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_export_compliance_records_created_at ON export_compliance_records(created_at);

-- Update trigger for user_preferences
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_preferences_updated_at();

-- Update trigger for content_compliance_flags
CREATE OR REPLACE FUNCTION update_content_compliance_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_content_compliance_flags_updated_at
    BEFORE UPDATE ON content_compliance_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_content_compliance_flags_updated_at();