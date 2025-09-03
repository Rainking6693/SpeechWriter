-- Row-Level Security (RLS) Setup for SpeechWriter
-- This ensures users can only access their own data

-- Enable RLS on all user-specific tables
ALTER TABLE speeches ENABLE ROW LEVEL SECURITY;
ALTER TABLE speech_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE style_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE speech_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggested_edits ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user ID from JWT context
-- This would be set by the application layer
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS uuid AS $$
BEGIN
  -- In a real application, this would extract the user ID from the JWT
  -- For now, we'll use a session variable that the app layer sets
  RETURN COALESCE(
    NULLIF(current_setting('app.current_user_id', true), '')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Speeches RLS Policies
CREATE POLICY speeches_user_isolation ON speeches
  FOR ALL
  USING (user_id = current_user_id());

-- Speech sections inherit access from their parent speech
CREATE POLICY speech_sections_user_isolation ON speech_sections
  FOR ALL
  USING (
    speech_id IN (
      SELECT id FROM speeches WHERE user_id = current_user_id()
    )
  );

-- Personas RLS Policies
CREATE POLICY personas_user_isolation ON personas
  FOR ALL
  USING (user_id = current_user_id());

-- Style cards inherit access from their parent persona
CREATE POLICY style_cards_user_isolation ON style_cards
  FOR ALL
  USING (
    persona_id IN (
      SELECT id FROM personas WHERE user_id = current_user_id()
    )
  );

-- Stories RLS Policies
CREATE POLICY stories_user_isolation ON stories
  FOR ALL
  USING (user_id = current_user_id());

-- Analytics and observability RLS policies
CREATE POLICY speech_analytics_user_isolation ON speech_analytics
  FOR ALL
  USING (user_id = current_user_id());

CREATE POLICY model_runs_user_isolation ON model_runs
  FOR ALL
  USING (
    user_id = current_user_id() OR
    -- Allow access to runs for speeches the user owns
    speech_id IN (
      SELECT id FROM speeches WHERE user_id = current_user_id()
    )
  );

-- Model metrics inherit from model runs
CREATE POLICY model_metrics_user_isolation ON model_metrics
  FOR ALL
  USING (
    model_run_id IN (
      SELECT id FROM model_runs WHERE 
        user_id = current_user_id() OR
        speech_id IN (
          SELECT id FROM speeches WHERE user_id = current_user_id()
        )
    )
  );

-- Telemetry events for the current user only
CREATE POLICY telemetry_events_user_isolation ON telemetry_events
  FOR ALL
  USING (user_id = current_user_id());

-- Quality issues and export blocks
CREATE POLICY quality_issues_user_isolation ON quality_issues
  FOR ALL
  USING (user_id = current_user_id());

CREATE POLICY export_blocks_user_isolation ON export_blocks
  FOR ALL
  USING (user_id = current_user_id());

-- Sharing and collaboration RLS policies
CREATE POLICY share_links_owner_access ON share_links
  FOR ALL
  USING (
    created_by = current_user_id() OR
    -- Allow read access to shared speeches if user has permission
    (
      speech_id IN (
        SELECT speech_id FROM share_links sl
        WHERE sl.expires_at > NOW()
        AND sl.is_active = true
        -- Additional permission checks would go here
      )
    )
  );

-- Comments: users can see comments on speeches they own or have been shared with
CREATE POLICY comments_access ON comments
  FOR ALL
  USING (
    user_id = current_user_id() OR
    speech_id IN (
      SELECT id FROM speeches WHERE user_id = current_user_id()
    ) OR
    speech_id IN (
      SELECT speech_id FROM share_links sl
      WHERE sl.expires_at > NOW()
      AND sl.is_active = true
      AND sl.permissions::jsonb ? 'comment'
    )
  );

-- Suggested edits: similar to comments
CREATE POLICY suggested_edits_access ON suggested_edits
  FOR ALL
  USING (
    suggested_by = current_user_id() OR
    speech_id IN (
      SELECT id FROM speeches WHERE user_id = current_user_id()
    ) OR
    speech_id IN (
      SELECT speech_id FROM share_links sl
      WHERE sl.expires_at > NOW()
      AND sl.is_active = true
      AND sl.permissions::jsonb ? 'suggest'
    )
  );

-- Admin bypass policies (for system operations)
-- Create a special role for admin operations
CREATE ROLE speechwriter_admin;

-- Admin users can bypass RLS for system operations
CREATE POLICY admin_bypass_speeches ON speeches
  FOR ALL
  TO speechwriter_admin
  USING (true);

CREATE POLICY admin_bypass_analytics ON speech_analytics
  FOR ALL  
  TO speechwriter_admin
  USING (true);

CREATE POLICY admin_bypass_model_runs ON model_runs
  FOR ALL
  TO speechwriter_admin
  USING (true);

CREATE POLICY admin_bypass_telemetry ON telemetry_events
  FOR ALL
  TO speechwriter_admin
  USING (true);

-- Function to temporarily disable RLS for admin operations
CREATE OR REPLACE FUNCTION disable_rls_for_admin()
RETURNS void AS $$
BEGIN
  -- This should only be called by admin functions
  IF current_user = 'speechwriter_admin' THEN
    SET row_security = off;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to re-enable RLS
CREATE OR REPLACE FUNCTION enable_rls()
RETURNS void AS $$
BEGIN
  SET row_security = on;
END;
$$ LANGUAGE plpgsql;

-- Create indexes to support RLS policies efficiently
CREATE INDEX IF NOT EXISTS idx_speeches_user_id ON speeches(user_id);
CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_speech_analytics_user_id ON speech_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_model_runs_user_id ON model_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_model_runs_speech_id ON model_runs(speech_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_id ON telemetry_events(user_id);
CREATE INDEX IF NOT EXISTS idx_quality_issues_user_id ON quality_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_share_links_created_by ON share_links(created_by);
CREATE INDEX IF NOT EXISTS idx_share_links_active ON share_links(speech_id, is_active, expires_at);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO speechwriter_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO speechwriter_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO speechwriter_admin;

-- Comments for documentation
COMMENT ON FUNCTION current_user_id() IS 'Returns the current user ID from application context';
COMMENT ON POLICY speeches_user_isolation ON speeches IS 'Users can only access their own speeches';
COMMENT ON POLICY speech_analytics_user_isolation ON speech_analytics IS 'Analytics data isolated per user';
COMMENT ON POLICY admin_bypass_speeches ON speeches IS 'Admin role can access all speeches for system operations';