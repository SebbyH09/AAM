-- Service reports linked to service contracts and/or maintenance plans
CREATE TABLE IF NOT EXISTS service_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_contract_id uuid REFERENCES service_contracts(id) ON DELETE SET NULL,
  maintenance_plan_id uuid REFERENCES maintenance_plans(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  technician text NOT NULL,
  type text NOT NULL DEFAULT 'service_visit',
  summary text NOT NULL,
  findings text,
  recommendations text,
  parts_used text,
  labor_hours numeric(6,2),
  cost numeric(10,2),
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by contract or plan
CREATE INDEX IF NOT EXISTS idx_service_reports_contract ON service_reports(service_contract_id);
CREATE INDEX IF NOT EXISTS idx_service_reports_plan ON service_reports(maintenance_plan_id);
CREATE INDEX IF NOT EXISTS idx_service_reports_asset ON service_reports(asset_id);
