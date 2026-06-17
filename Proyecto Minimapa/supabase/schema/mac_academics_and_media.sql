-- =============================================
-- Formacion academica (asesor) + fotos multiples MAC
-- =============================================

CREATE TABLE IF NOT EXISTS academic_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE academic_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de academic_programs" ON academic_programs;
CREATE POLICY "Lectura publica de academic_programs"
  ON academic_programs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin puede modificar academic_programs" ON academic_programs;
CREATE POLICY "Admin puede modificar academic_programs"
  ON academic_programs FOR ALL
  USING (auth.role() = 'authenticated');

ALTER TABLE advisors ADD COLUMN IF NOT EXISTS academic_program_id UUID REFERENCES academic_programs(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'macs'
      AND column_name = 'academic_program_id'
  ) THEN
    UPDATE advisors a
    SET academic_program_id = src.academic_program_id
    FROM (
      SELECT DISTINCT ON (advisor_id)
        advisor_id,
        academic_program_id
      FROM macs
      WHERE advisor_id IS NOT NULL
        AND academic_program_id IS NOT NULL
      ORDER BY advisor_id, created_at DESC NULLS LAST, name ASC
    ) src
    WHERE a.id = src.advisor_id
      AND a.academic_program_id IS NULL;

    ALTER TABLE macs DROP COLUMN academic_program_id;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS mac_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mac_id UUID NOT NULL REFERENCES macs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mac_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de mac_images" ON mac_images;
CREATE POLICY "Lectura publica de mac_images"
  ON mac_images FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin puede modificar mac_images" ON mac_images;
CREATE POLICY "Admin puede modificar mac_images"
  ON mac_images FOR ALL
  USING (auth.role() = 'authenticated');

INSERT INTO storage.buckets (id, name, public)
VALUES ('mac-photos', 'mac-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read mac photos" ON storage.objects;
CREATE POLICY "Public read mac photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mac-photos');

DROP POLICY IF EXISTS "Authenticated upload mac photos" ON storage.objects;
CREATE POLICY "Authenticated upload mac photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'mac-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update mac photos" ON storage.objects;
CREATE POLICY "Authenticated update mac photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'mac-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated delete mac photos" ON storage.objects;
CREATE POLICY "Authenticated delete mac photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'mac-photos' AND auth.role() = 'authenticated');

INSERT INTO academic_programs (name)
VALUES
  ('Lic. en Derecho'),
  ('Lic. en Psicologia'),
  ('Lic. en Trabajo Social'),
  ('Lic. en Educacion'),
  ('Lic. en Administracion'),
  ('Lic. en Contaduria'),
  ('Lic. en Enfermeria'),
  ('Lic. en Nutricion'),
  ('Lic. en Comunicacion'),
  ('Lic. en Mercadotecnia'),
  ('Ing. Civil'),
  ('Ing. en Software'),
  ('Ing. en Sistemas Computacionales'),
  ('Ing. Industrial'),
  ('Ing. Mecatronica'),
  ('Ing. Electrica'),
  ('Ing. Arquitectura'),
  ('Ing. Agronoma'),
  ('Medico General'),
  ('Odontologia'),
  ('Maestria en Educacion'),
  ('Maestria en Administracion'),
  ('Doctorado en Educacion'),
  ('Doctorado en Ciencias Sociales')
ON CONFLICT (name) DO NOTHING;
