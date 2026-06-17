# -*- coding: utf-8 -*-
"""
Incrusta los BYTES reales de las fotos dentro de MySQL (columnas LONGBLOB).
Lee las imagenes de export_supabase/photos/ y las carga en la fila que
corresponde, emparejando por el nombre de archivo contenido en la URL.

Requiere: pymysql  (ya disponible).  DB: minimapa  (root/root, localhost).
"""
import os, json, pymysql

HERE = os.path.dirname(os.path.abspath(__file__))
EXP = os.path.join(HERE, 'export_supabase')
PHOTOS = os.path.join(EXP, 'photos')

DB = dict(host='127.0.0.1', user='root', password='root',
          database='minimapa', charset='utf8mb4')

def load(t):
    with open(os.path.join(EXP, t + '.json'), encoding='utf-8') as f:
        return json.load(f)

def fname_from_url(url):
    return url.split('/')[-1].split('?')[0] if url else None

def read_img(fn):
    p = os.path.join(PHOTOS, fn)
    if fn and os.path.isfile(p):
        with open(p, 'rb') as f:
            return f.read()
    return None

def col_exists(cur, table, col):
    cur.execute("""SELECT 1 FROM information_schema.columns
                   WHERE table_schema=%s AND table_name=%s AND column_name=%s""",
                (DB['database'], table, col))
    return cur.fetchone() is not None

def ensure_cols(cur, table, blob_col, mime_col, after):
    if not col_exists(cur, table, blob_col):
        cur.execute("ALTER TABLE `%s` ADD COLUMN `%s` LONGBLOB NULL AFTER `%s`"
                    % (table, blob_col, after))
        print("  + columna %s.%s" % (table, blob_col))
    if not col_exists(cur, table, mime_col):
        cur.execute("ALTER TABLE `%s` ADD COLUMN `%s` VARCHAR(100) NULL AFTER `%s`"
                    % (table, mime_col, blob_col))
        print("  + columna %s.%s" % (table, mime_col))

def mime_of(data):
    if data[:3] == b'\xff\xd8\xff': return 'image/jpeg'
    if data[:4] == b'\x89PNG':      return 'image/png'
    if data[:4] == b'GIF8':         return 'image/gif'
    if data[:4] == b'RIFF':         return 'image/webp'
    return 'application/octet-stream'

conn = pymysql.connect(**DB)
try:
    with conn.cursor() as cur:
        print("Asegurando columnas BLOB...")
        ensure_cols(cur, 'advisors',   'photo_blob', 'photo_mime', 'photo_url')
        ensure_cols(cur, 'macs',       'image_blob', 'image_mime', 'image_url')
        ensure_cols(cur, 'mac_images', 'photo_blob', 'photo_mime', 'photo_url')
        conn.commit()

        jobs = [
            ('advisors',   'photo_url', 'photo_blob', 'photo_mime', load('advisors')),
            ('macs',       'image_url', 'image_blob', 'image_mime', load('macs')),
            ('mac_images', 'photo_url', 'photo_blob', 'photo_mime', load('mac_images')),
        ]
        grand = 0
        for table, urlcol, blobcol, mimecol, rows in jobs:
            n = 0; b = 0; miss = 0
            for r in rows:
                url = r.get(urlcol)
                if not url:
                    continue
                data = read_img(fname_from_url(url))
                if data is None:
                    miss += 1
                    continue
                cur.execute(
                    "UPDATE `%s` SET `%s`=%%s, `%s`=%%s WHERE `id`=%%s"
                    % (table, blobcol, mimecol),
                    (data, mime_of(data), r['id']))
                n += 1; b += len(data)
            conn.commit()
            grand += b
            print("  %-12s -> %2d fotos incrustadas (%.0f KB)%s"
                  % (table, n, b / 1024, '' if not miss else ' | faltantes:%d' % miss))
        print("Total incrustado: %.1f KB" % (grand / 1024))

        # Verificacion
        for table, blobcol in [('advisors','photo_blob'),('macs','image_blob'),('mac_images','photo_blob')]:
            cur.execute("SELECT COUNT(*), SUM(`%s` IS NOT NULL), SUM(OCTET_LENGTH(`%s`)) FROM `%s`"
                        % (blobcol, blobcol, table))
            tot, con, by = cur.fetchone()
            print("  CHECK %-12s: %s/%s filas con blob, %.0f KB" % (table, con or 0, tot, (by or 0)/1024))
finally:
    conn.close()
print("OK.")
