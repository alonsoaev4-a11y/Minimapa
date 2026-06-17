-- =============================================
-- EXTENSIONES ADMIN: Transporte + Storage Fotos
-- Contrato estable: transport_info(mac_name, data)
-- Compatible con esquemas legacy/mixtos
-- =============================================

-- Base minima para transporte (legacy usada por frontend)
CREATE TABLE IF NOT EXISTS transport_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mac_name TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transport_info
ADD COLUMN IF NOT EXISTS mac_name TEXT;

ALTER TABLE transport_info
ADD COLUMN IF NOT EXISTS data JSONB;

ALTER TABLE transport_info
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE transport_info
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Compatibilidad con columnas agregadas por scripts anteriores
ALTER TABLE transport_info
ADD COLUMN IF NOT EXISTS mac_id UUID REFERENCES macs(id) ON DELETE CASCADE;

ALTER TABLE transport_info
ADD COLUMN IF NOT EXISTS map_embed_url TEXT;

ALTER TABLE transport_info
ADD COLUMN IF NOT EXISTS content JSONB;

-- Si existe content en formato nuevo, intentar normalizar a data legacy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transport_info'
      AND column_name = 'content'
  ) THEN
    UPDATE transport_info
    SET data = COALESCE(
      data,
      CASE
        WHEN content ? 'lineas' THEN content
        WHEN content ? 'lines' THEN jsonb_build_object('lineas', content->'lines')
        ELSE NULL
      END
    )
    WHERE data IS NULL
      AND content IS NOT NULL;
  END IF;
END $$;

-- Si hay mac_id, intentar completar mac_name faltante
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transport_info'
      AND column_name = 'mac_id'
  ) THEN
    UPDATE transport_info t
    SET mac_name = m.name
    FROM macs m
    WHERE t.mac_name IS NULL
      AND t.mac_id = m.id;
  END IF;
END $$;

-- Garantizar valores requeridos por app (evita errores NOT NULL)
UPDATE transport_info
SET data = '{"lineas":[]}'::jsonb
WHERE data IS NULL;

UPDATE transport_info
SET mac_name = CONCAT('MAC ', id::text)
WHERE mac_name IS NULL OR btrim(mac_name) = '';

-- Evitar conflictos al crear UNIQUE(mac_name)
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY mac_name
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM transport_info
)
DELETE FROM transport_info t
USING ranked r
WHERE t.id = r.id
  AND r.rn > 1;

ALTER TABLE transport_info
ALTER COLUMN mac_name SET NOT NULL;

ALTER TABLE transport_info
ALTER COLUMN data SET NOT NULL;

ALTER TABLE transport_info
ALTER COLUMN data SET DEFAULT '{"lineas":[]}'::jsonb;

ALTER TABLE transport_info
ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE transport_info
ALTER COLUMN updated_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transport_info_mac_name_key'
      AND conrelid = 'transport_info'::regclass
  ) THEN
    ALTER TABLE transport_info
    ADD CONSTRAINT transport_info_mac_name_key UNIQUE (mac_name);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transport_info_updated_at ON transport_info;
CREATE TRIGGER trg_transport_info_updated_at
BEFORE UPDATE ON transport_info
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE transport_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de transport_info" ON transport_info;
CREATE POLICY "Lectura publica de transport_info"
  ON transport_info FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin puede modificar transport_info" ON transport_info;
CREATE POLICY "Admin puede modificar transport_info"
  ON transport_info FOR ALL
  USING (auth.role() = 'authenticated');

-- Bucket para fotos de asesores
INSERT INTO storage.buckets (id, name, public)
VALUES ('advisor-photos', 'advisor-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Politicas de lectura/escritura para bucket advisor-photos
DROP POLICY IF EXISTS "Public read advisor photos" ON storage.objects;
CREATE POLICY "Public read advisor photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'advisor-photos');

DROP POLICY IF EXISTS "Authenticated upload advisor photos" ON storage.objects;
CREATE POLICY "Authenticated upload advisor photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'advisor-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update advisor photos" ON storage.objects;
CREATE POLICY "Authenticated update advisor photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'advisor-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete advisor photos" ON storage.objects;
CREATE POLICY "Authenticated delete advisor photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'advisor-photos' AND auth.role() = 'authenticated');
