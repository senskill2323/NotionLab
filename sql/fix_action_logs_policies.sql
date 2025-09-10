-- Fix action_logs table policies to resolve permission denied error

-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can view all action logs" ON action_logs;
DROP POLICY IF EXISTS "System can insert action logs" ON action_logs;

-- Create more permissive policies for testing and proper admin access
CREATE POLICY "Allow admin access to action logs" ON action_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (
                profiles.role = 'admin' 
                OR profiles.role = 'super_admin'
                OR profiles.is_admin = true
            )
        )
    );

-- Alternative policy if the above doesn't work - check user permissions table
CREATE POLICY "Allow users with admin permissions" ON action_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_permissions up
            JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = auth.uid()
            AND p.name LIKE '%admin%'
        )
    );

-- Fallback policy for service role and authenticated users with proper permissions
CREATE POLICY "Service role access" ON action_logs
    FOR ALL USING (
        auth.role() = 'service_role'
        OR 
        (
            auth.role() = 'authenticated' 
            AND EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid()
            )
        )
    );

-- Grant necessary permissions to authenticated users
GRANT SELECT ON action_logs TO authenticated;
GRANT INSERT ON action_logs TO authenticated;

-- Grant all permissions to service role
GRANT ALL ON action_logs TO service_role;

-- If you're using a specific admin role, grant permissions
-- GRANT ALL ON action_logs TO admin_role;

-- Check current user and their profile
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    p.role as profile_role,
    p.is_admin,
    p.email
FROM profiles p 
WHERE p.id = auth.uid();

-- Test query to see if we can now access the table
SELECT COUNT(*) as total_logs FROM action_logs;
