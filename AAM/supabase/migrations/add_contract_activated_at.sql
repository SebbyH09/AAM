-- Track when a pending (e.g. renewed) service contract automatically became active
-- once its start date arrived, so it can be surfaced as a newly active contract.
ALTER TABLE service_contracts
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;
