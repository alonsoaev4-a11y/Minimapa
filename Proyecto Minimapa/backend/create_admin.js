'use strict';
/**
 * Crea la tabla admin_users e inserta el usuario administrador.
 * Uso: node create_admin.js
 */

const mysql  = require('mysql2/promise');
const crypto = require('crypto');

const ADMIN_EMAIL = 'alonsouas1006@gmail.com';
const ADMIN_PASS  = 'mac_uas2029';

function hashPassword(pass) {
  return crypto.createHash('sha256').update(pass).digest('hex');
}

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', user: 'root', password: 'root',
    database: 'minimapa', charset: 'utf8mb4',
  });

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            VARCHAR(36)  NOT NULL PRIMARY KEY,
      email         VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(64)  NOT NULL,
      role          VARCHAR(50)  NOT NULL DEFAULT 'admin',
      created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('✔ Tabla admin_users lista');

  const id   = require('crypto').randomUUID();
  const hash = hashPassword(ADMIN_PASS);

  await conn.execute(
    `INSERT INTO admin_users (id, email, password_hash, role)
     VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [id, ADMIN_EMAIL, hash]
  );
  console.log(`✔ Usuario admin creado/actualizado: ${ADMIN_EMAIL}`);

  await conn.end();
  console.log('Done.');
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
