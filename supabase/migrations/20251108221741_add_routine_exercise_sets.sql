CREATE TABLE IF NOT EXISTS public.routine_exercise_sets (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_exercise_id     uuid NOT NULL REFERENCES public.routine_exercises(id) ON DELETE CASCADE,
  set_number              smallint NOT NULL CHECK (set_number > 0),
  target_reps             smallint CHECK (target_reps IS NULL OR target_reps > 0),
  target_rep_range        text,
  target_weight           numeric(8,2) CHECK (target_weight IS NULL OR target_weight >= 0),
  target_rest_seconds     integer CHECK (target_rest_seconds IS NULL OR target_rest_seconds >= 0),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (routine_exercise_id, set_number)
);

CREATE INDEX IF NOT EXISTS routine_exercise_sets_exercise_idx
  ON public.routine_exercise_sets (routine_exercise_id, set_number);

CREATE TRIGGER touch_routine_exercise_sets_updated_at
  BEFORE UPDATE ON public.routine_exercise_sets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
