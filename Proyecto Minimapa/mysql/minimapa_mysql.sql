-- =====================================================================
--  MINIMAPA - Migracion completa a MySQL (MySQL Workbench)
-- ---------------------------------------------------------------------
--  Base de datos original: Supabase / PostgreSQL
--  Este script recrea TODAS las tablas, relaciones y datos tal cual se
--  usan en la aplicacion (asesores, MACs, programas academicos, POIs,
--  fotos de MAC y transporte).
--
--  REQUISITOS:
--    * MySQL 8.0.13 o superior (se usan DEFAULT (UUID()) y defaults JSON).
--    * Conexion en utf8mb4 para conservar acentos (a, e, i, o, u, n).
--
--  EQUIVALENCIAS Postgres -> MySQL aplicadas:
--    * UUID gen_random_uuid()      -> CHAR(36) DEFAULT (UUID())
--    * TIMESTAMPTZ DEFAULT NOW()   -> DATETIME DEFAULT CURRENT_TIMESTAMP
--    * Trigger set_updated_at()    -> ON UPDATE CURRENT_TIMESTAMP
--    * JSONB                       -> JSON
--    * DOUBLE PRECISION            -> DOUBLE
--    * CHECK (type IN (...))       -> ENUM(...)
--
--  OMITIDO (no aplica en MySQL, era especifico de Supabase):
--    * Row Level Security (RLS) y POLICY  -> el control de acceso ahora
--      es responsabilidad de la aplicacion / del usuario MySQL.
--    * storage.buckets (advisor-photos, mac-photos) -> las imagenes se
--      siguen guardando como URL/texto en las columnas *_url.
--    * NOTIFY pgrst  -> innecesario en MySQL.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Base de datos
-- ---------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `minimapa`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `minimapa`;

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 2) Limpieza (re-ejecutable): borra tablas en orden inverso de FKs
-- ---------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `transport_info`;
DROP TABLE IF EXISTS `pois`;
DROP TABLE IF EXISTS `mac_images`;
DROP TABLE IF EXISTS `macs`;
DROP TABLE IF EXISTS `advisors`;
DROP TABLE IF EXISTS `academic_programs`;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 3) Tabla: academic_programs  (formacion academica del asesor)
-- ---------------------------------------------------------------------
CREATE TABLE `academic_programs` (
  `id`         CHAR(36)     NOT NULL DEFAULT (UUID()),
  `name`       VARCHAR(255) NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_academic_programs_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 4) Tabla: advisors  (asesores)
--    title: la app usa 'Ing' | 'Lic' | 'Dr'
--    pin_color: color del pin en el mapa (override por asesor)
-- ---------------------------------------------------------------------
CREATE TABLE `advisors` (
  `id`                  CHAR(36)     NOT NULL DEFAULT (UUID()),
  `title`               VARCHAR(10)  NOT NULL,
  `name`                VARCHAR(255) NOT NULL,
  `email`               VARCHAR(255) NOT NULL DEFAULT '',
  `phone`               VARCHAR(50)  NOT NULL DEFAULT '',
  `photo_url`           MEDIUMTEXT   NULL,
  `pin_color`           VARCHAR(20)  NULL,
  `academic_program_id` CHAR(36)     NULL,
  `created_at`          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_advisors_academic_program_id` (`academic_program_id`),
  CONSTRAINT `fk_advisors_academic_program`
    FOREIGN KEY (`academic_program_id`)
    REFERENCES `academic_programs` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 5) Tabla: macs  (Modulos de Atencion Comunitaria)
-- ---------------------------------------------------------------------
CREATE TABLE `macs` (
  `id`         CHAR(36)     NOT NULL DEFAULT (UUID()),
  `name`       VARCHAR(255) NOT NULL,
  `lat`        DOUBLE       NOT NULL,
  `lng`        DOUBLE       NOT NULL,
  `details`    TEXT         NOT NULL,
  `schedule`   VARCHAR(255) NOT NULL,
  `image_url`  MEDIUMTEXT   NULL,
  `advisor_id` CHAR(36)     NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_macs_advisor_id` (`advisor_id`),
  CONSTRAINT `fk_macs_advisor`
    FOREIGN KEY (`advisor_id`)
    REFERENCES `advisors` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 6) Tabla: mac_images  (galeria de fotos por MAC)
-- ---------------------------------------------------------------------
CREATE TABLE `mac_images` (
  `id`         CHAR(36)   NOT NULL DEFAULT (UUID()),
  `mac_id`     CHAR(36)   NOT NULL,
  `photo_url`  MEDIUMTEXT NOT NULL,
  `sort_order` INT        NOT NULL DEFAULT 0,
  `created_at` DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mac_images_mac_id` (`mac_id`),
  CONSTRAINT `fk_mac_images_mac`
    FOREIGN KEY (`mac_id`)
    REFERENCES `macs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 7) Tabla: pois  (puntos de interes alrededor de cada MAC)
