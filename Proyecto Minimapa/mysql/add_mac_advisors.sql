-- =============================================
-- Migración: Múltiples asesores por MAC
-- Ejecutar en MySQL una sola vez
-- =============================================

-- 1. Crear tabla intermedia
CREATE TABLE IF NOT EXISTS mac_advisors (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  mac_id      VARCHAR(36)  NOT NULL,
  advisor_id  VARCHAR(36)  NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mac_advisor (mac_id, advisor_id),
  KEY idx_mac_advisors_mac_id     (mac_id),
  KEY idx_mac_advisors_advisor_id (advisor_id),
  CONSTRAINT fk_ma_mac     FOREIGN KEY (mac_id)     REFERENCES macs(id)     ON DELETE CASCADE,
  CONSTRAINT fk_ma_advisor FOREIGN KEY (advisor_id) REFERENCES advisors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Migrar relaciones existentes (advisor_id en macs -> mac_advisors)
INSERT IGNORE INTO mac_advisors (id, mac_id, advisor_id, sort_order)
SELECT UUID(), id, advisor_id, 0
FROM macs
WHERE advisor_id IS NOT NULL;

-- 3. (Opcional) Quitar la columna advisor_id de macs una vez verificado
-- ALTER TABLE macs DROP COLUMN advisor_id;

SELECT CONCAT('Migradas ', COUNT(*), ' relaciones asesor-MAC') AS resultado
FROM mac_advisors;
