'use strict';
/**
 * Minimapa - Backend local (PostgREST-compatible)
 * -----------------------------------------------
 * Implementa el mismo protocolo HTTP que usa Supabase/PostgREST.
 * El frontend no necesita ningun cambio: solo se cambia VITE_SUPABASE_URL
 * a http://localhost:3001 en .env.local y el app funciona igual.
 *
 * Cubre: /rest/v1/* (CRUD), /auth/v1/* (JWT), /storage/v1/* (fotos)
 * Admin: alonsouas1006@gmail.com / mac_uas2029
 */

const express    = require('express');
const cors       = require('cors');
const mysql      = require('mysql2/promise');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const path       = require('path');
const fs         = require('fs');
const { randomUUID } = require('crypto');

const app  = express();
const PORT = 3001;
const JWT_SECRET = 'minimapa-local-jwt-secret';

function hashPassword(pass) {
  return crypto.createHash('sha256').update(pass).digest('hex');
}

// URL base de Supabase Storage (para reescribir URLs a localhost en respuestas)
const SUPABASE_STORAGE = 'https://hmaetjjczlhvnkuhjruc.supabase.co/storage/v1/object/public/';
const LOCAL_STORAGE    = `http://localhost:${PORT}/storage/v1/object/public/`;

// Carpetas de uploads y fotos cacheadas (respaldo Supabase descargado)
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const CACHED_DIR  = path.join(__dirname, '..', 'mysql', 'export_supabase', 'photos');

