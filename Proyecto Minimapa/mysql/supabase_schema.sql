-- =====================================================================
--  MINIMAPA - Esquema completo para Supabase (Postgres)
-- ---------------------------------------------------------------------
--  Recrea las tablas, relaciones, RLS y buckets de Storage que usa la
--  app. Ejecutar UNA VEZ en el SQL Editor del proyecto Supabase antes
--  de correr migrate_to_supabase.js (ese script inserta los datos y
--  las fotos reales que hoy viven en MySQL).
--
--  No inserta datos semilla: los datos reales se insertan despues,
--  preservando los UUID originales de MySQL para que las relaciones
--  (advisor_id, mac_id, academic_program_id) no se rompan.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── academic_programs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE academic_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de academic_programs" ON academic_programs;
CREATE POLICY "Lectura publica de academic_programs"
  ON academic_programs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin puede modificar academic_programs" ON academic_programs;
CREATE POLICY "Admin puede modificar academic_programs"
  ON academic_programs FOR ALL USING (auth.role() = 'authenticated');

-- ─── advisors ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advisors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  pin_color TEXT,
  academic_program_id UUID REFERENCES academic_programs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE advisors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de advisors" ON advisors;
CREATE POLICY "Lectura publica de advisors"
  ON advisors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin puede modificar advisors" ON advisors;
CREATE POLICY "Admin puede modificar advisors"
  ON advisors FOR ALL USING (auth.role() = 'authenticated');

-- ─── macs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS macs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  details TEXT NOT NULL,
  schedule TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE macs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de macs" ON macs;
CREATE POLICY "Lectura publica de macs"
  ON macs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin puede modificar macs" ON macs;
CREATE POLICY "Admin puede modificar macs"
  ON macs FOR ALL USING (auth.role() = 'authenticated');

-- ─── mac_advisors (multi-asesor) ───────────────────────────────────────
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

ALTER TABLE mac_advisors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de mac_advisors" ON mac_advisors;
CREATE POLICY "Lectura publica de mac_advisors"
  ON mac_advisors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin puede modificar mac_advisors" ON mac_advisors;
CREATE POLICY "Admin puede modificar mac_advisors"
  ON mac_advisors FOR ALL USING (auth.role() = 'authenticated');

-- ─── mac_images (galeria de fotos) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS mac_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mac_id UUID NOT NULL REFERENCES macs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mac_images_mac_id ON mac_images(mac_id);

ALTER TABLE mac_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de mac_images" ON mac_images;
CREATE POLICY "Lectura publica de mac_images"
  ON mac_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin puede modificar mac_images" ON mac_images;
CREATE POLICY "Admin puede modificar mac_images"
  ON mac_images FOR ALL USING (auth.role() = 'authenticated');

-- ─── pois ─────────────────────────────────────────────────────────────
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
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE pois ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de pois" ON pois;
CREATE POLICY "Lectura publica de pois"
  ON pois FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin puede modificar pois" ON pois;
CREATE POLICY "Admin puede modificar pois"
  ON pois FOR ALL USING (auth.role() = 'authenticated');

-- ─── transport_info ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transport_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mac_name TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{"lineas":[]}'::jsonb,
  mac_id UUID REFERENCES macs(id) ON DELETE CASCADE,
  map_embed_url TEXT,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transport_info_mac_id ON transport_info(mac_id);

DROP TRIGGER IF EXISTS trg_transport_info_updated_at ON transport_info;
CREATE TRIGGER trg_transport_info_updated_at
BEFORE UPDATE ON transport_info
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE transport_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de transport_info" ON transport_info;
CREATE POLICY "Lectura publica de transport_info"
  ON transport_info FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin puede modificar transport_info" ON transport_info;
CREATE POLICY "Admin puede modificar transport_info"
  ON transport_info FOR ALL USING (auth.role() = 'authenticated');

-- ─── Storage: buckets publicos para fotos ──────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('advisor-photos', 'advisor-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('mac-photos', 'mac-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read advisor photos" ON storage.objects;
CREATE POLICY "Public read advisor photos"
  ON storage.objects FOR SELECT USING (bucket_id = 'advisor-photos');

DROP POLICY IF EXISTS "Authenticated upload advisor photos" ON storage.objects;
CREATE POLICY "Authenticated upload advisor photos"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'advisor-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update advisor photos" ON storage.objects;
CREATE POLICY "Authenticated update advisor photos"
  ON storage.objects FOR UPDATE USING (bucket_id = 'advisor-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete advisor photos" ON storage.objects;
CREATE POLICY "Authenticated delete advisor photos"
  ON storage.objects FOR DELETE USING (bucket_id = 'advisor-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read mac photos" ON storage.objects;
CREATE POLICY "Public read mac photos"
  ON storage.objects FOR SELECT USING (bucket_id = 'mac-photos');

DROP POLICY IF EXISTS "Authenticated upload mac photos" ON storage.objects;
CREATE POLICY "Authenticated upload mac photos"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'mac-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update mac photos" ON storage.objects;
CREATE POLICY "Authenticated update mac photos"
  ON storage.objects FOR UPDATE USING (bucket_id = 'mac-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete mac photos" ON storage.objects;
CREATE POLICY "Authenticated delete mac photos"
  ON storage.objects FOR DELETE USING (bucket_id = 'mac-photos' AND auth.role() = 'authenticated');

-- IMPORTANTE: como el service_role key que usa el script de migracion
-- ignora RLS, la carga de datos funciona aunque las policies de arriba
-- exijan auth.role() = 'authenticated' para escribir.

NOTIFY pgrst, 'reload schema';

-- ─── Verificacion ───────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('academic_programs','advisors','macs','mac_advisors','mac_images','pois','transport_info')
ORDER BY table_name;
