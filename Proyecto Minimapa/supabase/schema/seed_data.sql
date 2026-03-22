-- =============================================
-- SEED DATA: Asesores y MACs reales UAS
-- =============================================

-- Limpiar datos existentes (opcional, descomenta si necesitas reset)
-- DELETE FROM macs;
-- DELETE FROM advisors;

-- =============================================
-- ASESORES (12 registros)
-- =============================================
INSERT INTO advisors (title, name, email, phone, photo_url) VALUES
('Lic', 'Lina Noemi Higuera Osuna', '', '', NULL),
('Lic', 'Álbaro Eleazar Álvarez Castro', '', '', NULL),
('Lic', 'Gisel Guadalupe Galaviz Ramos', '', '', NULL),
('Lic', 'Ana Karina Ordoñez Melendrez', '', '', NULL),
('Lic', 'Sandra Paola López Lara', '', '', NULL),
('Lic', 'Rocío Esther Barajas Aguilar', '', '', NULL),
('Lic', 'Juan José León Castellanos', '', '', NULL),
('Lic', 'Luis Alejandro Guerrero Hernández', '', '', NULL),
('Ing', 'Abel Arnulfo Domínguez Talamante', '', '', NULL),
('Dr', 'María de los Ángeles Castellanos Osuna', '', '', NULL),
('Ing', 'José Alfredo Martínez Ávila', '', '', NULL),
('Lic', 'Cielo Atondo Figueroa', '', '', NULL);

-- =============================================
-- MACS (23 registros)
-- =============================================
INSERT INTO macs (name, lat, lng, details, schedule, advisor_id) VALUES
-- Gabriel Leyva Solano (Asesor 1)
('Gabriel Leyva Solano', 25.9667, -108.8833, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Lina Noemi Higuera Osuna')),

-- Ruiz Cortines, Juan José Ríos (Asesor 2)
('Ruiz Cortines', 25.6833, -108.7500, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Álbaro Eleazar Álvarez Castro')),
('Juan José Ríos', 25.7589, -108.8222, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Álbaro Eleazar Álvarez Castro')),

-- San Miguel, Guayabo (Asesor 3)
('San Miguel', 25.9500, -109.0500, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Gisel Guadalupe Galaviz Ramos')),
('Guayabo', 25.9333, -109.1167, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Gisel Guadalupe Galaviz Ramos')),

-- Flores Magón, Paredones (Asesor 4)
('Flores Magón', 25.8080, -109.0000, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Ana Karina Ordoñez Melendrez')),
('Paredones', 25.9500, -109.1500, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Ana Karina Ordoñez Melendrez')),

-- Malvinas, Ferrusquilla (Asesor 5)
('Malvinas', 25.7900, -108.9800, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Sandra Paola López Lara')),
('Ferrusquilla', 25.8200, -108.9700, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Sandra Paola López Lara')),

-- 9 de Diciembre, Álamos (Asesor 6)
('9 de Diciembre', 25.7500, -108.9833, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Rocío Esther Barajas Aguilar')),
('Álamos', 25.8100, -108.9900, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Rocío Esther Barajas Aguilar')),

-- Ejido Porvenir, Flor Azul (Asesor 7)
('Ejido Porvenir', 25.8500, -109.0200, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Juan José León Castellanos')),
('Flor Azul', 25.8833, -108.9833, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Juan José León Castellanos')),

-- Mochicahui, 5 de Mayo (Asesor 8)
('Mochicahui', 25.9333, -108.9333, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Luis Alejandro Guerrero Hernández')),
('5 de Mayo', 25.9000, -108.9500, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Luis Alejandro Guerrero Hernández')),

-- Topolobampo, 1ro de Mayo (Asesor 9)
('Topolobampo', 25.6000, -109.0500, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Abel Arnulfo Domínguez Talamante')),
('1ro de Mayo', 25.8000, -108.9500, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Abel Arnulfo Domínguez Talamante')),

-- Ahome, Higuera de Zaragoza (Asesor 10)
('Ahome', 25.9167, -109.1833, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'María de los Ángeles Castellanos Osuna')),
('Higuera de Zaragoza', 25.9833, -109.3000, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'María de los Ángeles Castellanos Osuna')),

-- San Blas, Charay (Asesor 11)
('San Blas', 26.0833, -108.7667, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Cielo Atondo Figueroa')),
('Charay', 26.0333, -108.8333, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'Cielo Atondo Figueroa')),

-- Bagojo, Los Mochis (Asesor 12)
('Bagojo', 25.8667, -109.1000, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'José Alfredo Martínez Ávila')),
('Los Mochis', 25.7904, -108.9858, 'Módulo de atención comunitaria. Asesoría y servicio.', 'Martes a Viernes 9:00 a.m a 2:00 p.m', (SELECT id FROM advisors WHERE name = 'José Alfredo Martínez Ávila'));