// ─── DB Pool ─────────────────────────────────────────────────────────────────
const pool = mysql.createPool({
  host: '127.0.0.1', user: 'root', password: 'root',
  database: 'minimapa', charset: 'utf8mb4',
  waitForConnections: true, connectionLimit: 10,
  timezone: 'Z',
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());

// Body parser: raw binario para uploads de storage, JSON para todo lo demas
app.use((req, res, next) => {
  const isUpload = req.path.startsWith('/storage/v1/object/') && req.method === 'POST';
  if (isUpload) {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end',  () => { req.rawBody = Buffer.concat(chunks); next(); });
    req.on('error', next);
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte filtros PostgREST de la query string en WHERE SQL */
function parseFilters(query) {
  const skip = new Set(['select', 'order', 'limit', 'offset', 'columns']);
  const conditions = [], values = [];
  for (const [key, val] of Object.entries(query)) {
    if (skip.has(key) || typeof val !== 'string') continue;
    if (val.startsWith('eq.')) {
      const v = val.slice(3);
      if (v === 'null') { conditions.push(`\`${key}\` IS NULL`); }
      else              { conditions.push(`\`${key}\` = ?`); values.push(v); }
    } else if (val.startsWith('neq.')) {
      conditions.push(`\`${key}\` != ?`); values.push(val.slice(4));
    } else if (val.startsWith('gt.')) {
      conditions.push(`\`${key}\` > ?`); values.push(val.slice(3));
    } else if (val.startsWith('lt.')) {
      conditions.push(`\`${key}\` < ?`); values.push(val.slice(3));
    }
  }
  return { conditions, values };
}

/** Convierte "name.asc,created_at.desc" en ORDER BY SQL */
function parseOrder(orderStr) {
  if (!orderStr) return '';
  return 'ORDER BY ' + orderStr.split(',').map(p => {
    const [col, dir] = p.trim().split('.');
    return `\`${col}\` ${dir === 'desc' ? 'DESC' : 'ASC'}`;
  }).join(', ');
}

/** Parsea el string select de PostgREST y devuelve las relaciones anidadas */
function parseSelectRelations(sel) {
  if (!sel || sel === '*') return [];
  const rels = [];
  let depth = 0, start = 0;
  const push = (s) => {
    const m = s.trim().match(/^(\w+)(?::(\w+))?\((.+)\)$/s);
    if (m) rels.push({ alias: m[1], table: m[2] || m[1], subSelect: m[3] });
  };
  for (let i = 0; i < sel.length; i++) {
    if      (sel[i] === '(') depth++;
    else if (sel[i] === ')') depth--;
    else if (sel[i] === ',' && depth === 0) { push(sel.slice(start, i)); start = i + 1; }
  }
  push(sel.slice(start));
  return rels;
}

/**
 * Mapa de relaciones: tabla -> { alias/tabla: { type, fk, refTable, refKey } }
 * type 'object'  = muchos-a-uno (retorna objeto)
 * type 'array'   = uno-a-muchos (retorna array)
 */
const RELS = {
  macs: {
    // Multi-asesor via tabla intermedia: advisors:mac_advisors(advisor:advisors(...))
    mac_advisors:   { type: 'array',  fk: 'id',                 refTable: 'mac_advisors',    refKey: 'mac_id' },
    mac_images:     { type: 'array',  fk: 'id',                 refTable: 'mac_images',      refKey: 'mac_id' },
    pois:           { type: 'array',  fk: 'id',                 refTable: 'pois',            refKey: 'mac_id' },
  },
  mac_advisors: {
    // advisor:advisors(*) dentro de mac_advisors
    advisor:        { type: 'object', fk: 'advisor_id',         refTable: 'advisors',        refKey: 'id'     },
    advisors:       { type: 'object', fk: 'advisor_id',         refTable: 'advisors',        refKey: 'id'     },
  },
  advisors: {
    academic_programs: { type: 'object', fk: 'academic_program_id', refTable: 'academic_programs', refKey: 'id' },
    academic_program:  { type: 'object', fk: 'academic_program_id', refTable: 'academic_programs', refKey: 'id' },
  },
};

/** Carga relaciones anidadas y las fusiona en los rows */
async function loadRelations(tableName, rows, relDefs) {
  if (!rows.length || !relDefs.length) return rows;
  for (const rel of relDefs) {
    const meta = RELS[tableName]?.[rel.table] ?? RELS[tableName]?.[rel.alias];
    if (!meta) continue;

    if (meta.type === 'array') {
      const ids = [...new Set(rows.map(r => r[meta.fk]).filter(Boolean))];
      if (!ids.length) { rows.forEach(r => r[rel.alias] = []); continue; }
      const [relRows] = await pool.query(
        `SELECT * FROM \`${meta.refTable}\` WHERE \`${meta.refKey}\` IN (${ids.map(()=>'?').join(',')}) ORDER BY sort_order ASC, created_at ASC`,
        ids);
      const nested = await loadRelations(meta.refTable, relRows, parseSelectRelations(rel.subSelect));
      const map = {};
      nested.forEach(r => { if (!map[r[meta.refKey]]) map[r[meta.refKey]] = []; map[r[meta.refKey]].push(r); });
      rows.forEach(r => r[rel.alias] = map[r[meta.fk]] || []);
    } else {
      const ids = [...new Set(rows.map(r => r[meta.fk]).filter(Boolean))];
      if (!ids.length) { rows.forEach(r => r[rel.alias] = null); continue; }
      const [relRows] = await pool.query(
        `SELECT * FROM \`${meta.refTable}\` WHERE \`${meta.refKey}\` IN (${ids.map(()=>'?').join(',')})`,
        ids);
      const nested = await loadRelations(meta.refTable, relRows, parseSelectRelations(rel.subSelect));
      const map = {};
      nested.forEach(r => map[r[meta.refKey]] = r);
      rows.forEach(r => r[rel.alias] = map[r[meta.fk]] ?? null);
    }
  }
  return rows;
}

/** Reescribe URLs de Supabase Storage a localhost para que las fotos carguen local */
function localizeUrls(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(localizeUrls);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && v.includes('supabase.co/storage'))
      out[k] = v.replace(SUPABASE_STORAGE, LOCAL_STORAGE);
    else if (v && typeof v === 'object')
      out[k] = localizeUrls(v);
    else
      out[k] = v;
  }
  return out;
}

/** Verifica JWT y retorna el payload o null */
function verifyToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), JWT_SECRET); }
  catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES  (/auth/v1/*)
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/auth/v1/settings', (_req, res) =>
  res.json({ mailer_autoconfirm: true, phone_autoconfirm: true, disable_signup: true }));

app.post('/auth/v1/token', async (req, res) => {
  const { email, password } = req.body || {};
  try {
    const [rows] = await pool.query(
      'SELECT id, email, role FROM admin_users WHERE email = ? AND password_hash = ?',
      [email, hashPassword(password || '')]
    );
    if (rows.length) {
      const user  = rows[0];
      const token = jwt.sign({ id: user.id, email: user.email, role: 'authenticated' }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        access_token: token, token_type: 'bearer',
        expires_in: 604800, refresh_token: token,
        user: { id: user.id, email: user.email, role: 'authenticated', app_metadata: { role: 'admin' } }
      });
    }
  } catch (err) {
    console.error('[AUTH]', err.message);
  }
  res.status(400).json({ error: 'invalid_grant', error_description: 'Credenciales incorrectas' });
});

app.get('/auth/v1/user', (req, res) => {
  const p = verifyToken(req);
  if (!p) return res.status(401).json({ message: 'No autorizado' });
  res.json({ id: p.id, email: p.email, role: 'authenticated' });
});

app.get('/auth/v1/session', (req, res) => {
  const p = verifyToken(req);
  if (!p) return res.json({ session: null });
  const token = (req.headers.authorization || '').slice(7);
  res.json({ session: { access_token: token, token_type: 'bearer',
    user: { id: p.id, email: p.email, role: 'authenticated' } } });
});

app.post('/auth/v1/logout', (_req, res) => res.status(204).send());

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE ROUTES  (/storage/v1/*)
// ═══════════════════════════════════════════════════════════════════════════════

// Subir foto: POST /storage/v1/object/:bucket/:...path
app.post('/storage/v1/object/:bucket/*', (req, res) => {
  const bucket = req.params.bucket;
  const filePath = req.params[0] || ('upload-' + Date.now());
  const dest = path.join(UPLOADS_DIR, bucket, filePath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, req.rawBody || Buffer.alloc(0));
  console.log('[STORAGE] upload:', bucket + '/' + filePath, (req.rawBody || '').length, 'bytes');
  res.json({ Key: `${bucket}/${filePath}` });
});

// Servir foto: GET /storage/v1/object/public/:bucket/:...path
app.get('/storage/v1/object/public/:bucket/*', (req, res) => {
  const bucket = req.params.bucket;
  const file   = req.params[0];
  const fromUpload = path.join(UPLOADS_DIR, bucket, file);
  const fromCache  = path.join(CACHED_DIR, path.basename(file));
  if (fs.existsSync(fromUpload)) return res.sendFile(path.resolve(fromUpload));
  if (fs.existsSync(fromCache))  return res.sendFile(path.resolve(fromCache));
  res.status(404).json({ error: 'Foto no encontrada' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REST ROUTES  (/rest/v1/*)  — compatible PostgREST
// ═══════════════════════════════════════════════════════════════════════════════

// GET /rest/v1/:table  — SELECT con relaciones anidadas
app.get('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { select = '*', order, limit, offset } = req.query;
    const { conditions, values } = parseFilters(req.query);
    const where  = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const ord    = parseOrder(order);
    const lim    = limit  ? `LIMIT ${parseInt(limit)}`    : '';
    const off    = offset ? `OFFSET ${parseInt(offset)}`  : '';
    const [rows] = await pool.query(`SELECT * FROM \`${table}\` ${where} ${ord} ${lim} ${off}`, values);
    const rels   = parseSelectRelations(select);
    const result = await loadRelations(table, rows, rels);
    const local  = localizeUrls(result);
    if ((req.headers['prefer'] || '').includes('count=exact'))
      res.set('Content-Range', `0-${local.length > 0 ? local.length - 1 : 0}/${local.length}`);
    res.json(local);
  } catch (err) {
    console.error('[GET]', err.message);
    res.status(500).json({ message: err.message, code: err.code });
  }
});

// POST /rest/v1/:table  — INSERT
app.post('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const prefer = req.headers['prefer'] || '';
    const rows   = Array.isArray(req.body) ? req.body : [req.body || {}];
    const results = [];
    for (const row of rows) {
      if (!row.id) row.id = randomUUID();
      const cols = Object.keys(row).filter(k => row[k] !== undefined);
      const vals = cols.map(c => row[c] === '' ? '' : row[c]);
      await pool.query(
        `INSERT INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
        vals);
      if (prefer.includes('return=representation') || prefer.includes('return=minimal') === false) {
        const [ins] = await pool.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [row.id]);
        results.push(...(ins.length ? [localizeUrls(ins[0])] : [{ id: row.id }]));
      } else {
        results.push({ id: row.id });
      }
    }
    res.status(201).json(results);
  } catch (err) {
    console.error('[POST]', err.message);
    res.status(400).json({ message: err.message, code: err.code });
  }
});

// PATCH /rest/v1/:table  — UPDATE
app.patch('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const prefer = req.headers['prefer'] || '';
    const data   = req.body || {};
    const { conditions, values } = parseFilters(req.query);
    const cols   = Object.keys(data);
    if (!cols.length) return res.json([]);
    const set  = cols.map(c => `\`${c}\` = ?`).join(', ');
    const setV = cols.map(c => data[c]);
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    await pool.query(`UPDATE \`${table}\` SET ${set} ${where}`, [...setV, ...values]);
    if (prefer.includes('return=representation')) {
      const [updated] = await pool.query(`SELECT * FROM \`${table}\` ${where}`, values);
      return res.json(localizeUrls(updated));
    }
    res.json([]);
  } catch (err) {
    console.error('[PATCH]', err.message);
    res.status(400).json({ message: err.message, code: err.code });
  }
});

// DELETE /rest/v1/:table  — DELETE
app.delete('/rest/v1/:table', async (req, res) => {
  try {
    const { table } = req.params;
    const { conditions, values } = parseFilters(req.query);
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    if (!where) return res.status(400).json({ message: 'Se requiere al menos un filtro para DELETE' });
    await pool.query(`DELETE FROM \`${table}\` ${where}`, values);
    res.status(204).send();
  } catch (err) {
    console.error('[DELETE]', err.message);
    res.status(400).json({ message: err.message, code: err.code });
  }
});

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({
  app: 'Minimapa Backend', version: '1.0.0',
  db: 'MySQL minimapa', port: PORT
}));

// ─── Start ────────────────────────────────────────────────────────────────────
pool.getConnection().then(conn => {
  conn.release();
  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  Minimapa Backend  →  http://localhost:' + PORT + '  ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  DB   : MySQL 8 · minimapa                   ║');
    console.log('║  Admin: alonsouas1006@gmail.com / Alonso123  ║');
    console.log('║  Auth : MySQL admin_users table              ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
  });
}).catch(err => {
  console.error('Error conectando a MySQL:', err.message);
  process.exit(1);
});
