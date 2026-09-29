-- Asset groups: bundle several assets into one labelled unit (e.g. all the
-- modules of an LC stack) while each piece keeps its own record.
CREATE TABLE IF NOT EXISTS asset_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES asset_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assets_group_id ON assets(group_id);

DROP TRIGGER IF EXISTS asset_groups_updated_at ON asset_groups;
CREATE TRIGGER asset_groups_updated_at BEFORE UPDATE ON asset_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE asset_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON asset_groups;
CREATE POLICY "Allow all for authenticated" ON asset_groups FOR ALL USING (true);

-- Asset categories, editable from Settings instead of hard-coded in the app.
CREATE TABLE IF NOT EXISTS asset_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

INSERT INTO asset_categories (name, sort_order) VALUES
  ('Analytical', 1),
  ('Lab Equipment', 2),
  ('HVAC', 3),
  ('IT/Network', 4),
  ('Electrical', 5),
  ('Mechanical', 6),
  ('Other', 7)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read for authenticated" ON asset_categories;
CREATE POLICY "Read for authenticated" ON asset_categories FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Write for admins" ON asset_categories;
CREATE POLICY "Write for admins" ON asset_categories FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- Which pages each non-admin role can see. Admins always see every page.
-- A missing row falls back to the app's built-in default for that page.
CREATE TABLE IF NOT EXISTS role_page_access (
  role text NOT NULL,
  page text NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (role, page)
);

ALTER TABLE role_page_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read for authenticated" ON role_page_access;
CREATE POLICY "Read for authenticated" ON role_page_access FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Write for admins" ON role_page_access;
CREATE POLICY "Write for admins" ON role_page_access FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
