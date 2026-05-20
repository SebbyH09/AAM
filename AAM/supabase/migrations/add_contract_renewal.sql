-- Add renewal tracking to service_contracts
ALTER TABLE service_contracts
  ADD COLUMN IF NOT EXISTS renewed_from_contract_id UUID REFERENCES service_contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_contracts_renewed_from ON service_contracts(renewed_from_contract_id);
