-- LeetCode Questions Table
CREATE TABLE public.leetcode_questions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  acceptance TEXT,
  category TEXT,
  description TEXT NOT NULL,
  starter_code JSONB NOT NULL,
  test_runner JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leetcode_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to questions" ON public.leetcode_questions
  FOR SELECT TO public USING (true);

-- LeetCode User Stats Table (for Leaderboard)
CREATE TABLE public.leetcode_user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  solved_questions TEXT[] DEFAULT '{}',
  solved_dates TEXT[] DEFAULT '{}',
  streak INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leetcode_user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to leaderboard stats" ON public.leetcode_user_stats
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow users to update own stats" ON public.leetcode_user_stats
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_leetcode_stats_points ON public.leetcode_user_stats(points DESC);
