-- =========================================================
-- Move academic program ownership from MAC to Advisor
-- =========================================================

ALTER TABLE advisors
ADD COLUMN IF NOT EXISTS academic_program_id UUID REFERENCES academic_programs(id) ON DELETE SET NULL;

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

NOTIFY pgrst, 'reload schema';
