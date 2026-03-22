-- =============================================
-- SEED DATA: Informacion de transporte por MAC
-- =============================================

-- Compatibilidad minima para tablas heredadas
ALTER TABLE transport_info
ADD COLUMN IF NOT EXISTS mac_name TEXT;

ALTER TABLE transport_info
ADD COLUMN IF NOT EXISTS data JSONB;

ALTER TABLE transport_info
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE transport_info
SET data = '{"lineas":[]}'::jsonb
WHERE data IS NULL;

WITH payload(mac_name, data) AS (
  VALUES
  (
    'Topolobampo / 1ro de Mayo',
    '{"lineas":[{"empresa":"Azules del Noroeste","telefono":"668 812 3491","terminal":"Callejon Tenochtitlan 399, Centro","color":"blue","rutas":[{"destino":"Topolobampo / 1ro de Mayo","ida":"Cada 20 min, 6:00 am - 8:00 pm. ~$23 (OXXO)","regreso":"Mismo horario en sentido inverso (OXXO)"}]}]}'::jsonb
  ),
  (
    'San Blas / Charay',
    '{"lineas":[{"empresa":"Azules del Noroeste","telefono":"668 812 3491","terminal":"Callejon Tenochtitlan 399, Centro","color":"blue","rutas":[{"destino":"San Blas / Charay","ida":"Ruta cubierta - consultar taquilla","regreso":"Mismo servicio de regreso"}]}]}'::jsonb
  ),
  (
    'Ahome / Higuera de Zaragoza',
    '{"lineas":[{"empresa":"Azules del Noroeste","telefono":"668 812 3491","terminal":"Callejon Tenochtitlan 399, Centro","color":"blue","rutas":[{"destino":"Ahome","ida":"Ruta Ahome cubierta - consultar taquilla","regreso":"Mismo servicio"},{"destino":"Higuera de Zaragoza","ida":"Taxi/Uber ~$100","regreso":"Taxi/Uber ~$100"}]}]}'::jsonb
  ),
  (
    'Gabriel Leyva Solano',
    '{"lineas":[{"empresa":"Azules del Noroeste","telefono":"668 812 3491","terminal":"Callejon Tenochtitlan 399, Centro","color":"blue","rutas":[{"destino":"Gabriel Leyva Solano","ida":"Salidas: 05:55, 07:30, 09:00, 11:35, 12:30, 14:40, 17:20, 18:15, 19:30","regreso":"Mismo servicio de regreso"}]}]}'::jsonb
  ),
  (
    'Ruiz Cortines',
    '{"lineas":[{"empresa":"ANS - Norte de Sinaloa","telefono":"668 818 0357","terminal":"Zaragoza 800 Sur","color":"green","rutas":[{"destino":"Ruiz Cortines","ida":"Cada 20 min, 6:00 - 19:40","regreso":"Mismo intervalo de regreso"}]}]}'::jsonb
  ),
  (
    'Juan Jose Rios',
    '{"lineas":[{"empresa":"ANS - Norte de Sinaloa","telefono":"668 818 0357","terminal":"Zaragoza 800 Sur","color":"green","rutas":[{"destino":"Juan Jose Rios","ida":"Cada 20 min, 6:00 - 19:40","regreso":"Mismo intervalo de regreso"}]}]}'::jsonb
  ),
  (
    'San Miguel',
    '{"lineas":[{"empresa":"ATUSUM (Transporte Urbano/Suburbano)","telefono":"","terminal":"Centro de Los Mochis","color":"orange","rutas":[{"destino":"San Miguel","ida":"Ruta urbana/suburbana sin horario fijo publicado","regreso":"Mismo servicio"}]}]}'::jsonb
  )
)
UPDATE transport_info t
SET data = p.data,
    updated_at = NOW()
FROM payload p
WHERE t.mac_name = p.mac_name;

WITH payload(mac_name, data) AS (
  VALUES
  (
    'Topolobampo / 1ro de Mayo',
    '{"lineas":[{"empresa":"Azules del Noroeste","telefono":"668 812 3491","terminal":"Callejon Tenochtitlan 399, Centro","color":"blue","rutas":[{"destino":"Topolobampo / 1ro de Mayo","ida":"Cada 20 min, 6:00 am - 8:00 pm. ~$23 (OXXO)","regreso":"Mismo horario en sentido inverso (OXXO)"}]}]}'::jsonb
  ),
  (
    'San Blas / Charay',
    '{"lineas":[{"empresa":"Azules del Noroeste","telefono":"668 812 3491","terminal":"Callejon Tenochtitlan 399, Centro","color":"blue","rutas":[{"destino":"San Blas / Charay","ida":"Ruta cubierta - consultar taquilla","regreso":"Mismo servicio de regreso"}]}]}'::jsonb
  ),
  (
    'Ahome / Higuera de Zaragoza',
    '{"lineas":[{"empresa":"Azules del Noroeste","telefono":"668 812 3491","terminal":"Callejon Tenochtitlan 399, Centro","color":"blue","rutas":[{"destino":"Ahome","ida":"Ruta Ahome cubierta - consultar taquilla","regreso":"Mismo servicio"},{"destino":"Higuera de Zaragoza","ida":"Taxi/Uber ~$100","regreso":"Taxi/Uber ~$100"}]}]}'::jsonb
  ),
  (
    'Gabriel Leyva Solano',
    '{"lineas":[{"empresa":"Azules del Noroeste","telefono":"668 812 3491","terminal":"Callejon Tenochtitlan 399, Centro","color":"blue","rutas":[{"destino":"Gabriel Leyva Solano","ida":"Salidas: 05:55, 07:30, 09:00, 11:35, 12:30, 14:40, 17:20, 18:15, 19:30","regreso":"Mismo servicio de regreso"}]}]}'::jsonb
  ),
  (
    'Ruiz Cortines',
    '{"lineas":[{"empresa":"ANS - Norte de Sinaloa","telefono":"668 818 0357","terminal":"Zaragoza 800 Sur","color":"green","rutas":[{"destino":"Ruiz Cortines","ida":"Cada 20 min, 6:00 - 19:40","regreso":"Mismo intervalo de regreso"}]}]}'::jsonb
  ),
  (
    'Juan Jose Rios',
    '{"lineas":[{"empresa":"ANS - Norte de Sinaloa","telefono":"668 818 0357","terminal":"Zaragoza 800 Sur","color":"green","rutas":[{"destino":"Juan Jose Rios","ida":"Cada 20 min, 6:00 - 19:40","regreso":"Mismo intervalo de regreso"}]}]}'::jsonb
  ),
  (
    'San Miguel',
    '{"lineas":[{"empresa":"ATUSUM (Transporte Urbano/Suburbano)","telefono":"","terminal":"Centro de Los Mochis","color":"orange","rutas":[{"destino":"San Miguel","ida":"Ruta urbana/suburbana sin horario fijo publicado","regreso":"Mismo servicio"}]}]}'::jsonb
  )
)
INSERT INTO transport_info (mac_name, data)
SELECT p.mac_name, p.data
FROM payload p
WHERE NOT EXISTS (
  SELECT 1
  FROM transport_info t
  WHERE t.mac_name = p.mac_name
);
