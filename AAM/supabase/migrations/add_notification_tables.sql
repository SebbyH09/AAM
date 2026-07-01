-- Notification rules and delivery log for email reminders
-- (contract expiry, maintenance due, etc.)

-- Rules define what to watch and who to alert
CREATE TABLE IF NOT EXISTS notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'contract_expiry'
    CHECK (type IN ('contract_expiry', 'maintenance_due', 'repair_overdue', 'inspection_due')),
  days_before integer NOT NULL DEFAULT 30 CHECK (days_before >= 0),
  email_to text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Log of every notification the send job has emitted
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES notification_rules(id) ON DELETE SET NULL,
  type text NOT NULL,
  subject text NOT NULL,
  recipient text NOT NULL,
  related_id uuid,
  related_type text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Only active rules are scanned by the send job
CREATE INDEX IF NOT EXISTS idx_notification_rules_active ON notification_rules(is_active);

-- Dedupe lookups: "already sent for this item today?"
CREATE INDEX IF NOT EXISTS idx_notification_log_related ON notification_log(related_id, related_type);
-- History view orders by most recent first
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at DESC);
