
-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- user_api_credentials
-- ============================================
CREATE TABLE public.user_api_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  credential_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, credential_type)
);

ALTER TABLE public.user_api_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credentials"
  ON public.user_api_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials"
  ON public.user_api_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
  ON public.user_api_credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials"
  ON public.user_api_credentials FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_api_credentials_updated_at
  BEFORE UPDATE ON public.user_api_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- content_profiles
-- ============================================
CREATE TABLE public.content_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  heygen_avatar_id TEXT,
  heygen_voice_id TEXT,
  default_disclaimer TEXT NOT NULL DEFAULT 'This content is legal commentary for public awareness only and does not constitute legal advice. For advice specific to your situation, consult a qualified lawyer.',
  delhi_context_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.content_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.content_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.content_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_content_profiles_updated_at
  BEFORE UPDATE ON public.content_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- jobs
-- ============================================
CREATE TYPE public.job_flow AS ENUM ('linkedin', 'short_video', 'youtube_long');
CREATE TYPE public.job_status AS ENUM ('queued', 'running', 'ready', 'approved', 'posted', 'failed');
CREATE TYPE public.input_mode AS ENUM ('url', 'topic', 'draft');

CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flow public.job_flow NOT NULL,
  status public.job_status NOT NULL DEFAULT 'queued',
  input_mode public.input_mode NOT NULL,
  input_text TEXT NOT NULL,
  dry_run BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON public.jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON public.jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_jobs_user_status ON public.jobs(user_id, status);

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- job_outputs
-- ============================================
CREATE TABLE public.job_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  output_type TEXT NOT NULL,
  content TEXT,
  file_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view outputs for own jobs"
  ON public.job_outputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_outputs.job_id
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert outputs for own jobs"
  ON public.job_outputs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_outputs.job_id
      AND jobs.user_id = auth.uid()
    )
  );

-- ============================================
-- Storage bucket for generated media
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-media', 'job-media', false);

CREATE POLICY "Users can view own media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'job-media' AND auth.uid()::text = (storage.foldername(name))[1]);
