ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial', ADD COLUMN IF NOT EXISTS trial_end_date timestamptz DEFAULT (now() + interval '7 days');
