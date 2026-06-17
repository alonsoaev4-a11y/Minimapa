-- =====================================================================
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


-- ===== academic_programs (24) =====
INSERT INTO `academic_programs` (`id`,`name`,`created_at`) VALUES
  ('c3b0c464-e528-464b-98d2-9bc808b95505','Lic. en Derecho','2026-03-21 04:42:59'),
  ('496c584c-f738-41f3-9d45-bcc924a07cd6','Lic. en Psicologia','2026-03-21 04:42:59'),
  ('2fa0a171-9656-4e6d-bba9-51570b3091c0','Lic. en Trabajo Social','2026-03-21 04:42:59'),
  ('a08d32a3-45fb-40b1-8c59-866007374b6c','Lic. en Educacion','2026-03-21 04:42:59'),
  ('9201d99a-7713-4285-9f6a-4660f8480479','Lic. en Administracion','2026-03-21 04:42:59'),
  ('30acbc35-379a-40eb-9d69-8db194365834','Lic. en Contaduria','2026-03-21 04:42:59'),
  ('35330fb0-e96f-4c49-904b-8a2c870d0a25','Lic. en Enfermeria','2026-03-21 04:42:59'),
  ('7d395e7b-b725-4e91-8721-c412449b8bb7','Lic. en Nutricion','2026-03-21 04:42:59'),
  ('18906606-a134-4940-a595-3cd4e90fc1d1','Lic. en Comunicacion','2026-03-21 04:42:59'),
  ('f606797c-69c4-450b-9086-094244729226','Lic. en Mercadotecnia','2026-03-21 04:42:59'),
  ('921ff69e-d3bd-4d83-9300-063f0d81c775','Ing. Civil','2026-03-21 04:42:59'),
  ('1516d250-fedc-4464-8beb-140fceb80436','Ing. en Software','2026-03-21 04:42:59'),
  ('2d9b298a-ee34-4468-a309-d69783dc5bcf','Ing. en Sistemas Computacionales','2026-03-21 04:42:59'),
  ('137e5058-5124-429a-b2bd-e8f573051c83','Ing. Industrial','2026-03-21 04:42:59'),
  ('73385fd7-97a9-48b6-ab8c-f677c2c35889','Ing. Mecatronica','2026-03-21 04:42:59'),
  ('af19b906-a464-4234-a9f4-1f5585cc36ad','Ing. Electrica','2026-03-21 04:42:59'),
  ('e459377f-7d01-49da-ad0e-739029e316ce','Ing. Arquitectura','2026-03-21 04:42:59'),
  ('b326b1f0-7784-4fbc-9adb-df5c2b08e45e','Ing. Agronoma','2026-03-21 04:42:59'),
  ('ceb51fd1-401c-4de0-96ae-11549bc168fb','Medico General','2026-03-21 04:42:59'),
  ('e019de95-cdeb-4172-ae42-c6a290bf61b4','Odontologia','2026-03-21 04:42:59'),
  ('d79d6b10-5aa3-4854-847d-e6f17f43969f','Maestria en Educacion','2026-03-21 04:42:59'),
  ('ecda9e01-d3c1-4353-8786-2fc2303d4456','Maestria en Administracion','2026-03-21 04:42:59'),
  ('056e9e23-5b64-40b0-9ef6-33d342568994','Doctorado en Educacion','2026-03-21 04:42:59'),
  ('11aca617-fc81-48c4-a61c-35bf42d72846','Doctorado en Ciencias Sociales','2026-03-21 04:42:59');

