-- Quick Fix: Apply RLS Policies to Supabase Database
-- Copy and paste this entire script into your Supabase SQL Editor and run it

-- Step 1: Check if policies already exist (optional - just for info)
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('organizations', 'users', 'diagnostic_sessions', 'workflows', 'evidence_files', 'eigenquestion_analysis');

-- Step 2: Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view org members" ON users;
DROP POLICY IF EXISTS "Users can view themselves" ON users;
DROP POLICY IF EXISTS "Users can view themselves and org members" ON users;
DROP POLICY IF EXISTS "Users can view org members via organization_id" ON users;
DROP POLICY IF EXISTS "Users can update themselves" ON users;
DROP POLICY IF EXISTS "Users can create own sessions" ON diagnostic_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON diagnostic_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON diagnostic_sessions;
DROP POLICY IF EXISTS "Users can manage own workflows" ON workflows;
DROP POLICY IF EXISTS "Users can manage own evidence" ON evidence_files;
DROP POLICY IF EXISTS "Users can view org analysis" ON eigenquestion_analysis;
DROP POLICY IF EXISTS "Admins can create org analysis" ON eigenquestion_analysis;

-- Drop helper function if exists
DROP FUNCTION IF EXISTS public.get_user_organization_id();

-- Step 3: Create Security Definer Function (CRITICAL - prevents infinite recursion)
-- Note: Must be in 'public' schema, not 'auth' schema (permission denied)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$;

-- Step 4: Create RLS Policies

-- Organizations: Allow authenticated users to view organizations
CREATE POLICY "Users can view organizations"
ON organizations FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users: Users can view their own record and org members
-- Uses security definer function to avoid infinite recursion
CREATE POLICY "Users can view themselves and org members"
ON users FOR SELECT
USING (
  id = auth.uid() OR 
  organization_id = public.get_user_organization_id()
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
