-- ============================================================
-- HabitCircle — Complete Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. Extensions
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- 1. Custom ENUM types
-- ────────────────────────────────────────────────────────────
CREATE TYPE habit_category AS ENUM (
  'health',
  'fitness',
  'productivity',
  'mindfulness',
  'education',
  'finance',
  'social',
  'nutrition',
  'creativity',
  'other'
);

CREATE TYPE habit_type AS ENUM (
  'positive',
  'negative'
);

CREATE TYPE habit_frequency AS ENUM (
  'daily',
  'weekly',
  'monthly'
);

CREATE TYPE habit_visibility AS ENUM (
  'public',
  'followers',
  'private'
);

-- ────────────────────────────────────────────────────────────
-- 2. Tables
-- ────────────────────────────────────────────────────────────

-- ┌──────────────────────────────────────────────────────────┐
-- │  USERS (extends auth.users)                              │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE public.users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT        UNIQUE NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'Public user profiles, auto-created on sign-up via trigger.';

-- ┌──────────────────────────────────────────────────────────┐
-- │  HABITS                                                  │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE public.habits (
  id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID              NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT              NOT NULL,
  description   TEXT,
  category      habit_category    NOT NULL DEFAULT 'other',
  type          habit_type        NOT NULL DEFAULT 'positive',
  target_value  INTEGER           NOT NULL DEFAULT 1,
  unit          TEXT              NOT NULL DEFAULT 'times',
  frequency     habit_frequency   NOT NULL DEFAULT 'daily',
  visibility    habit_visibility  NOT NULL DEFAULT 'public',
  image_url     TEXT,
  is_active     BOOLEAN           NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ       NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ       NOT NULL DEFAULT now(),

  CONSTRAINT habits_target_value_positive CHECK (target_value > 0),
  CONSTRAINT habits_name_length           CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

COMMENT ON TABLE public.habits IS 'User-created habits with tracking configuration.';

-- ┌──────────────────────────────────────────────────────────┐
-- │  CHECK_INS                                               │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE public.check_ins (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id    UUID        NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  value       INTEGER     NOT NULL DEFAULT 1,
  note        TEXT,
  image_url   TEXT,
  logged_at   DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT check_ins_value_non_negative CHECK (value >= 0),
  CONSTRAINT check_ins_one_per_day        UNIQUE (habit_id, logged_at)
);

COMMENT ON TABLE public.check_ins IS 'Daily check-in entries for habits. One per habit per day.';

-- ┌──────────────────────────────────────────────────────────┐
-- │  HABIT_FOLLOWS                                           │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE public.habit_follows (
  follower_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  habit_id     UUID        NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  followed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (follower_id, habit_id)
);

COMMENT ON TABLE public.habit_follows IS 'Users can follow other users'' habits to see updates in their feed.';

-- ┌──────────────────────────────────────────────────────────┐
-- │  STREAKS                                                 │
-- └──────────────────────────────────────────────────────────┘
CREATE TABLE public.streaks (
  habit_id       UUID    NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id        UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_checkin   DATE,

  PRIMARY KEY (habit_id, user_id),

  CONSTRAINT streaks_current_non_negative CHECK (current_streak >= 0),
  CONSTRAINT streaks_longest_non_negative CHECK (longest_streak >= 0)
);

COMMENT ON TABLE public.streaks IS 'Tracks current and longest streaks per user per habit.';

-- ────────────────────────────────────────────────────────────
-- 3. Indexes
-- ────────────────────────────────────────────────────────────

-- users
CREATE INDEX idx_users_username   ON public.users (username);
CREATE INDEX idx_users_created_at ON public.users (created_at DESC);

-- habits
CREATE INDEX idx_habits_user_id    ON public.habits (user_id);
CREATE INDEX idx_habits_category   ON public.habits (category);
CREATE INDEX idx_habits_created_at ON public.habits (created_at DESC);
CREATE INDEX idx_habits_active     ON public.habits (is_active) WHERE is_active = true;

-- check_ins
CREATE INDEX idx_check_ins_user_id    ON public.check_ins (user_id);
CREATE INDEX idx_check_ins_habit_id   ON public.check_ins (habit_id);
CREATE INDEX idx_check_ins_created_at ON public.check_ins (created_at DESC);
CREATE INDEX idx_check_ins_logged_at  ON public.check_ins (logged_at DESC);

-- habit_follows
CREATE INDEX idx_habit_follows_habit_id    ON public.habit_follows (habit_id);
CREATE INDEX idx_habit_follows_follower_id ON public.habit_follows (follower_id);

-- streaks
CREATE INDEX idx_streaks_user_id  ON public.streaks (user_id);
CREATE INDEX idx_streaks_current  ON public.streaks (current_streak DESC);

-- ────────────────────────────────────────────────────────────
-- 4. Functions
-- ────────────────────────────────────────────────────────────

-- 4a. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4b. Auto-create user profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _username TEXT;
BEGIN
  -- Derive username from email (part before @), append random suffix for uniqueness
  _username := split_part(NEW.email, '@', 1) || '_' || substr(md5(random()::text), 1, 4);

  INSERT INTO public.users (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    _username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

-- 4c. Streak calculation — runs after a check-in is inserted
CREATE OR REPLACE FUNCTION public.handle_streak_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _last_checkin   DATE;
  _current_streak INTEGER;
  _longest_streak INTEGER;
BEGIN
  -- Fetch existing streak record
  SELECT last_checkin, current_streak, longest_streak
  INTO   _last_checkin, _current_streak, _longest_streak
  FROM   public.streaks
  WHERE  habit_id = NEW.habit_id
    AND  user_id  = NEW.user_id;

  IF NOT FOUND THEN
    -- First ever check-in for this habit
    INSERT INTO public.streaks (habit_id, user_id, current_streak, longest_streak, last_checkin)
    VALUES (NEW.habit_id, NEW.user_id, 1, 1, NEW.logged_at);
  ELSE
    -- Determine if the streak continues
    IF NEW.logged_at = _last_checkin + INTERVAL '1 day' THEN
      -- Consecutive day → increment streak
      _current_streak := _current_streak + 1;
    ELSIF NEW.logged_at = _last_checkin THEN
      -- Same day (shouldn't happen due to unique constraint, but guard)
      -- No change
      RETURN NEW;
    ELSE
      -- Streak broken → reset to 1
      _current_streak := 1;
    END IF;

    -- Update longest streak if current exceeds it
    IF _current_streak > _longest_streak THEN
      _longest_streak := _current_streak;
    END IF;

    UPDATE public.streaks
    SET    current_streak = _current_streak,
           longest_streak = _longest_streak,
           last_checkin   = NEW.logged_at
    WHERE  habit_id = NEW.habit_id
      AND  user_id  = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 4d. Prevent following your own habit
CREATE OR REPLACE FUNCTION public.prevent_self_habit_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _habit_owner UUID;
BEGIN
  SELECT user_id INTO _habit_owner
  FROM   public.habits
  WHERE  id = NEW.habit_id;

  IF _habit_owner = NEW.follower_id THEN
    RAISE EXCEPTION 'You cannot follow your own habit.';
  END IF;

  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 5. Triggers
-- ────────────────────────────────────────────────────────────

-- Auto-create profile on auth sign-up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE TRIGGER on_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_habits_updated
  BEFORE UPDATE ON public.habits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-update streaks on check-in
CREATE TRIGGER on_check_in_created
  AFTER INSERT ON public.check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_streak_update();

-- Prevent self-follow on habits
CREATE TRIGGER on_habit_follow_created
  BEFORE INSERT ON public.habit_follows
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_habit_follow();

-- ────────────────────────────────────────────────────────────
-- 6. Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_follows  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks        ENABLE ROW LEVEL SECURITY;

-- ┌──────────────────────────────────────────────────────────┐
-- │  USERS policies                                          │
-- └──────────────────────────────────────────────────────────┘

-- Anyone can view profiles (social app)
CREATE POLICY "users_select_public"
  ON public.users FOR SELECT
  USING (true);

-- Users can update only their own profile
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profile creation is handled by the trigger (SECURITY DEFINER)
-- No direct insert policy needed for regular users

-- Users can delete only their own profile
CREATE POLICY "users_delete_own"
  ON public.users FOR DELETE
  USING (auth.uid() = id);

-- ┌──────────────────────────────────────────────────────────┐
-- │  HABITS policies                                         │
-- └──────────────────────────────────────────────────────────┘

-- Public habits visible to everyone; followers-only visible to followers; private only to owner
CREATE POLICY "habits_select_visible"
  ON public.habits FOR SELECT
  USING (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (
      visibility = 'followers'
      AND EXISTS (
        SELECT 1 FROM public.habit_follows hf
        WHERE hf.habit_id = id
          AND hf.follower_id = auth.uid()
      )
    )
  );

-- Authenticated users can create habits for themselves
CREATE POLICY "habits_insert_own"
  ON public.habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own habits
CREATE POLICY "habits_update_own"
  ON public.habits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own habits
CREATE POLICY "habits_delete_own"
  ON public.habits FOR DELETE
  USING (auth.uid() = user_id);

-- ┌──────────────────────────────────────────────────────────┐
-- │  CHECK_INS policies                                      │
-- └──────────────────────────────────────────────────────────┘

-- Check-ins are visible if the parent habit is visible
CREATE POLICY "check_ins_select_visible"
  ON public.check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_id
        AND (
          h.visibility = 'public'
          OR h.user_id = auth.uid()
          OR (
            h.visibility = 'followers'
            AND EXISTS (
              SELECT 1 FROM public.habit_follows hf
              WHERE hf.habit_id = h.id
                AND hf.follower_id = auth.uid()
            )
          )
        )
    )
  );

-- Users can check in only for their own habits
CREATE POLICY "check_ins_insert_own"
  ON public.check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own check-ins
CREATE POLICY "check_ins_update_own"
  ON public.check_ins FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own check-ins
CREATE POLICY "check_ins_delete_own"
  ON public.check_ins FOR DELETE
  USING (auth.uid() = user_id);

-- ┌──────────────────────────────────────────────────────────┐
-- │  HABIT_FOLLOWS policies                                  │
-- └──────────────────────────────────────────────────────────┘

-- Anyone can see who follows a habit
CREATE POLICY "habit_follows_select_public"
  ON public.habit_follows FOR SELECT
  USING (true);

-- Users can follow habits (as themselves)
CREATE POLICY "habit_follows_insert_own"
  ON public.habit_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Users can unfollow (delete their own follow)
CREATE POLICY "habit_follows_delete_own"
  ON public.habit_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ┌──────────────────────────────────────────────────────────┐
-- │  STREAKS policies                                        │
-- └──────────────────────────────────────────────────────────┘

-- Streaks are publicly readable (show on profiles and feed)
CREATE POLICY "streaks_select_public"
  ON public.streaks FOR SELECT
  USING (true);

-- Streaks are managed by the trigger function (SECURITY DEFINER)
-- No direct insert/update/delete policies for regular users

-- ────────────────────────────────────────────────────────────
-- 7. Storage Buckets
-- ────────────────────────────────────────────────────────────

-- Create storage buckets (run via Supabase Dashboard or CLI)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',  'avatars',  true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('checkins', 'checkins', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('habits',   'habits',   true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ┌──────────────────────────────────────────────────────────┐
-- │  STORAGE policies                                        │
-- └──────────────────────────────────────────────────────────┘

-- Avatars: public read, authenticated upload to own folder, owner delete
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Checkins: public read, authenticated upload to own folder, owner delete
CREATE POLICY "checkins_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'checkins');

CREATE POLICY "checkins_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'checkins'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "checkins_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'checkins'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "checkins_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'checkins'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Habits: public read, authenticated upload to own folder, owner delete
CREATE POLICY "habits_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'habits');

CREATE POLICY "habits_images_auth_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'habits'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "habits_images_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'habits'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "habits_images_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'habits'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ────────────────────────────────────────────────────────────
-- 8. Utility Views (for feed queries)
-- ────────────────────────────────────────────────────────────

-- Feed view: recent check-ins with user and habit info, plus streak
CREATE OR REPLACE VIEW public.feed_view AS
SELECT
  ci.id            AS checkin_id,
  ci.habit_id,
  ci.user_id,
  ci.value,
  ci.note,
  ci.image_url     AS checkin_image_url,
  ci.logged_at,
  ci.created_at,
  h.name           AS habit_name,
  h.category,
  h.type           AS habit_type,
  h.target_value,
  h.unit,
  h.visibility,
  h.image_url      AS habit_image_url,
  u.username,
  u.full_name,
  u.avatar_url,
  COALESCE(s.current_streak, 0) AS current_streak,
  COALESCE(s.longest_streak, 0) AS longest_streak
FROM public.check_ins ci
JOIN public.habits h  ON h.id  = ci.habit_id
JOIN public.users  u  ON u.id  = ci.user_id
LEFT JOIN public.streaks s ON s.habit_id = ci.habit_id AND s.user_id = ci.user_id
WHERE h.visibility = 'public'
ORDER BY ci.created_at DESC;

-- Profile stats function
CREATE OR REPLACE FUNCTION public.get_profile_stats(profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_habits',     (SELECT COUNT(*) FROM public.habits WHERE user_id = profile_id AND is_active = true),
    'total_checkins',   (SELECT COUNT(*) FROM public.check_ins WHERE user_id = profile_id),
    'longest_streak',   (SELECT COALESCE(MAX(longest_streak), 0) FROM public.streaks WHERE user_id = profile_id),
    'current_best',     (SELECT COALESCE(MAX(current_streak), 0) FROM public.streaks WHERE user_id = profile_id),
    'followers_count',  (
      SELECT COUNT(DISTINCT hf.follower_id)
      FROM public.habit_follows hf
      JOIN public.habits h ON h.id = hf.habit_id
      WHERE h.user_id = profile_id
    ),
    'following_count',  (SELECT COUNT(*) FROM public.habit_follows WHERE follower_id = profile_id)
  ) INTO result;

  RETURN result;
END;
$$;