-- ===== advisors (14) =====
INSERT INTO `advisors` (`id`,`title`,`name`,`email`,`phone`,`photo_url`,`pin_color`,`academic_program_id`,`created_at`) VALUES
  ('7a0d4190-92c8-4221-ba45-22273594d7f5','Lic','Lina Noemi Higuera Osuna','','',NULL,NULL,'137e5058-5124-429a-b2bd-e8f573051c83','2026-03-21 04:42:59'),
  ('a4315864-1602-40b2-b35b-7ecfb1625590','Dr','María de los Ángeles Castellanos Osuna','','','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/advisor-photos/advisor-a4315864-1602-40b2-b35b-7ecfb1625590-1778050437483.jpg',NULL,NULL,'2026-03-21 04:42:59'),
  ('656eaf1a-6bd1-4290-89f1-04e7489d5a88','Lic','Sandra Paola López Lara','','','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/advisor-photos/advisor-656eaf1a-6bd1-4290-89f1-04e7489d5a88-1778088122834.jpg',NULL,NULL,'2026-03-21 04:42:59'),
  ('0ad0f55d-74f2-43fa-b31d-f2aaed0580d6','Lic','Rocío Esther Barajas Aguilar','','','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/advisor-photos/advisor-0ad0f55d-74f2-43fa-b31d-f2aaed0580d6-1778088297663.jpg',NULL,NULL,'2026-03-21 04:42:59'),
  ('60ae2164-6ec6-42a4-984a-6a3cb85c7b93','Ing','José Alfredo Martínez Ávila','','','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/advisor-photos/advisor-60ae2164-6ec6-42a4-984a-6a3cb85c7b93-1778088253521.jpg','#1D4ED8','921ff69e-d3bd-4d83-9300-063f0d81c775','2026-03-21 04:42:59'),
  ('b62932b7-6490-4ca0-8419-97b8bea6b9d0','Lic','Juan José León Castellanos','','','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/advisor-photos/advisor-b62932b7-6490-4ca0-8419-97b8bea6b9d0-1780599833870.jpg',NULL,NULL,'2026-03-21 04:42:59'),
  ('9cb36591-4d7c-40b2-8c65-0f06b6512460','Lic','Ana Karina Ordoñez Melendrez','','','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/advisor-photos/advisor-9cb36591-4d7c-40b2-8c65-0f06b6512460-1781027786170.jpg',NULL,NULL,'2026-03-21 04:42:59'),
  ('04312b5a-300c-4e9b-a8df-1e47c1211d35','Lic','Luis Alejandro Guerrero Hernández','','','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/advisor-photos/advisor-04312b5a-300c-4e9b-a8df-1e47c1211d35-1781027799372.jpg',NULL,NULL,'2026-03-21 04:42:59'),
  ('91e8254b-f282-4ece-9af9-1084b8b42e49','Ing','Abel Arnulfo Domínguez Talamante','','','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/advisor-photos/advisor-91e8254b-f282-4ece-9af9-1084b8b42e49-1781027819167.jpg',NULL,NULL,'2026-03-21 04:42:59'),
  ('1c52fb2d-f06f-4308-a125-a9d9c8fdb407','Lic','Cielo Atondo Figueroa','','','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/advisor-photos/advisor-1c52fb2d-f06f-4308-a125-a9d9c8fdb407-1781027830386.jpg',NULL,NULL,'2026-03-21 04:42:59'),
  ('93362441-2dd2-4f1a-9d54-a5243da0a0b8','Lic','Gisel Guadalupe Galaviz Ramos','','','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/advisor-photos/advisor-93362441-2dd2-4f1a-9d54-a5243da0a0b8-1781027931204.jpg',NULL,'11aca617-fc81-48c4-a61c-35bf42d72846','2026-03-21 04:42:59'),
  ('ab1790b8-ccf8-4171-9395-565609a8643c','Lic','Álvaro Eleazar Álvarez Castro','','','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/advisor-photos/advisor-ab1790b8-ccf8-4171-9395-565609a8643c-1781027996437.jpg',NULL,'137e5058-5124-429a-b2bd-e8f573051c83','2026-03-21 04:42:59'),
  ('5d7bdee4-33f7-4181-9f6e-6cc3f6d0eb4c','Ing','Graciela Brenice Argüelles Cardenas','','','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/advisor-photos/advisor-5d7bdee4-33f7-4181-9f6e-6cc3f6d0eb4c-1781029865535.jpg',NULL,NULL,'2026-06-09 18:03:24'),
  ('3c474bc8-e0bb-4843-add3-abae63dc5198','Lic','Ana Laura Arellanes Espinoza','','','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/advisor-photos/advisor-3c474bc8-e0bb-4843-add3-abae63dc5198-1781060789290.jpg',NULL,NULL,'2026-06-09 18:09:27');

