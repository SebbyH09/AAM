-- Junction table for many-to-many: service_contracts <-> assets
CREATE TABLE IF NOT EXISTS service_contract_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_contract_id uuid NOT NULL REFERENCES service_contracts(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_contract_id, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_sca_contract ON service_contract_assets(service_contract_id);
CREATE INDEX IF NOT EXISTS idx_sca_asset ON service_contract_assets(asset_id);

-- Migrate existing asset_id data into the junction table
INSERT INTO service_contract_assets (service_contract_id, asset_id)
SELECT id, asset_id FROM service_contracts
WHERE asset_id IS NOT NULL
ON CONFLICT DO NOTHING;
