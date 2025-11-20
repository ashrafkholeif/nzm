CREATE TABLE organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    role TEXT CHECK (role IN ('admin', 'department_head')),
    department TEXT,
    invite_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE diagnostic_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    department TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    status TEXT DEFAULT 'in_progress',
    chat_history JSONB DEFAULT '[]',
    workflows JSONB DEFAULT '[]',
    evidence_files JSONB DEFAULT '[]',
    eigenquestion TEXT,
    eigenquestion_reasoning TEXT,
    total_value DECIMAL,
    completion_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES diagnostic_sessions(id),
    name TEXT NOT NULL,
    trigger_description TEXT,
    input_sources JSONB,
    decision_points JSONB,
    output_actions JSONB,
    failure_cascade JSONB,
    monthly_impact DECIMAL,
    standalone_value_score DECIMAL,
    prevents_fires BOOLEAN,
    daily_usage_potential BOOLEAN,
    workflow_diagram TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE evidence_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES diagnostic_sessions(id),
    workflow_id UUID REFERENCES workflows(id),
    file_url TEXT NOT NULL,
    file_type TEXT,
    description TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE eigenquestion_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    global_eigenquestion TEXT,
    reasoning TEXT,
    cross_department_patterns JSONB,
    priority_ranking JSONB,
    total_organization_value DECIMAL,
    generated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE eigenquestion_analysis ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-files', 'evidence-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'evidence-files' );

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'evidence-files' AND auth.role() = 'authenticated' );
