# -*- coding: utf-8 -*-
"""
Genera minimapa_mysql.sql a partir del export REAL de Supabase
(carpeta export_supabase/*.json). Preserva UUIDs, fotos (URLs),
timestamps y relaciones tal cual estan en produccion.
"""
import json, os, unicodedata
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
EXP = os.path.join(HERE, 'export_supabase')
OUT = os.path.join(HERE, 'minimapa_mysql.sql')

def load(t):
    with open(os.path.join(EXP, t + '.json'), encoding='utf-8') as f:
        return json.load(f)

def norm(n):
    return ''.join(c for c in unicodedata.normalize('NFD', (n or '').lower())
                   if unicodedata.category(c) != 'Mn').strip()

def esc(v):
    """String -> literal SQL con comillas, o NULL."""
    if v is None:
        return 'NULL'
    s = str(v)
    s = s.replace('\\', '\\\\').replace("'", "''")
    return "'" + s + "'"

def num(v):
    return 'NULL' if v is None else str(v)

def dt(v):
    if v is None:
        return 'NULL'
    try:
        d = datetime.fromisoformat(str(v))
        return "'" + d.strftime('%Y-%m-%d %H:%M:%S') + "'"
    except Exception:
        return esc(v)

def jval(v):
    if v is None:
        return 'NULL'
    return esc(json.dumps(v, ensure_ascii=False))

ap = load('academic_programs')
adv = load('advisors')
macs = load('macs')
mimg = load('mac_images')
pois = load('pois')
tinfo = load('transport_info')

