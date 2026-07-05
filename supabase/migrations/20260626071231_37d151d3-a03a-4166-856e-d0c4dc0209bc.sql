
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.session_l2_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  player_slot integer NOT NULL CHECK (player_slot IN (1,2)),
  text text NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id, player_slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_l2_answers TO anon, authenticated;
GRANT ALL ON public.session_l2_answers TO service_role;
ALTER TABLE public.session_l2_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read l2 answers" ON public.session_l2_answers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert l2 answers" ON public.session_l2_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update l2 answers" ON public.session_l2_answers FOR UPDATE USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.session_l3_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  prompt_id text NOT NULL,
  player_slot integer NOT NULL CHECK (player_slot IN (1,2)),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, prompt_id, player_slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_l3_answers TO anon, authenticated;
GRANT ALL ON public.session_l3_answers TO service_role;
ALTER TABLE public.session_l3_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read l3 answers" ON public.session_l3_answers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert l3 answers" ON public.session_l3_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update l3 answers" ON public.session_l3_answers FOR UPDATE USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_l2_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_l3_answers;
