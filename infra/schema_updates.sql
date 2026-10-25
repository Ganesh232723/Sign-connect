-- =============================================================
--  SignConnect: Supabase Schema Updates (Course Progress & Reviews)
--  Run this in the Supabase SQL Editor to complete the backend setup
-- =============================================================

-- ── 1. Course Progress Table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.course_progress (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text          NOT NULL, -- We'll use the user's email or string ID since Auth might be guest
  course_id   text          NOT NULL,
  lesson_id   text          NOT NULL,
  completed_at timestamptz  NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id, lesson_id)
);

ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert course progress" ON public.course_progress
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read course progress" ON public.course_progress
  FOR SELECT USING (true);

-- ── 2. Video Reviews Table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.video_reviews (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    text          NOT NULL,
  user_name   text          NOT NULL,
  rating      int           NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text          NOT NULL,
  created_at  timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE public.video_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert video reviews" ON public.video_reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read video reviews" ON public.video_reviews
  FOR SELECT USING (true);

-- ── 3. Useful Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_course_progress_user ON public.course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_reviews_video ON public.video_reviews(video_id);
