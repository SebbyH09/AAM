-- Add preventative maintenance tracking columns to service_contracts
-- pm_last_performed_date: the date PM was last completed
-- pm_interval_months: how often PM should occur (default 12 months / annually)

ALTER TABLE service_contracts
  ADD COLUMN IF NOT EXISTS pm_last_performed_date date,
  ADD COLUMN IF NOT EXISTS pm_interval_months integer NOT NULL DEFAULT 12;
