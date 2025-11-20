-- Quick Fix: Apply RLS Policies to Supabase Database
-- Copy and paste this entire script into your Supabase SQL Editor and run it

-- Step 1: Check if policies already exist (optional - just for info)
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('organizations', 'users', 'diagnostic_sessions', 'workflows', 'evidence_files', 'eigenquestion_analysis');

-- Step 2: Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Users can view org members" ON users;
DROP POLICY IF EXISTS "Users can update themselves" ON users;
DROP POLICY IF EXISTS "Users can create own sessions" ON diagnostic_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON diagnostic_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON diagnostic_sessions;
DROP POLICY IF EXISTS "Users can manage own workflows" ON workflows;
DROP POLICY IF EXISTS "Users can manage own evidence" ON evidence_files;
DROP POLICY IF EXISTS "Users can view org analysis" ON eigenquestion_analysis;
DROP POLICY IF EXISTS "Admins can create org analysis" ON eigenquestion_analysis;

-- Step 3: Create RLS Policies

-- Organizations: Users can view their own organization
CREATE POLICY "Users can view own organization"
ON organizations FOR SELECT
USING (auth.uid() IN (SELECT id FROM users WHERE organization_id = organizations.id));

-- Users: Users can view users in their organization
CREATE POLICY "Users can view org members"
ON users FOR SELECT
USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

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

-- Step 4: Verify policies are created
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('organizations', 'users', 'diagnostic_sessions', 'workflows', 'evidence_files', 'eigenquestion_analysis')
ORDER BY tablename, policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS Policies successfully applied! Your Nazeem platform should now work correctly.';
END $$;
