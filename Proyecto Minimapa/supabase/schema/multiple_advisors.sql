-- =============================================
-- Multiple Advisors per MAC
-- =============================================

-- Create junction table for MAC-Advisor relationship
CREATE TABLE IF NOT EXISTS mac_advisors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mac_id UUID NOT NULL REFERENCES macs(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mac_id, advisor_id)
);

CREATE INDEX IF NOT EXISTS idx_mac_advisors_mac_id ON mac_advisors(mac_id);
CREATE INDEX IF NOT EXISTS idx_mac_advisors_advisor_id ON mac_advisors(advisor_id);

-- Enable RLS
ALTER TABLE mac_advisors ENABLE ROW LEVEL SECURITY;

-- Policies for mac_advisors
DROP POLICY IF EXISTS "Lectura publica de mac_advisors" ON mac_advisors;
CREATE POLICY "Lectura publica de mac_advisors"
  ON mac_advisors FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin puede modificar mac_advisors" ON mac_advisors;
CREATE POLICY "Admin puede modificar mac_advisors"
  ON mac_advisors FOR ALL
  USING (auth.role() = 'authenticated');

-- Migrate existing advisor_id values to mac_advisors table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'macs'
      AND column_name = 'advisor_id'
  ) THEN
    INSERT INTO mac_advisors (mac_id, advisor_id, sort_order)
    SELECT id, advisor_id, 0
    FROM macs
    WHERE advisor_id IS NOT NULL
    ON CONFLICT (mac_id, advisor_id) DO NOTHING;
    
    -- Drop the advisor_id column from macs
    ALTER TABLE macs DROP COLUMN advisor_id;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
