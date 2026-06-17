-- =============================================
-- POIs por MAC (individuales)
-- =============================================

CREATE TABLE IF NOT EXISTS pois (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mac_id UUID NOT NULL REFERENCES macs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('hospital', 'school', 'services', 'police')),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pois_mac_id ON pois(mac_id);
CREATE INDEX IF NOT EXISTS idx_pois_type ON pois(type);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pois_updated_at ON pois;
CREATE TRIGGER trg_pois_updated_at
BEFORE UPDATE ON pois
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE pois ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de pois" ON pois;
CREATE POLICY "Lectura publica de pois"
  ON pois FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin puede modificar pois" ON pois;
CREATE POLICY "Admin puede modificar pois"
  ON pois FOR ALL
  USING (auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