SCHEMA = r"""-- =====================================================================
--  MINIMAPA - Migracion completa a MySQL (MySQL Workbench)
-- ---------------------------------------------------------------------
--  Origen: Supabase / PostgreSQL  (export EN VIVO via REST API)
--  Este archivo recrea TODAS las tablas, relaciones y los DATOS REALES
--  actuales de produccion: asesores, MACs, programas academicos, POIs,
--  galerias de fotos (mac_images) y transporte. Conserva los UUID y las
--  URLs de fotos originales (Supabase Storage, buckets publicos).
--
--  REQUISITOS:
--    * MySQL 8.0.13 o superior (DEFAULT (UUID()) y defaults JSON).
--    * Conexion en utf8mb4 para conservar acentos.
--
--  EQUIVALENCIAS Postgres -> MySQL:
--    UUID gen_random_uuid() -> CHAR(36) DEFAULT (UUID())
--    TIMESTAMPTZ / trigger  -> DATETIME + ON UPDATE CURRENT_TIMESTAMP
--    JSONB -> JSON | DOUBLE PRECISION -> DOUBLE | CHECK -> ENUM
--  OMITIDO (especifico de Supabase): RLS/POLICY, storage.buckets, NOTIFY.
--  FOTOS: se conservan como URL en las columnas *_url (igual que la app) y,
--  ademas, los bytes reales se incrustan en columnas LONGBLOB (*_blob) via
--  el script embed_photos_blob.py -> la BD queda autosuficiente.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `minimapa`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `minimapa`;
SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `transport_info`;
DROP TABLE IF EXISTS `pois`;
DROP TABLE IF EXISTS `mac_images`;
DROP TABLE IF EXISTS `macs`;
DROP TABLE IF EXISTS `advisors`;
DROP TABLE IF EXISTS `academic_programs`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `academic_programs` (
  `id`         CHAR(36)     NOT NULL DEFAULT (UUID()),
  `name`       VARCHAR(255) NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_academic_programs_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `advisors` (
  `id`                  CHAR(36)     NOT NULL DEFAULT (UUID()),
  `title`               VARCHAR(10)  NOT NULL,
  `name`                VARCHAR(255) NOT NULL,
  `email`               VARCHAR(255) NOT NULL DEFAULT '',
  `phone`               VARCHAR(50)  NOT NULL DEFAULT '',
  `photo_url`           MEDIUMTEXT   NULL,
  `photo_blob`          LONGBLOB     NULL,
  `photo_mime`          VARCHAR(100) NULL,
  `pin_color`           VARCHAR(20)  NULL,
  `academic_program_id` CHAR(36)     NULL,
  `created_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_advisors_academic_program_id` (`academic_program_id`),
  CONSTRAINT `fk_advisors_academic_program`
    FOREIGN KEY (`academic_program_id`) REFERENCES `academic_programs` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `macs` (
  `id`         CHAR(36)     NOT NULL DEFAULT (UUID()),
  `name`       VARCHAR(255) NOT NULL,
  `lat`        DOUBLE       NOT NULL,
  `lng`        DOUBLE       NOT NULL,
  `details`    TEXT         NOT NULL,
  `schedule`   VARCHAR(255) NOT NULL,
  `image_url`  MEDIUMTEXT   NULL,
  `image_blob` LONGBLOB     NULL,
  `image_mime` VARCHAR(100) NULL,
  `advisor_id` CHAR(36)     NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_macs_advisor_id` (`advisor_id`),
  CONSTRAINT `fk_macs_advisor`
    FOREIGN KEY (`advisor_id`) REFERENCES `advisors` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mac_images` (
  `id`         CHAR(36)   NOT NULL DEFAULT (UUID()),
  `mac_id`     CHAR(36)   NOT NULL,
  `photo_url`  MEDIUMTEXT NOT NULL,
  `photo_blob` LONGBLOB   NULL,
  `photo_mime` VARCHAR(100) NULL,
  `sort_order` INT        NOT NULL DEFAULT 0,
  `created_at` DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mac_images_mac_id` (`mac_id`),
  CONSTRAINT `fk_mac_images_mac`
    FOREIGN KEY (`mac_id`) REFERENCES `macs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pois` (
  `id`          CHAR(36)     NOT NULL DEFAULT (UUID()),
  `mac_id`      CHAR(36)     NOT NULL,
  `type`        ENUM('hospital','school','services','police') NOT NULL,
  `name`        VARCHAR(255) NOT NULL,
  `description` TEXT         NOT NULL DEFAULT (''),
  `lat`         DOUBLE       NOT NULL,
  `lng`         DOUBLE       NOT NULL,
  `image_url`   MEDIUMTEXT   NULL,
  `sort_order`  INT          NOT NULL DEFAULT 0,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pois_mac_id` (`mac_id`),
  KEY `idx_pois_type` (`type`),
  CONSTRAINT `fk_pois_mac`
    FOREIGN KEY (`mac_id`) REFERENCES `macs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `transport_info` (
  `id`            CHAR(36)     NOT NULL DEFAULT (UUID()),
  `mac_name`      VARCHAR(255) NOT NULL,
  `data`          JSON         NOT NULL DEFAULT (JSON_OBJECT('lineas', JSON_ARRAY())),
  `mac_id`        CHAR(36)     NULL,
  `map_embed_url` TEXT         NULL,
  `content`       JSON         NULL,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_transport_info_mac_name` (`mac_name`),
  KEY `idx_transport_info_mac_id` (`mac_id`),
  CONSTRAINT `fk_transport_info_mac`
    FOREIGN KEY (`mac_id`) REFERENCES `macs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

"""

lines = [SCHEMA]
P = lines.append

# academic_programs
P("-- ===== academic_programs (%d) =====" % len(ap))
P("INSERT INTO `academic_programs` (`id`,`name`,`created_at`) VALUES")
P(",\n".join("  (%s,%s,%s)" % (esc(r['id']), esc(r['name']), dt(r['created_at'])) for r in ap) + ";\n")

