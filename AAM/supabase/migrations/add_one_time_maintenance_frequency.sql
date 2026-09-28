-- Allow one-time (non-recurring) maintenance plans, e.g. a single PM scheduled from an asset
ALTER TABLE maintenance_plans DROP CONSTRAINT IF EXISTS maintenance_plans_frequency_check;
ALTER TABLE maintenance_plans
ADD CONSTRAINT maintenance_plans_frequency_check
CHECK (frequency IN ('one_time', 'daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'custom'));
