-- Add per-asset PM date tracking to service_contract_assets junction table
ALTER TABLE service_contract_assets
ADD COLUMN IF NOT EXISTS pm_last_performed_date DATE;