# advisors  (Jose Alfredo Martinez Avila -> pin azul #1D4ED8)
P("-- ===== advisors (%d) =====" % len(adv))
P("INSERT INTO `advisors` (`id`,`title`,`name`,`email`,`phone`,`photo_url`,`pin_color`,`academic_program_id`,`created_at`) VALUES")
rows = []
for r in adv:
    pin = r.get('pin_color')
    if norm(r['name']) == 'jose alfredo martinez avila':
        pin = '#1D4ED8'
    rows.append("  (%s,%s,%s,%s,%s,%s,%s,%s,%s)" % (
        esc(r['id']), esc(r['title']), esc(r['name']), esc(r.get('email') or ''),
        esc(r.get('phone') or ''), esc(r.get('photo_url')), esc(pin),
        esc(r.get('academic_program_id')), dt(r['created_at'])))
P(",\n".join(rows) + ";\n")

# macs
P("-- ===== macs (%d) =====" % len(macs))
P("INSERT INTO `macs` (`id`,`name`,`lat`,`lng`,`details`,`schedule`,`image_url`,`advisor_id`,`created_at`) VALUES")
P(",\n".join("  (%s,%s,%s,%s,%s,%s,%s,%s,%s)" % (
    esc(r['id']), esc(r['name']), num(r['lat']), num(r['lng']), esc(r['details']),
    esc(r['schedule']), esc(r.get('image_url')), esc(r.get('advisor_id')), dt(r['created_at'])
) for r in macs) + ";\n")

# mac_images (fotos)
P("-- ===== mac_images / GALERIA DE FOTOS (%d) =====" % len(mimg))
P("INSERT INTO `mac_images` (`id`,`mac_id`,`photo_url`,`sort_order`,`created_at`) VALUES")
P(",\n".join("  (%s,%s,%s,%s,%s)" % (
    esc(r['id']), esc(r['mac_id']), esc(r['photo_url']), num(r.get('sort_order') or 0), dt(r['created_at'])
) for r in mimg) + ";\n")

# pois
if pois:
    P("-- ===== pois (%d) =====" % len(pois))
    P("INSERT INTO `pois` (`id`,`mac_id`,`type`,`name`,`description`,`lat`,`lng`,`image_url`,`sort_order`,`created_at`,`updated_at`) VALUES")
    P(",\n".join("  (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)" % (
        esc(r['id']), esc(r['mac_id']), esc(r['type']), esc(r['name']), esc(r.get('description') or ''),
        num(r['lat']), num(r['lng']), esc(r.get('image_url')), num(r.get('sort_order') or 0),
        dt(r['created_at']), dt(r.get('updated_at'))
    ) for r in pois) + ";\n")

# transport_info
P("-- ===== transport_info (%d) =====" % len(tinfo))
P("INSERT INTO `transport_info` (`id`,`mac_name`,`data`,`created_at`,`updated_at`) VALUES")
P(",\n".join("  (%s,%s,%s,%s,%s)" % (
    esc(r['id']), esc(r['mac_name']), jval(r['data']), dt(r['created_at']), dt(r.get('updated_at'))
) for r in tinfo) + ";\n")

# verificacion
P("""-- ===== verificacion =====
SELECT 'academic_programs' AS tabla, COUNT(*) AS filas FROM `academic_programs`
UNION ALL SELECT 'advisors',       COUNT(*) FROM `advisors`
UNION ALL SELECT 'macs',           COUNT(*) FROM `macs`
UNION ALL SELECT 'mac_images',     COUNT(*) FROM `mac_images`
UNION ALL SELECT 'pois',           COUNT(*) FROM `pois`
UNION ALL SELECT 'transport_info', COUNT(*) FROM `transport_info`;""")

with open(OUT, 'w', encoding='utf-8') as f:
    f.write("\n".join(lines))

print("OK ->", OUT)
print("academic_programs=%d advisors=%d macs=%d mac_images=%d pois=%d transport_info=%d" % (
    len(ap), len(adv), len(macs), len(mimg), len(pois), len(tinfo)))
print("advisors con foto:", sum(1 for r in adv if r.get('photo_url')))
print("macs con portada:", sum(1 for r in macs if r.get('image_url')))
