-- Create action_logs table for tracking user actions
CREATE TABLE IF NOT EXISTS action_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Actor information
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_type VARCHAR(20) DEFAULT 'user' CHECK (actor_type IN ('user', 'system', 'ai')),
    
    -- Action details
    action_type VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    severity_level VARCHAR(20) DEFAULT 'info' CHECK (severity_level IN ('info', 'warning', 'error', 'critical')),
    
    -- Context information
    page_context VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Target information
    target_table VARCHAR(100),
    target_record_id UUID,
    
    -- State tracking
    previous_state JSONB,
    current_state JSONB,
    metadata JSONB,
    
    -- Additional context
    description TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_logs_actor_id ON action_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_action_type ON action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_action_logs_category ON action_logs(category);
CREATE INDEX IF NOT EXISTS idx_action_logs_severity ON action_logs(severity_level);
CREATE INDEX IF NOT EXISTS idx_action_logs_target ON action_logs(target_table, target_record_id);

-- Enable RLS
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin users can view all action logs" ON action_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "System can insert action logs" ON action_logs
    FOR INSERT WITH CHECK (true);

-- Insert some sample data for testing
INSERT INTO action_logs (
    actor_type, 
    action_type, 
    category, 
    severity_level, 
    page_context, 
    description,
    metadata
) VALUES 
(
    'system', 
    'table_created', 
    'database', 
    'info', 
    '/admin/dashboard', 
    'Action logs table created successfully',
    '{"table_name": "action_logs", "migration": "2025-09-10_create_action_logs_table"}'
),
(
    'system', 
    'module_loaded', 
    'admin', 
    'info', 
    '/admin/dashboard', 
    'Action logs panel initialized',
    '{"component": "ActionLogsPanel", "status": "ready"}'
);

-- Create a function to log actions automatically
CREATE OR REPLACE FUNCTION log_action(
    p_actor_id UUID DEFAULT NULL,
    p_actor_type VARCHAR DEFAULT 'user',
    p_action_type VARCHAR DEFAULT NULL,
    p_category VARCHAR DEFAULT NULL,
    p_severity_level VARCHAR DEFAULT 'info',
    p_page_context VARCHAR DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_target_table VARCHAR DEFAULT NULL,
    p_target_record_id UUID DEFAULT NULL,
    p_previous_state JSONB DEFAULT NULL,
    p_current_state JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO action_logs (
        actor_id,
        actor_type,
        action_type,
        category,
        severity_level,
        page_context,
        ip_address,
        target_table,
        target_record_id,
        previous_state,
        current_state,
        metadata,
        description
    ) VALUES (
        COALESCE(p_actor_id, auth.uid()),
        p_actor_type,
        p_action_type,
        p_category,
        p_severity_level,
        p_page_context,
        p_ip_address,
        p_target_table,
        p_target_record_id,
        p_previous_state,
        p_current_state,
        p_metadata,
        p_description
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
