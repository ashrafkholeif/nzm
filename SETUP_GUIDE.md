# Setup Instructions for Nazeem Enterprise Platform

## ✅ Completed Steps

1. ✅ Project structure created
2. ✅ All dependencies installed
3. ✅ Environment variables configured in `.env.local`
4. ✅ TypeScript and Next.js configured
5. ✅ All application pages created
6. ✅ UI components built
7. ✅ Supabase and OpenAI integrations ready

## 🔥 Critical Next Steps

### 1. Set Up Supabase Database (5 minutes)

You MUST run the SQL migration to create database tables:

1. Go to [https://asmwfazlcejxozdwnieb.supabase.co](https://asmwfazlcejxozdwnieb.supabase.co)
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the ENTIRE contents of `supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL editor
6. Click **RUN**
7. You should see "Success. No rows returned" - this means tables were created!

### 2. Start the Development Server

```bash
npm run dev
```

### 3. Test the Application

Open [http://localhost:3000](http://localhost:3000)

#### Test Flow:

1. **Create Organization**

   - Go to http://localhost:3000/auth/admin-signup
   - Fill in the form:
     - Organization: "Test Company"
     - Industry: Manufacturing
     - Your Name: "Admin User"
     - Email: admin@test.com
     - Password: test123456
   - Click "Create Organization"

2. **Access Admin Dashboard**

   - You should be redirected to /admin/dashboard
   - Click "Invite Department"
   - Add a test department:
     - Department: "Manufacturing"
     - Name: "John Doe"
     - Email: john@test.com

3. **Complete a Diagnostic**

   - Open a new incognito window
   - Go to http://localhost:3000/department/diagnostic/Manufacturing
   - Answer the AI-guided questions about workflows
   - The system will analyze with GPT-4 and show results

4. **Generate Report**
   - After all departments complete diagnostics
   - Go to /admin/dashboard
   - Click "Generate Report"
   - View the global eigenquestion analysis

## 🐛 Troubleshooting

### If you see database errors:

**Error: "relation 'organizations' does not exist"**

- You haven't run the SQL migration
- Go to Supabase SQL Editor and run the migration script

**Error: "Failed to fetch"**

- Check your Supabase URL and keys in `.env.local`
- Make sure your Supabase project is running

### If OpenAI doesn't work:

**Error: "Invalid API key"**

- Your OpenAI API key might be expired
- Go to platform.openai.com and create a new key
- Update OPENAI_API_KEY in `.env.local`

**Error: "Model not found"**

- You might not have GPT-4 access
- Edit `src/lib/llm.ts`
- Change `gpt-4-turbo-preview` to `gpt-3.5-turbo`

### If build fails:

```bash
# Clear everything and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🚀 Deploy to Vercel

1. Push to GitHub:

   ```bash
   git add .
   git commit -m "Initial commit"
   git push
   ```

2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Add Environment Variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - OPENAI_API_KEY
6. Click "Deploy"

## 📊 Database Schema Overview

The migration creates these tables:

- `organizations` - Company accounts
- `users` - Admins and department heads
- `diagnostic_sessions` - One per department diagnostic
- `workflows` - Individual workflows identified
- `evidence_files` - Uploaded documents
- `eigenquestion_analysis` - Final cross-department analysis

Plus a storage bucket: `evidence-files` for file uploads

## 🎯 Project Features

- **AI-Powered Diagnostics**: GPT-4 analyzes workflows to find eigenquestions
- **Multi-Department Support**: Track progress across all departments
- **File Upload**: Support for evidence files (Excel, PDF, images)
- **Real-time Progress**: Admin dashboard shows completion status
- **Comprehensive Reports**: Export detailed analysis with ROI calculations

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- Authentication required for all operations
- API keys secured in environment variables
- File upload limited to authenticated users

## 📞 Support

If you encounter issues:

1. Check this setup guide
2. Review the main README.md
3. Check browser console for errors
4. Verify Supabase tables were created successfully

---

**You're all set! Run the SQL migration, start the dev server, and test!** 🎉