-- ===== macs (24) =====
INSERT INTO `macs` (`id`,`name`,`lat`,`lng`,`details`,`schedule`,`image_url`,`advisor_id`,`created_at`) VALUES
  ('29a86320-d580-4b8e-b2b2-3e40f638813f','Juan José Ríos',25.7589,-108.8222,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m',NULL,'ab1790b8-ccf8-4171-9395-565609a8643c','2026-03-21 04:42:59'),
  ('83cb022d-5d52-4f0f-a979-0bb5b6695f23','Flores Magón',25.808,-109,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m',NULL,'9cb36591-4d7c-40b2-8c65-0f06b6512460','2026-03-21 04:42:59'),
  ('f9839df8-2d5b-4e46-a596-784442c11a78','Paredones',25.95,-109.15,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m',NULL,'9cb36591-4d7c-40b2-8c65-0f06b6512460','2026-03-21 04:42:59'),
  ('4ac15c8e-036f-4aea-bb8c-dcf841e1179b','Mochicahui',25.9333,-108.9333,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m',NULL,'04312b5a-300c-4e9b-a8df-1e47c1211d35','2026-03-21 04:42:59'),
  ('8c8db6ec-ee6d-4a05-b488-42678fc1d684','5 de Mayo',25.9,-108.95,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m',NULL,'04312b5a-300c-4e9b-a8df-1e47c1211d35','2026-03-21 04:42:59'),
  ('b1e6d5d1-ae0a-49c6-a882-c09b9e4bbbb2','Topolobampo',25.6,-109.05,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m',NULL,'91e8254b-f282-4ece-9af9-1084b8b42e49','2026-03-21 04:42:59'),
  ('19af1803-44c6-4680-9e89-858aee0be15f','1ro de Mayo',25.8,-108.95,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m',NULL,'91e8254b-f282-4ece-9af9-1084b8b42e49','2026-03-21 04:42:59'),
  ('78bfe44d-da49-48fd-8321-19bf62b12d26','San Blas',26.0833,-108.7667,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m',NULL,'1c52fb2d-f06f-4308-a125-a9d9c8fdb407','2026-03-21 04:42:59'),
  ('5d426412-3e58-462d-b0b8-e39367b0b5c3','Charay',26.0333,-108.8333,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m',NULL,'1c52fb2d-f06f-4308-a125-a9d9c8fdb407','2026-03-21 04:42:59'),
  ('97f307a2-7320-452a-8344-0bf2ae531999','Gabriel Leyva Solano',25.9667,-108.8833,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m',NULL,'7a0d4190-92c8-4221-ba45-22273594d7f5','2026-03-21 04:42:59'),
  ('5d6f7686-9472-4d79-a870-fb0d63b6fbd4','MAC Central Los Mochis',25.81244,-108.981436,'Modulo Central de atencion estudiantil','9:00 am - 2:00 pm',NULL,NULL,'2026-06-09 18:16:08'),
  ('fbdb7f51-514e-41bc-b85b-356c42102528','Ferrusquilla',25.82,-108.97,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-fbdb7f51-514e-41bc-b85b-356c42102528-1778088427609-0.jpg','656eaf1a-6bd1-4290-89f1-04e7489d5a88','2026-03-21 04:42:59'),
  ('94a43821-2b6d-43bf-b13f-086f51b955a3','Flor Azul',25.8833,-108.9833,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-94a43821-2b6d-43bf-b13f-086f51b955a3-1778088923714-0.jpg','b62932b7-6490-4ca0-8419-97b8bea6b9d0','2026-03-21 04:42:59'),
  ('cfad50c6-cf1b-4eaa-a409-f730d9299fa9','Ruiz Cortines',25.705423,-108.721733,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-cfad50c6-cf1b-4eaa-a409-f730d9299fa9-1774073934256-0.jpg','ab1790b8-ccf8-4171-9395-565609a8643c','2026-03-21 04:42:59'),
  ('d086da78-7719-4232-a2dd-3e699246982c','Higuera de Zaragoza',25.9833,-109.3,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-d086da78-7719-4232-a2dd-3e699246982c-1778088477278-0.jpg','a4315864-1602-40b2-b35b-7ecfb1625590','2026-03-21 04:42:59'),
  ('fcae46a8-0476-4503-b6cb-c6d58f7a9e9c','Ahome',25.9167,-109.1833,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-fcae46a8-0476-4503-b6cb-c6d58f7a9e9c-1778087964029-0.jpg','a4315864-1602-40b2-b35b-7ecfb1625590','2026-03-21 04:42:59'),
  ('0742be9a-d748-46c4-b9b2-1f7459660a62','Ejido Porvenir',25.85,-109.02,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-0742be9a-d748-46c4-b9b2-1f7459660a62-1778088832396-0.jpg','b62932b7-6490-4ca0-8419-97b8bea6b9d0','2026-03-21 04:42:59'),
  ('662a2954-7b06-4eba-a9b1-7e3ac238c298','Álamos',25.81,-108.99,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-662a2954-7b06-4eba-a9b1-7e3ac238c298-1778088521037-0.jpg','0ad0f55d-74f2-43fa-b31d-f2aaed0580d6','2026-03-21 04:42:59'),
  ('ced33d8c-3d39-4854-9c79-8a46040dbc5f','Malvinas',25.79,-108.98,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-ced33d8c-3d39-4854-9c79-8a46040dbc5f-1778088375394-0.jpg','656eaf1a-6bd1-4290-89f1-04e7489d5a88','2026-03-21 04:42:59'),
  ('818336e1-8f5a-4a10-9f34-6cc16135928e','Bagojo',25.8667,-109.1,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-818336e1-8f5a-4a10-9f34-6cc16135928e-1778088575901-0.jpg','60ae2164-6ec6-42a4-984a-6a3cb85c7b93','2026-03-21 04:42:59'),
  ('149d383b-8a59-48f5-b7be-8196c1a2e85e','9 de Diciembre',25.75,-108.9833,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-149d383b-8a59-48f5-b7be-8196c1a2e85e-1780599457217-0.jpg','0ad0f55d-74f2-43fa-b31d-f2aaed0580d6','2026-03-21 04:42:59'),
  ('03139943-b523-4b88-b5e3-f4abf774094d','Guayabo',25.9333,-109.1167,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-03139943-b523-4b88-b5e3-f4abf774094d-1780599612370-0.jpg','93362441-2dd2-4f1a-9d54-a5243da0a0b8','2026-03-21 04:42:59'),
  ('7d8bc89b-2f9f-45a2-9661-020675ae62fd','Ejido Mochis',25.7904,-108.9858,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-7d8bc89b-2f9f-45a2-9661-020675ae62fd-1778088627039-0.jpg','60ae2164-6ec6-42a4-984a-6a3cb85c7b93','2026-03-21 04:42:59'),
  ('c1e68edd-f2a3-4d23-abcf-06228aa0d7f1','San Miguel',25.95,-109.05,'Módulo de atención comunitaria. Asesoría y servicio.','Martes a Viernes 9:00 a.m a 2:00 p.m','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-c1e68edd-f2a3-4d23-abcf-06228aa0d7f1-1780599538732-0.jpg','93362441-2dd2-4f1a-9d54-a5243da0a0b8','2026-03-21 04:42:59');

-- ===== mac_images / GALERIA DE FOTOS (14) =====
INSERT INTO `mac_images` (`id`,`mac_id`,`photo_url`,`sort_order`,`created_at`) VALUES
  ('2fef4a90-0748-487b-9f7f-885e1b4ea7a9','cfad50c6-cf1b-4eaa-a409-f730d9299fa9','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-cfad50c6-cf1b-4eaa-a409-f730d9299fa9-1774073934256-0.jpg',0,'2026-03-21 06:18:56'),
  ('cd6b550a-71db-4d3a-bb3e-9d9e8e926c77','fcae46a8-0476-4503-b6cb-c6d58f7a9e9c','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-fcae46a8-0476-4503-b6cb-c6d58f7a9e9c-1778087964029-0.jpg',0,'2026-05-06 17:19:24'),
  ('e3aae87a-4b33-43a9-9e7e-a33009e79f79','ced33d8c-3d39-4854-9c79-8a46040dbc5f','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-ced33d8c-3d39-4854-9c79-8a46040dbc5f-1778088375394-0.jpg',0,'2026-05-06 17:26:16'),
  ('79e2f584-688a-462d-8cb2-050ed43b855f','fbdb7f51-514e-41bc-b85b-356c42102528','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-fbdb7f51-514e-41bc-b85b-356c42102528-1778088427609-0.jpg',0,'2026-05-06 17:27:08'),
  ('aac081e0-d477-4c18-85ef-e7815230847c','d086da78-7719-4232-a2dd-3e699246982c','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-d086da78-7719-4232-a2dd-3e699246982c-1778088477278-0.jpg',0,'2026-05-06 17:27:57'),
  ('328b6cf7-0fbc-44e8-b990-b2012827f6aa','662a2954-7b06-4eba-a9b1-7e3ac238c298','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-662a2954-7b06-4eba-a9b1-7e3ac238c298-1778088521037-0.jpg',0,'2026-05-06 17:28:42'),
  ('9b647fbf-f047-43ab-a477-93bde8fde323','818336e1-8f5a-4a10-9f34-6cc16135928e','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-818336e1-8f5a-4a10-9f34-6cc16135928e-1778088575901-0.jpg',0,'2026-05-06 17:29:36'),
  ('0b22564c-4b57-46bf-ae61-d778a670825e','7d8bc89b-2f9f-45a2-9661-020675ae62fd','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-7d8bc89b-2f9f-45a2-9661-020675ae62fd-1778088627039-0.jpg',0,'2026-05-06 17:30:28'),
  ('28204440-2367-4f88-9ab1-c30e24e873d4','0742be9a-d748-46c4-b9b2-1f7459660a62','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-0742be9a-d748-46c4-b9b2-1f7459660a62-1778088832396-0.jpg',0,'2026-05-06 17:33:53'),
  ('01dd4a3c-fa9c-4be3-87c1-86124b7545ff','94a43821-2b6d-43bf-b13f-086f51b955a3','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-94a43821-2b6d-43bf-b13f-086f51b955a3-1778088869190-0.jpg',0,'2026-05-06 17:34:30'),
  ('7a48967e-3649-4794-95f2-2c170a56e0d1','94a43821-2b6d-43bf-b13f-086f51b955a3','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-94a43821-2b6d-43bf-b13f-086f51b955a3-1778088923714-0.jpg',0,'2026-05-06 17:35:24'),
  ('1f31d415-16b1-4298-acfb-24abecce861f','149d383b-8a59-48f5-b7be-8196c1a2e85e','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-149d383b-8a59-48f5-b7be-8196c1a2e85e-1780599457217-0.jpg',0,'2026-06-04 18:57:51'),
  ('3f67dfce-e14d-4efb-8d94-2b96ff12a26b','c1e68edd-f2a3-4d23-abcf-06228aa0d7f1','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-c1e68edd-f2a3-4d23-abcf-06228aa0d7f1-1780599538732-0.jpg',0,'2026-06-04 18:59:13'),
  ('8cff9885-0d30-4c3d-a5b6-229362017e26','03139943-b523-4b88-b5e3-f4abf774094d','https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/mac-photos/mac-03139943-b523-4b88-b5e3-f4abf774094d-1780599612370-0.jpg',0,'2026-06-04 19:00:27');

-- ===== pois (1) =====
INSERT INTO `pois` (`id`,`mac_id`,`type`,`name`,`description`,`lat`,`lng`,`image_url`,`sort_order`,`created_at`,`updated_at`) VALUES
  ('3f304dd0-04a5-4d16-a46b-3378685c4aa8','cfad50c6-cf1b-4eaa-a409-f730d9299fa9','services','Comida doña pelos','comida rapida pa los tragones',25.75831,-108.814516,NULL,0,'2026-03-22 18:30:53','2026-03-22 18:30:53');

-- ===== transport_info (15) =====
INSERT INTO `transport_info` (`id`,`mac_name`,`data`,`created_at`,`updated_at`) VALUES
  ('3f4a8215-cd8b-4a6f-aa96-8ab153c6adf8','Topolobampo / 1ro de Mayo','{"lineas": [{"color": "blue", "rutas": [{"ida": "Cada 20 min, 6:00 am - 8:00 pm. ~$23 (OXXO)", "destino": "Topolobampo / 1ro de Mayo", "regreso": "Mismo horario en sentido inverso (OXXO)"}], "empresa": "Azules del Noroeste", "telefono": "668 812 3491", "terminal": "Callejon Tenochtitlan 399, Centro"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('b6f353bc-c6d2-4a28-82e3-9c25e93a544a','San Blas / Charay','{"lineas": [{"color": "blue", "rutas": [{"ida": "Ruta cubierta - consultar taquilla", "destino": "San Blas / Charay", "regreso": "Mismo servicio de regreso"}], "empresa": "Azules del Noroeste", "telefono": "668 812 3491", "terminal": "Callejon Tenochtitlan 399, Centro"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('f05337e0-d29d-409e-b90a-e6a555ed71f0','Ahome / Higuera de Zaragoza','{"lineas": [{"color": "blue", "rutas": [{"ida": "Ruta Ahome cubierta - consultar taquilla", "destino": "Ahome", "regreso": "Mismo servicio"}, {"ida": "Taxi/Uber ~$100", "destino": "Higuera de Zaragoza", "regreso": "Taxi/Uber ~$100"}], "empresa": "Azules del Noroeste", "telefono": "668 812 3491", "terminal": "Callejon Tenochtitlan 399, Centro"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('cd49c3c8-9d7a-4049-8728-87fe2fb8d993','Gabriel Leyva Solano','{"lineas": [{"color": "blue", "rutas": [{"ida": "Salidas: 05:55, 07:30, 09:00, 11:35, 12:30, 14:40, 17:20, 18:15, 19:30", "destino": "Gabriel Leyva Solano", "regreso": "Mismo servicio de regreso"}], "empresa": "Azules del Noroeste", "telefono": "668 812 3491", "terminal": "Callejon Tenochtitlan 399, Centro"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('fac4fcb2-eca2-4d17-b965-3f2500d323af','Mochicahui / 5 de Mayo','{"lineas": [{"color": "green", "rutas": [{"ida": "Cada 20 min, 6:00 - 19:40", "destino": "Mochicahui / 5 de Mayo", "regreso": "Mismo intervalo de regreso"}], "empresa": "ANS - Norte de Sinaloa", "telefono": "668 818 0357", "terminal": "Zaragoza 800 Sur"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('b0b68a64-156f-4f81-b83d-5e2f9a039bfa','Ejido Porvenir / Flor Azul','{"lineas": [{"color": "green", "rutas": [{"ida": "Cada 20 min, 6:00 - 19:40", "destino": "Ejido Porvenir / Flor Azul", "regreso": "Mismo intervalo de regreso"}], "empresa": "ANS - Norte de Sinaloa", "telefono": "668 818 0357", "terminal": "Zaragoza 800 Sur"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('e8fedb79-3725-403a-990a-1c0d249963d6','Bagojo','{"lineas": [{"color": "green", "rutas": [{"ida": "Cada 20 min, 6:00 - 19:40", "destino": "Bagojo", "regreso": "Mismo intervalo de regreso"}], "empresa": "ANS - Norte de Sinaloa", "telefono": "668 818 0357", "terminal": "Zaragoza 800 Sur"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('35135390-b3a2-4a0c-a551-98e3eb9aed0b','Ruiz Cortines','{"lineas": [{"color": "green", "rutas": [{"ida": "Cada 20 min, 6:00 - 19:40", "destino": "Ruiz Cortines", "regreso": "Mismo intervalo de regreso"}], "empresa": "ANS - Norte de Sinaloa", "telefono": "668 818 0357", "terminal": "Zaragoza 800 Sur"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('7b34557b-9186-42b0-b4bd-b4d164c69b2a','Juan Jose Rios','{"lineas": [{"color": "green", "rutas": [{"ida": "Cada 20 min, 6:00 - 19:40", "destino": "Juan Jose Rios", "regreso": "Mismo intervalo de regreso"}], "empresa": "ANS - Norte de Sinaloa", "telefono": "668 818 0357", "terminal": "Zaragoza 800 Sur"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('7d967ea2-d699-4895-b2eb-f5199dfd62d9','Flores Magon / Paredones','{"lineas": [{"color": "green", "rutas": [{"ida": "Cada 20 min, 6:00 - 19:40", "destino": "Flores Magon / Paredones", "regreso": "Mismo intervalo de regreso"}], "empresa": "ANS - Norte de Sinaloa", "telefono": "668 818 0357", "terminal": "Zaragoza 800 Sur"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('5bd8cb99-a483-4873-a1a7-87d8c69400dc','San Miguel','{"lineas": [{"color": "orange", "rutas": [{"ida": "Ruta urbana/suburbana sin horario fijo publicado", "destino": "San Miguel", "regreso": "Mismo servicio"}], "empresa": "ATUSUM (Transporte Urbano/Suburbano)", "telefono": "", "terminal": "Centro de Los Mochis"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('cbbc77d4-76bf-40e1-abe3-6eff18a18772','Guayabo','{"lineas": [{"color": "orange", "rutas": [{"ida": "Ruta urbana/suburbana sin horario fijo publicado", "destino": "Guayabo", "regreso": "Mismo servicio"}], "empresa": "ATUSUM (Transporte Urbano/Suburbano)", "telefono": "", "terminal": "Centro de Los Mochis"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('77093e45-e736-4eca-b94e-71524f1b0fbb','Malvinas','{"lineas": [{"color": "orange", "rutas": [{"ida": "Ruta urbana/suburbana sin horario fijo publicado", "destino": "Malvinas", "regreso": "Mismo servicio"}], "empresa": "ATUSUM (Transporte Urbano/Suburbano)", "telefono": "", "terminal": "Centro de Los Mochis"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('77501b3a-a14c-4075-82c2-492e14da45ab','Ferrusquilla','{"lineas": [{"color": "orange", "rutas": [{"ida": "Ruta urbana/suburbana sin horario fijo publicado", "destino": "Ferrusquilla", "regreso": "Mismo servicio"}], "empresa": "ATUSUM (Transporte Urbano/Suburbano)", "telefono": "", "terminal": "Centro de Los Mochis"}]}','2026-03-21 04:42:59','2026-03-21 04:42:59'),
  ('661d6b81-d77a-4b53-a0ca-9c6d098b6be7','9 de Diciembre / Alamos','{"lineas": [{"color": "green", "rutas": [{"ida": "Cada 20 min, 6:00 - 19:40", "destino": "9 de Diciembre / Alamos", "regreso": "Mismo intervalo de regreso"}], "empresa": "ANS - Norte de Sinaloa", "telefono": "668 818 0357", "terminal": "Zaragoza 800 Sur"}]}','2026-03-21 04:42:59','2026-05-07 18:26:06');

-- ===== verificacion =====
SELECT 'academic_programs' AS tabla, COUNT(*) AS filas FROM `academic_programs`
UNION ALL SELECT 'advisors',       COUNT(*) FROM `advisors`
UNION ALL SELECT 'macs',           COUNT(*) FROM `macs`
UNION ALL SELECT 'mac_images',     COUNT(*) FROM `mac_images`
UNION ALL SELECT 'pois',           COUNT(*) FROM `pois`
UNION ALL SELECT 'transport_info', COUNT(*) FROM `transport_info`;