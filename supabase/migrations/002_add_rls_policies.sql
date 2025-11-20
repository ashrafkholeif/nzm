-- Add RLS policies for all tables

-- Organizations: Allow authenticated users to view organizations
CREATE POLICY "Users can view organizations"
ON organizations FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users: Users can view their own record and org members
-- CRITICAL FIX: Avoid infinite recursion by using a security definer function
-- First, create helper function to get user's org_id
CREATE OR REPLACE FUNCTION auth.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$;

-- Now use the function instead of querying users table directly
CREATE POLICY "Users can view themselves and org members"
ON users FOR SELECT
USING (
  id = auth.uid() OR 
  organization_id = auth.get_user_organization_id()
);

CREATE POLICY "Users can update themselves"
ON users FOR UPDATE
USING (id = auth.uid());

-- Diagnostic Sessions: Users can manage their own sessions and view org sessions
CREATE POLICY "Users can create own sessions"
ON diagnostic_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own sessions"
ON diagnostic_sessions FOR SELECT
USING (user_id = auth.uid() OR organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Users can update own sessions"
ON diagnostic_sessions FOR UPDATE
USING (user_id = auth.uid() OR organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
));

-- Workflows: Users can manage workflows in their sessions
CREATE POLICY "Users can manage own workflows"
ON workflows FOR ALL
USING (session_id IN (
    SELECT id FROM diagnostic_sessions WHERE user_id = auth.uid()
));

-- Evidence Files: Users can manage evidence in their sessions
CREATE POLICY "Users can manage own evidence"
ON evidence_files FOR ALL
USING (session_id IN (
    SELECT id FROM diagnostic_sessions WHERE user_id = auth.uid()
));

-- Eigenquestion Analysis: Users can view their org's analysis
CREATE POLICY "Users can view org analysis"
ON eigenquestion_analysis FOR SELECT
USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
));

CREATE POLICY "Admins can create org analysis"
ON eigenquestion_analysis FOR INSERT
WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
));
