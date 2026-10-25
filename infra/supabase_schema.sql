-- =============================================================
--  SignConnect: Supabase Schema Setup
--  Run this entire file in the Supabase SQL Editor of your project
--  Dashboard → SQL Editor → New query → paste → Run
-- =============================================================

-- ── 1. Translation Sessions Table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.translation_sessions (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid           REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at       timestamptz    NOT NULL DEFAULT now(),
  ended_at         timestamptz,
  language_output  text           NOT NULL DEFAULT 'en-US',
  duration_seconds int,
  created_at       timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE public.translation_sessions ENABLE ROW LEVEL SECURITY;

-- Everyone can insert anonymous sessions (user_id = null is OK for demo)
CREATE POLICY "Anyone can insert sessions" ON public.translation_sessions
  FOR INSERT WITH CHECK (true);

-- Authenticated users see only their own sessions; anon sees public sessions
CREATE POLICY "Users see own sessions" ON public.translation_sessions
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users update own sessions" ON public.translation_sessions
  FOR UPDATE USING (user_id IS NULL OR user_id = auth.uid());

-- ── 2. Transcripts Table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transcripts (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid          NOT NULL REFERENCES public.translation_sessions(id) ON DELETE CASCADE,
  text        text          NOT NULL,
  confidence  float8        NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  language    text          NOT NULL DEFAULT 'en-US',
  spoken_at   timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert transcripts" ON public.transcripts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read transcripts" ON public.transcripts
  FOR SELECT USING (true);

-- ── 3. Useful Indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transcripts_session ON public.transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_spoken_at ON public.transcripts(spoken_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.translation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON public.translation_sessions(created_at DESC);

-- ── 4. Helper View: session summary ───────────────────────────────────────────
CREATE OR REPLACE VIEW public.session_summary AS
SELECT
  s.id,
  s.user_id,
  s.started_at,
  s.ended_at,
  s.language_output,
  s.duration_seconds,
  COUNT(t.id)           AS caption_count,
  AVG(t.confidence)     AS avg_confidence
FROM public.translation_sessions s
LEFT JOIN public.transcripts t ON t.session_id = s.id
GROUP BY s.id;

-- ── 5. User Profiles Table (Auto-synced with auth.users) ──────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  full_name   text,
  avatar_url  text,
  provider    text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger function: Automatically create profile when a user logs in / signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, provider)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id),
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 6. Course Progress Table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_progress (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL,
  course_id    text        NOT NULL,
  lesson_id    text        NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id, lesson_id)
);

ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert course progress" ON public.course_progress
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read course progress" ON public.course_progress
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_course_progress_user ON public.course_progress(user_id);

-- ── 7. Video Reviews Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.video_reviews (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id   text        NOT NULL,
  user_name  text        NOT NULL,
  rating     int         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert video reviews" ON public.video_reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read video reviews" ON public.video_reviews
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_video_reviews_video ON public.video_reviews(video_id);


