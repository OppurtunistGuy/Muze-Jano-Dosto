
-- Sessions
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  creator_name TEXT NOT NULL,
  creator_gender TEXT NOT NULL,
  partner_name TEXT,
  partner_gender TEXT,
  question_ids TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'waiting',
  current_index INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_code ON public.sessions(code);
GRANT SELECT, INSERT, UPDATE ON public.sessions TO anon, authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can create sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON public.sessions FOR UPDATE USING (true) WITH CHECK (true);

-- Session answers
CREATE TABLE public.session_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  player_slot INTEGER NOT NULL CHECK (player_slot IN (1, 2)),
  choice TEXT NOT NULL CHECK (choice IN ('A', 'B', 'SKIP')),
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id, player_slot)
);
CREATE INDEX idx_session_answers_session ON public.session_answers(session_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_answers TO anon, authenticated;
GRANT ALL ON public.session_answers TO service_role;
ALTER TABLE public.session_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read answers" ON public.session_answers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert answers" ON public.session_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update answers" ON public.session_answers FOR UPDATE USING (true) WITH CHECK (true);

-- Waitlist
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email, source)
);
CREATE INDEX idx_waitlist_email ON public.waitlist(email);
GRANT INSERT ON public.waitlist TO anon, authenticated;
GRANT ALL ON public.waitlist TO service_role;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can join waitlist" ON public.waitlist FOR INSERT WITH CHECK (
  email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 255 AND source IN ('start','result','level2','level3')
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_answers;
ALTER TABLE public.sessions REPLICA IDENTITY FULL;
ALTER TABLE public.session_answers REPLICA IDENTITY FULL;
