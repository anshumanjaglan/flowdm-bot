-- flowdm Schema (V1 MVP)

-- 1. Profiles Table (extends Supabase auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  plan text DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

-- Trigger to automatically create a profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Social Accounts Table
-- Unified for both Instagram and Facebook Pages
CREATE TYPE channel_type AS ENUM ('instagram', 'facebook_page');
CREATE TYPE connection_status AS ENUM ('active', 'expired', 'revoked');

CREATE TABLE social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  channel channel_type DEFAULT 'instagram',
  external_id text NOT NULL, -- The IG User ID or FB Page ID
  username text,
  profile_pic_url text,
  access_token_enc bytea, -- Store encrypted
  token_expires_at timestamptz,
  scopes text[],
  status connection_status DEFAULT 'active',
  webhook_subscribed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(channel, external_id)
);

-- 3. Automations Table
CREATE TYPE automation_status AS ENUM ('draft', 'live', 'paused');
CREATE TYPE match_mode AS ENUM ('contains', 'exact', 'any');

CREATE TABLE automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id uuid REFERENCES social_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  status automation_status DEFAULT 'draft',
  trigger_type text DEFAULT 'ig_comment',
  media_id text, -- Null implies "Any post"
  keywords text[],
  match_mode match_mode DEFAULT 'contains',
  comment_replies text[], -- Array of public reply variants
  published_version_id uuid, -- Self-referencing FK added later
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Flow Versions (The React Flow Canvas Data)
CREATE TABLE flow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES automations(id) ON DELETE CASCADE,
  version integer NOT NULL,
  graph jsonb NOT NULL, -- The actual node & edge layout
  is_draft boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(automation_id, version)
);

ALTER TABLE automations 
  ADD CONSTRAINT fk_published_version 
  FOREIGN KEY (published_version_id) 
  REFERENCES flow_versions(id) ON DELETE SET NULL;

-- 5. Contacts (Leads captured)
CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id uuid REFERENCES social_accounts(id) ON DELETE CASCADE,
  external_id text NOT NULL, -- IGSID or Messenger PSID
  username text,
  name text,
  variables jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}',
  last_interaction_at timestamptz DEFAULT now(),
  messaging_window_expires_at timestamptz,
  UNIQUE(social_account_id, external_id)
);

-- 6. Flow Runs (Active automation executions)
CREATE TYPE run_status AS ENUM ('running', 'waiting', 'completed', 'failed', 'cancelled');

CREATE TABLE flow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES automations(id) ON DELETE CASCADE,
  flow_version_id uuid REFERENCES flow_versions(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  trigger_event_id text NOT NULL, -- Idempotency key
  current_node_id text,
  status run_status DEFAULT 'running',
  context jsonb DEFAULT '{}'::jsonb, -- Collected variable state
  resume_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(automation_id, trigger_event_id)
);

-- 7. Message Logs
CREATE TYPE msg_direction AS ENUM ('in', 'out');
CREATE TYPE msg_kind AS ENUM ('comment_reply', 'dm');

CREATE TABLE message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES flow_runs(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  direction msg_direction NOT NULL,
  kind msg_kind NOT NULL,
  node_id text,
  payload jsonb,
  meta_message_id text,
  status text,
  error_code text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Indexing for performance
CREATE INDEX idx_automations_social_status ON automations(social_account_id, status, media_id);
CREATE INDEX idx_flow_runs_contact_status ON flow_runs(contact_id, status);
CREATE INDEX idx_contacts_social_external ON contacts(social_account_id, external_id);
CREATE INDEX idx_message_logs_run_id ON message_logs(run_id, created_at);

-- Row Level Security (RLS) Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_runs ENABLE ROW LEVEL SECURITY;

-- Standard RLS Policies (User can only see/edit their own data)
CREATE POLICY "Users view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users edit own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users manage own accounts" ON social_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own automations" ON automations FOR ALL USING (auth.uid() = user_id);
-- (We use subqueries for items implicitly owned via automation_id, though adding user_id explicitly is faster for scale)
-- Assuming flow_versions are managed by service role or we can join:
CREATE POLICY "Users manage own flow_versions" ON flow_versions FOR ALL USING (
  EXISTS (SELECT 1 FROM automations a WHERE a.id = flow_versions.automation_id AND a.user_id = auth.uid())
);
CREATE POLICY "Users manage own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own flow runs" ON flow_runs FOR ALL USING (
  EXISTS (SELECT 1 FROM automations a WHERE a.id = flow_runs.automation_id AND a.user_id = auth.uid())
);
