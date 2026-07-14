'use strict';
/**
 * Migra TODOS los datos de MySQL (minimapa) a Supabase, incluyendo las
 * fotos reales (embebidas como BLOB en MySQL, o cacheadas en disco).
 *
 * Las tablas se escriben via conexion directa a Postgres (rol postgres,
 * ignora RLS). Las fotos y el usuario admin usan la API HTTP porque el
 * almacenamiento de Storage y Auth no son accesibles por SQL plano.
 *
 * Requisitos previos:
 *   1. Haber corrido mysql/supabase_schema.sql (ya aplicado).
 *   2. Definir SUPABASE_URL, SUPABASE_DB_PASSWORD y SUPABASE_SECRET_KEY.
 *
 * Uso (PowerShell, desde backend/):
 *   $env:SUPABASE_URL="https://xxxx.supabase.co"
 *   $env:SUPABASE_DB_PASSWORD="..."
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..."
 *   $env:SUPABASE_ADMIN_EMAIL="..."
 *   $env:SUPABASE_ADMIN_PASSWORD="..."
 *   node migrate_to_supabase.js
 */

const mysql = require('mysql2/promise');
const { Client } = require('pg');
const fs   = require('fs');
const path = require('path');

const SUPABASE_URL   = process.env.SUPABASE_URL;
const DB_PASSWORD    = process.env.SUPABASE_DB_PASSWORD;
const SECRET_KEY     = process.env.SUPABASE_SECRET_KEY;
const ADMIN_EMAIL    = process.env.SUPABASE_ADMIN_EMAIL;
const ADMIN_PASS     = process.env.SUPABASE_ADMIN_PASSWORD;

if (!SUPABASE_URL || !DB_PASSWORD || !SECRET_KEY || !ADMIN_EMAIL || !ADMIN_PASS) {
  console.error('Faltan SUPABASE_URL, SUPABASE_DB_PASSWORD, SUPABASE_SECRET_KEY, SUPABASE_ADMIN_EMAIL y/o SUPABASE_ADMIN_PASSWORD en el entorno.');
  process.exit(1);
}

const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0];
const DB_HOST = `db.${PROJECT_REF}.supabase.co`;

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const CACHED_DIR  = path.join(__dirname, '..', 'mysql', 'export_supabase', 'photos');

function sbHeaders(extra = {}) {
  return { apikey: SECRET_KEY, Authorization: `Bearer ${SECRET_KEY}`, ...extra };
}