--    type restringido a hospital | school | services | police
-- ---------------------------------------------------------------------
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
    FOREIGN KEY (`mac_id`)
    REFERENCES `macs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- 8) Tabla: transport_info  (informacion de transporte por MAC)
--    Contrato estable: (mac_name UNIQUE, data JSON)
--    Columnas mac_id / map_embed_url / content se conservan por
--    compatibilidad con versiones previas del esquema.
-- ---------------------------------------------------------------------
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
    FOREIGN KEY (`mac_id`)
    REFERENCES `macs` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  DATOS (SEED)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 9) academic_programs (24 programas)
-- ---------------------------------------------------------------------
INSERT INTO `academic_programs` (`name`) VALUES
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
  ('Doctorado en Ciencias Sociales');

-- ---------------------------------------------------------------------
-- 10) advisors (12 asesores)
--     Jose Alfredo Martinez Avila lleva color azul (#1D4ED8) en el pin,
--     tal como se muestra en la aplicacion.
-- ---------------------------------------------------------------------
INSERT INTO `advisors` (`title`, `name`, `email`, `phone`, `photo_url`, `pin_color`) VALUES
  ('Lic', 'Lina Noemi Higuera Osuna',              '', '', NULL, NULL),
  ('Lic', 'Álbaro Eleazar Álvarez Castro',          '', '', NULL, NULL),
  ('Lic', 'Gisel Guadalupe Galaviz Ramos',          '', '', NULL, NULL),
  ('Lic', 'Ana Karina Ordoñez Melendrez',           '', '', NULL, NULL),
  ('Lic', 'Sandra Paola López Lara',                '', '', NULL, NULL),
  ('Lic', 'Rocío Esther Barajas Aguilar',           '', '', NULL, NULL),
  ('Lic', 'Juan José León Castellanos',             '', '', NULL, NULL),
  ('Lic', 'Luis Alejandro Guerrero Hernández',      '', '', NULL, NULL),
  ('Ing', 'Abel Arnulfo Domínguez Talamante',       '', '', NULL, NULL),
  ('Dr',  'María de los Ángeles Castellanos Osuna',  '', '', NULL, NULL),
  ('Ing', 'José Alfredo Martínez Ávila',            '', '', NULL, '#1D4ED8'),
  ('Lic', 'Cielo Atondo Figueroa',                  '', '', NULL, NULL);

-- ---------------------------------------------------------------------
-- 11) macs (23 modulos) - se vinculan al asesor por nombre
-- ---------------------------------------------------------------------
INSERT INTO `macs` (`name`, `lat`, `lng`, `details`, `schedule`, `advisor_id`) VALUES
  -- Asesor 1: Lina Noemi Higuera Osuna
  ('Gabriel Leyva Solano', 25.9667, -108.8833, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Lina Noemi Higuera Osuna')),
  -- Asesor 2: Álbaro Eleazar Álvarez Castro
  ('Ruiz Cortines', 25.6833, -108.7500, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Álbaro Eleazar Álvarez Castro')),
  ('Juan José Ríos', 25.7589, -108.8222, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Álbaro Eleazar Álvarez Castro')),
  -- Asesor 3: Gisel Guadalupe Galaviz Ramos
  ('San Miguel', 25.9500, -109.0500, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Gisel Guadalupe Galaviz Ramos')),
  ('Guayabo', 25.9333, -109.1167, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Gisel Guadalupe Galaviz Ramos')),
  -- Asesor 4: Ana Karina Ordoñez Melendrez
  ('Flores Magón', 25.8080, -109.0000, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Ana Karina Ordoñez Melendrez')),
  ('Paredones', 25.9500, -109.1500, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Ana Karina Ordoñez Melendrez')),
  -- Asesor 5: Sandra Paola López Lara
  ('Malvinas', 25.7900, -108.9800, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Sandra Paola López Lara')),
  ('Ferrusquilla', 25.8200, -108.9700, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Sandra Paola López Lara')),
  -- Asesor 6: Rocío Esther Barajas Aguilar
  ('9 de Diciembre', 25.7500, -108.9833, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Rocío Esther Barajas Aguilar')),
  ('Álamos', 25.8100, -108.9900, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Rocío Esther Barajas Aguilar')),
  -- Asesor 7: Juan José León Castellanos
  ('Ejido Porvenir', 25.8500, -109.0200, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Juan José León Castellanos')),
  ('Flor Azul', 25.8833, -108.9833, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Juan José León Castellanos')),
  -- Asesor 8: Luis Alejandro Guerrero Hernández
  ('Mochicahui', 25.9333, -108.9333, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Luis Alejandro Guerrero Hernández')),
  ('5 de Mayo', 25.9000, -108.9500, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Luis Alejandro Guerrero Hernández')),
  -- Asesor 9: Abel Arnulfo Domínguez Talamante
  ('Topolobampo', 25.6000, -109.0500, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Abel Arnulfo Domínguez Talamante')),
  ('1ro de Mayo', 25.8000, -108.9500, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Abel Arnulfo Domínguez Talamante')),
  -- Asesor 10: María de los Ángeles Castellanos Osuna
  ('Ahome', 25.9167, -109.1833, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'María de los Ángeles Castellanos Osuna')),
  ('Higuera de Zaragoza', 25.9833, -109.3000, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'María de los Ángeles Castellanos Osuna')),
  -- Asesor 11: Cielo Atondo Figueroa
  ('San Blas', 26.0833, -108.7667, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Cielo Atondo Figueroa')),
  ('Charay', 26.0333, -108.8333, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'Cielo Atondo Figueroa')),
  -- Asesor 12: José Alfredo Martínez Ávila
  ('Bagojo', 25.8667, -109.1000, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'José Alfredo Martínez Ávila')),
  ('Los Mochis', 25.7904, -108.9858, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT `id` FROM `advisors` WHERE `name` = 'José Alfredo Martínez Ávila'));

-- ---------------------------------------------------------------------
-- 12) transport_info (7 registros de rutas de transporte)
-- ---------------------------------------------------------------------
INSERT INTO `transport_info` (`mac_name`, `data`) VALUES
  ('Topolobampo / 1ro de Mayo',
   '{"lineas":[{"empresa":"Azules del Noroeste","telefono":"668 812 3491","terminal":"Callejon Tenochtitlan 399, Centro","color":"blue","rutas":[{"destino":"Topolobampo / 1ro de Mayo","ida":"Cada 20 min, 6:00 am - 8:00 pm. ~$23 (OXXO)","regreso":"Mismo horario en sentido inverso (OXXO)"}]}]}'),
  ('San Blas / Charay',
   '{"lineas":[{"empresa":"Azules del Noroeste","telefono":"668 812 3491","terminal":"Callejon Tenochtitlan 399, Centro","color":"blue","rutas":[{"destino":"San Blas / Charay","ida":"Ruta cubierta - consultar taquilla","regreso":"Mismo servicio de regreso"}]}]}'),
  ('Ahome / Higuera de Zaragoza',
   '{"lineas":[{"empresa":"Azules del Noroeste","telefono":"668 812 3491","terminal":"Callejon Tenochtitlan 399, Centro","color":"blue","rutas":[{"destino":"Ahome","ida":"Ruta Ahome cubierta - consultar taquilla","regreso":"Mismo servicio"},{"destino":"Higuera de Zaragoza","ida":"Taxi/Uber ~$100","regreso":"Taxi/Uber ~$100"}]}]}'),
  ('Gabriel Leyva Solano',
   '{"lineas":[{"empresa":"Azules del Noroeste","telefono":"668 812 3491","terminal":"Callejon Tenochtitlan 399, Centro","color":"blue","rutas":[{"destino":"Gabriel Leyva Solano","ida":"Salidas: 05:55, 07:30, 09:00, 11:35, 12:30, 14:40, 17:20, 18:15, 19:30","regreso":"Mismo servicio de regreso"}]}]}'),
  ('Ruiz Cortines',
   '{"lineas":[{"empresa":"ANS - Norte de Sinaloa","telefono":"668 818 0357","terminal":"Zaragoza 800 Sur","color":"green","rutas":[{"destino":"Ruiz Cortines","ida":"Cada 20 min, 6:00 - 19:40","regreso":"Mismo intervalo de regreso"}]}]}'),
  ('Juan Jose Rios',
   '{"lineas":[{"empresa":"ANS - Norte de Sinaloa","telefono":"668 818 0357","terminal":"Zaragoza 800 Sur","color":"green","rutas":[{"destino":"Juan Jose Rios","ida":"Cada 20 min, 6:00 - 19:40","regreso":"Mismo intervalo de regreso"}]}]}'),
  ('San Miguel',
   '{"lineas":[{"empresa":"ATUSUM (Transporte Urbano/Suburbano)","telefono":"","terminal":"Centro de Los Mochis","color":"orange","rutas":[{"destino":"San Miguel","ida":"Ruta urbana/suburbana sin horario fijo publicado","regreso":"Mismo servicio"}]}]}');

-- =====================================================================
--  VERIFICACION: conteo de filas por tabla
-- =====================================================================
SELECT 'academic_programs' AS tabla, COUNT(*) AS filas FROM `academic_programs`
UNION ALL SELECT 'advisors',       COUNT(*) FROM `advisors`
UNION ALL SELECT 'macs',           COUNT(*) FROM `macs`
UNION ALL SELECT 'mac_images',     COUNT(*) FROM `mac_images`
UNION ALL SELECT 'pois',           COUNT(*) FROM `pois`
UNION ALL SELECT 'transport_info', COUNT(*) FROM `transport_info`;

-- Fin del script.
