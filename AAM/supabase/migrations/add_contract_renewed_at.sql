-- Track when a service contract was last renewed so recently-renewed
-- contracts can be surfaced at the top of the contracts list for 7 days.
ALTER TABLE service_contracts
  ADD COLUMN IF NOT EXISTS renewed_at timestamptz;