async function uploadPhoto(bucket, filename, buffer, mime) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${filename}`, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': mime || 'image/jpeg', 'x-upsert': 'true' }),
    body: buffer,
  });
  if (!res.ok) throw new Error(`Upload ${bucket}/${filename} fallo (${res.status}): ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filename}`;
}

/** Busca los bytes de una foto: 1) BLOB en MySQL 2) uploads/ locales 3) cache export_supabase */
function resolvePhotoBytes(row, blobCol, mimeCol, urlCol, bucket) {
  if (row[blobCol]) return { buffer: row[blobCol], mime: row[mimeCol] || 'image/jpeg' };
  const url = row[urlCol];
  if (!url) return null;
  const filename = path.basename(url);
  const fromUpload = path.join(UPLOADS_DIR, bucket, filename);
  if (fs.existsSync(fromUpload)) return { buffer: fs.readFileSync(fromUpload), mime: 'image/jpeg' };
  const fromCache = path.join(CACHED_DIR, filename);
  if (fs.existsSync(fromCache)) return { buffer: fs.readFileSync(fromCache), mime: 'image/jpeg' };
  return null;
}

async function migratePhotoField(row, blobCol, mimeCol, urlCol, bucket) {
  const photo = resolvePhotoBytes(row, blobCol, mimeCol, urlCol, bucket);
  if (!photo) return row[urlCol] || null; // sin bytes disponibles: conserva la URL tal cual (o null)
  const filename = row[urlCol] ? path.basename(row[urlCol]) : `${bucket}-${row.id}.jpg`;
  return uploadPhoto(bucket, filename, photo.buffer, photo.mime);
}

/** INSERT ... ON CONFLICT (id) DO UPDATE, fila por fila (volumenes pequenos, prioriza claridad) */
async function upsertPg(pg, table, rows, columns, conflictCol = 'id') {
  for (const row of rows) {
    const cols = columns;
    const values = cols.map(c => row[c] === undefined ? null : row[c]);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const updates = cols.filter(c => c !== conflictCol).map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
    const sql = `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})
                 ON CONFLICT ("${conflictCol}") DO UPDATE SET ${updates}`;
    await pg.query(sql, values);
  }
}

async function countPg(pg, table) {
  const res = await pg.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
  return res.rows[0].c;
}

(async () => {
  const mysqlConn = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: 'root', database: 'minimapa', charset: 'utf8mb4',
  });
  const pg = new Client({
    host: DB_HOST, port: 5432, user: 'postgres', password: DB_PASSWORD, database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();

  const summary = {};
  let photosMigrated = 0, photosSkipped = 0;

  try {
    console.log('1/7 academic_programs...');
    const [programs] = await mysqlConn.query('SELECT id, name, created_at FROM academic_programs');
    await upsertPg(pg, 'academic_programs', programs, ['id', 'name', 'created_at']);
    summary.academic_programs = programs.length;

    console.log('2/7 advisors (con fotos)...');
    const [advisors] = await mysqlConn.query('SELECT * FROM advisors');
    const advisorRows = [];
    for (const a of advisors) {
      const photoUrl = await migratePhotoField(a, 'photo_blob', 'photo_mime', 'photo_url', 'advisor-photos');
      if (photoUrl && photoUrl.includes('/storage/v1/object/public/')) photosMigrated++; else if (a.photo_url) photosSkipped++;
      advisorRows.push({
        id: a.id, title: a.title, name: a.name, email: a.email, phone: a.phone,
        photo_url: photoUrl, pin_color: a.pin_color,
        academic_program_id: a.academic_program_id, created_at: a.created_at,
      });
    }
    await upsertPg(pg, 'advisors', advisorRows,
      ['id', 'title', 'name', 'email', 'phone', 'photo_url', 'pin_color', 'academic_program_id', 'created_at']);
    summary.advisors = advisorRows.length;

    console.log('3/7 macs (con fotos)...');
    const [macs] = await mysqlConn.query('SELECT * FROM macs');
    const macRows = [];
    for (const m of macs) {
      const imageUrl = await migratePhotoField(m, 'image_blob', 'image_mime', 'image_url', 'mac-photos');
      if (imageUrl && imageUrl.includes('/storage/v1/object/public/')) photosMigrated++; else if (m.image_url) photosSkipped++;
      macRows.push({
        id: m.id, name: m.name, lat: m.lat, lng: m.lng, details: m.details, schedule: m.schedule,
        image_url: imageUrl, created_at: m.created_at,
      });
    }
    await upsertPg(pg, 'macs', macRows,
      ['id', 'name', 'lat', 'lng', 'details', 'schedule', 'image_url', 'created_at']);
    summary.macs = macRows.length;

    console.log('4/7 mac_advisors...');
    const [macAdvisors] = await mysqlConn.query('SELECT id, mac_id, advisor_id, sort_order, created_at FROM mac_advisors');
    await upsertPg(pg, 'mac_advisors', macAdvisors, ['id', 'mac_id', 'advisor_id', 'sort_order', 'created_at']);
    summary.mac_advisors = macAdvisors.length;

    console.log('5/7 mac_images (con fotos)...');
    const [images] = await mysqlConn.query('SELECT * FROM mac_images');
    const imageRows = [];
    for (const im of images) {
      const photoUrl = await migratePhotoField(im, 'photo_blob', 'photo_mime', 'photo_url', 'mac-photos');
      if (photoUrl && photoUrl.includes('/storage/v1/object/public/')) photosMigrated++; else if (im.photo_url) photosSkipped++;
      imageRows.push({ id: im.id, mac_id: im.mac_id, photo_url: photoUrl, sort_order: im.sort_order, created_at: im.created_at });
    }
    await upsertPg(pg, 'mac_images', imageRows, ['id', 'mac_id', 'photo_url', 'sort_order', 'created_at']);
    summary.mac_images = imageRows.length;

    console.log('6/7 pois...');
    const [pois] = await mysqlConn.query(
      'SELECT id, mac_id, type, name, description, lat, lng, image_url, sort_order, created_at, updated_at FROM pois');
    await upsertPg(pg, 'pois', pois,
      ['id', 'mac_id', 'type', 'name', 'description', 'lat', 'lng', 'image_url', 'sort_order', 'created_at', 'updated_at']);
    summary.pois = pois.length;

    console.log('7/7 transport_info...');
    const [transport] = await mysqlConn.query(
      'SELECT id, mac_name, data, mac_id, map_embed_url, content, created_at, updated_at FROM transport_info');
    const transportRows = transport.map(t => ({
      ...t,
      data: JSON.stringify(t.data),
      content: t.content ? JSON.stringify(t.content) : null,
    }));
    await upsertPg(pg, 'transport_info', transportRows,
      ['id', 'mac_name', 'data', 'mac_id', 'map_embed_url', 'content', 'created_at', 'updated_at']);
    summary.transport_info = transport.length;

    await mysqlConn.end();

    console.log('\nCreando usuario admin en Supabase Auth...');
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: sbHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS, email_confirm: true }),
    });
    const authBody = await authRes.json().catch(() => ({}));
    if (!authRes.ok && String(authBody?.msg || authBody?.message || '').includes('already been registered')) {
      console.log('  El usuario admin ya existia, no se modifico.');
    } else if (!authRes.ok) {
      console.error('  No se pudo crear el usuario admin:', authBody);
    } else {
      console.log(`  Usuario admin creado: ${ADMIN_EMAIL}`);
    }

    console.log('\n=== Verificacion de conteos (MySQL -> Supabase) ===');
    let allOk = true;
    for (const [table, mysqlCount] of Object.entries(summary)) {
      const supaCount = await countPg(pg, table);
      const ok = supaCount === mysqlCount;
      if (!ok) allOk = false;
      console.log(`${table.padEnd(20)} mysql=${mysqlCount}  supabase=${supaCount}  ${ok ? 'OK' : 'DIFERENCIA'}`);
    }
    console.log(`\nFotos migradas a Storage: ${photosMigrated}  |  Fotos sin bytes disponibles: ${photosSkipped}`);
    console.log(allOk ? '\nMigracion completa sin diferencias de conteo.' : '\nATENCION: hay diferencias de conteo, revisar arriba.');
  } finally {
    await pg.end();
  }
})().catch(err => {
  console.error('ERROR migracion:', err);
  process.exit(1);
});
