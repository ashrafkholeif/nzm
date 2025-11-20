# Database Setup & Troubleshooting Guide

## Current Issue: "Error getting user organization"

### What's Happening

The diagnostic page can't load because Row Level Security (RLS) policies haven't been applied to your Supabase database yet.

### Quick Fix (2 minutes)

#### Option 1: Apply RLS Policies via Supabase Dashboard

1. **Go to your Supabase project** at https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. **Open SQL Editor** (left sidebar)

3. **Copy and paste** the entire contents of `APPLY_RLS_POLICIES.sql` and click **Run**

4. **Refresh your browser** and test the diagnostic page again

#### Option 2: Temporarily Disable RLS (Quick Test Only - NOT for Production)

1. Go to Supabase Dashboard → Table Editor
2. Click on the `users` table
3. Click the "RLS" toggle to disable (it will show a warning)
4. Test your app
5. **Remember to re-enable RLS and apply policies before going to production!**

### Verify Your Setup

After applying policies, check if your user exists:

```sql
-- Run this in Supabase SQL Editor
SELECT * FROM users WHERE id = auth.uid();
```

If no rows are returned, you need to create the user:

```sql
-- Replace with your actual values
INSERT INTO users (id, email, name, organization_id, role, department)
VALUES (
  auth.uid(), -- Current authenticated user
  'your-email@example.com',
  'Your Name',
  'your-org-id-here', -- Get this from organizations table
  'admin', -- or 'department_head'
  'your-department'
);
```

### Check Organizations Table

Make sure you have at least one organization:

```sql
-- View existing organizations
SELECT * FROM organizations;

-- If empty, create one:
INSERT INTO organizations (name, industry)
VALUES ('Your Company Name', 'automotive')
RETURNING id;
-- Copy the returned ID to use in users table
```

### Complete Setup Flow

1. **Create Organization** (if not exists)
2. **Apply RLS Policies** (`APPLY_RLS_POLICIES.sql`)
3. **Create User** linked to organization
4. **Test diagnostic page**

### Still Having Issues?

Check browser console (F12) for specific error messages and check:

1. ✅ Supabase URL and Anon Key are correct in `.env.local`
2. ✅ User is authenticated (check Supabase Dashboard → Authentication → Users)
3. ✅ RLS policies are applied (run: `SELECT * FROM pg_policies WHERE tablename = 'users';`)
4. ✅ User exists in `users` table with valid `organization_id`

### Environment Variables Check

Your `.env.local` should have:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
OPENAI_API_KEY=sk-your-openai-key-here
```

### Need More Help?

Check the full error in browser console (F12 → Console) and look for:

- Supabase error codes (e.g., 42501 = insufficient privilege)
- Detailed error messages
- Stack traces

---

**Quick Command to Check Everything:**

```sql
-- Run this to see your complete setup status
SELECT
  'Organizations' as table_name,
  count(*) as count
FROM organizations
UNION ALL
SELECT 'Users', count(*) FROM users
UNION ALL
SELECT 'Diagnostic Sessions', count(*) FROM diagnostic_sessions
UNION ALL
SELECT 'RLS Policies', count(*) FROM pg_policies
WHERE tablename IN ('users', 'organizations', 'diagnostic_sessions');
```
