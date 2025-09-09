import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv(rootDir) {
  const envPath = path.join(rootDir, '.env');
  const env = { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' };
  try {
    const txt = fs.readFileSync(envPath, 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      if (key in env) env[key] = val;
    }
  } catch (e) {
    console.error('[audit] Unable to read .env:', e.message);
  }
  return env;
}

function printSection(title) {
  console.log('\n=== ' + title + ' ===');
}

async function checkTableExists(supabase, table) {
  try {
    const { error, count } = await supabase
      .from(table)
      .select('id', { head: true, count: 'exact' });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      const hintNotExist = msg.includes('relation') && msg.includes('does not exist');
      return { exists: !hintNotExist, error: error.message };
    }
    return { exists: true, error: null };
  } catch (e) {
    return { exists: false, error: e.message };
  }
}

async function trySelect(supabase, table, columns = '*', filters = []) {
  try {
    let query = supabase.from(table).select(columns).limit(3);
    for (const f of filters) query = query.eq(f.col, f.val);
    const { data, error } = await query;
    return { data, error };
  } catch (e) {
    return { data: null, error: { message: e.message } };
  }
}

async function checkFunctionExists(supabase, fn, args = {}) {
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) {
      const msg = (error.message || '').toLowerCase();
      const notFound = msg.includes('could not find') || msg.includes('not found') || msg.includes('does not exist');
      return { exists: !notFound, ok: false, error: error.message };
    }
    return { exists: true, ok: true, data };
  } catch (e) {
    return { exists: false, ok: false, error: e.message };
  }
}

async function main() {
  const root = process.cwd();
  const env = loadEnv(root);
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    console.error('[audit] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

  printSection('Tables existence');
  const tables = [
    'formation_module_statuses',
    'user_formation_submissions',
    'formation_submission',
    'user_formation_snapshots',
    'courses',
  ];
  for (const t of tables) {
    const r = await checkTableExists(supabase, t);
    console.log(`${t}: exists=${r.exists} ${r.error ? `(err: ${r.error})` : ''}`);
  }

  printSection('RPC existence');
  const rpcs = [
    { name: 'approve_user_parcours_submission', args: { p_submission_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'get_user_kanban_modules', args: { p_user_id: '00000000-0000-0000-0000-000000000000' } },
    { name: 'get_admin_kanban_module_statuses', args: { p_user_id: '00000000-0000-0000-0000-000000000000', p_course_id: '00000000-0000-0000-0000-000000000000' } },
  ];
  for (const r of rpcs) {
    const out = await checkFunctionExists(supabase, r.name, r.args);
    console.log(`${r.name}: exists=${out.exists} ok=${out.ok} ${out.error ? `(err: ${out.error})` : ''}`);
  }

  printSection('formation_module_statuses sanity');
  {
    const r = await trySelect(supabase, 'formation_module_statuses', 'id, user_id, submission_id, module_uuid, status, position', []);
    if (r.error) console.log('select error:', r.error.message);
    else console.log('rows sample:', r.data);

    const rd = await trySelect(supabase, 'formation_module_statuses', 'status', []);
    if (rd.error) console.log('distinct status error (will attempt client-side distinct):', rd.error.message);
    else console.log('status sample:', [...new Set((rd.data || []).map(x => x.status))]);
  }

  printSection('courses.nodes sanity (custom)');
  {
    const r = await trySelect(supabase, 'courses', 'id, course_type, status, nodes', [{ col: 'course_type', val: 'custom' }]);
    if (r.error) console.log('courses select error:', r.error.message);
    else {
      for (const row of r.data || []) {
        const t = row?.nodes && typeof row.nodes === 'object' ? (Array.isArray(row.nodes) ? 'array' : 'object') : typeof row?.nodes;
        console.log(`course ${row.id}: nodes type = ${t}`);
      }
    }
  }

  printSection('Which submission table exists');
  const hasUFS = (await checkTableExists(supabase, 'user_formation_submissions')).exists;
  const hasFS  = (await checkTableExists(supabase, 'formation_submission')).exists;
  console.log('user_formation_submissions exists:', hasUFS);
  console.log('formation_submission exists:', hasFS);

  if (hasFS) {
    printSection('formation_submission approved sample');
    const r = await trySelect(supabase, 'formation_submission', 'id, user_id, course_id, status, created_at', []);
    if (r.error) console.log('fs select error:', r.error.message);
    else console.log('fs rows sample:', r.data);
  }
  if (hasUFS) {
    printSection('user_formation_submissions approved sample');
    const r = await trySelect(supabase, 'user_formation_submissions', 'id, user_id, course_id, submission_status, submitted_at', []);
    if (r.error) console.log('ufs select error:', r.error.message);
    else console.log('ufs rows sample:', r.data);
  }

  printSection('user_formation_snapshots sample');
  {
    const r = await trySelect(supabase, 'user_formation_snapshots', 'id, user_id, submission_id, course_id, created_at', []);
    if (r.error) console.log('snapshots select error:', r.error.message);
    else console.log('snapshots rows sample:', r.data);
  }

  console.log('\n[audit] Done.');
}

main().catch(e => {
  console.error('[audit] Fatal:', e);
  process.exit(1);
});
