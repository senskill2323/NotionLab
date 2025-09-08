// scripts/run-sql.js
// Usage :
//   npm run db:query "select now(), current_user"
//   npm run db:file ./sql/inventory.sql

import dotenv from 'dotenv';
import fs from 'fs';
import { Client } from 'pg';
import dns from 'dns';

// Priorise IPv4 pour éviter certains soucis de résolution DNS (ex. hébergeurs/FTPs)
dns.setDefaultResultOrder('ipv4first');

// Charge .env.local en priorité (puis .env s'il existe)
dotenv.config({ path: '.env.local' });
dotenv.config();

// Diagnostic minimal (sans fuite de secrets)
console.log('[run-sql] start', new Date().toISOString());
console.log('[run-sql] argv:', JSON.stringify(process.argv.slice(2)));
process.on('unhandledRejection', (err) => {
  console.error('UnhandledRejection:', err?.message || err);
});
process.on('uncaughtException', (err) => {
  console.error('UncaughtException:', err?.message || err);
});

const q = process.argv[2];     // requête passée en argument
const file = process.argv[3];  // fichier .sql optionnel
const sql = file ? fs.readFileSync(file, 'utf8') : q;

console.log(`[run-sql] mode=${file ? 'file' : 'inline'} sql_length=${sql ? sql.length : 0}`);

if (!sql) {
  console.error('Usage:\n  npm run db:query "<SQL>"\n  npm run db:file ./sql/inventory.sql');
  process.exit(1);
}

// Prépare la config PG :
// 1) Si DATABASE_URL est défini, on l’utilise.
// 2) Sinon on lit PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD.
let client;
if (process.env.DATABASE_URL) {
  console.log('[run-sql] Using DATABASE_URL with SSL');
  client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
} else {
  const {
    PGHOST,
    PGPORT,
    PGDATABASE,
    PGUSER,
    PGPASSWORD,
  } = process.env;

  // Petit guard pour éviter les surprises
  if (!PGHOST || !PGPORT || !PGDATABASE || !PGUSER || !PGPASSWORD) {
    console.error(
      'Config PG manquante.\n' +
      'Définis soit DATABASE_URL, soit PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD dans .env.local'
    );
    process.exit(1);
  }

  console.log('[run-sql] Using PG* variables with SSL');
  client = new Client({
    host: PGHOST,
    port: Number(PGPORT),
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD,
    ssl: { rejectUnauthorized: false },
  });
}

(async () => {
  try {
    console.log('[run-sql] Connecting...');
    await client.connect();
    console.log('[run-sql] Connected. Executing query...');
    const res = await client.query(sql);
    // Affichage JSON lisible pour que Windsurf puisse le reprendre facilement
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error('DB error:', e.message);
    process.exit(2);
  } finally {
    await client.end();
    console.log('[run-sql] done');
  }
})();
