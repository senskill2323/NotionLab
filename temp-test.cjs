const { createClient } = require('@supabase/supabase-js');
const url = 'https://supabase.notionlab.ch';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzYwODE1MzQ2LCJleHAiOjIwNzYxNzUzNDZ9.XW1uBRm2mp1d_5TfdrqGIaXQYpKLqrQqW4roBWTGVG8';
(async () => {
  const supabase = createClient(url, anon, { auth: { persistSession: false } });
  const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({ email: 'yann@bluewin.ch', password: 'Vasa1993' });
  if (signInError) {
    console.error('signInError', signInError);
    process.exit(1);
  }
  const token = sessionData.session.access_token;
  const userId = sessionData.user.id;
  console.log('signed in', userId);
  const call = async (fn, body) => {
    const resp = await fetch(`${url}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    console.log(fn, resp.status, text);
  };
  await call('set-user-password', { userId: '16ea1034-4b89-49ef-a174-ce05b42b54bf' });
  await call('users-search', { filters: {}, sort: { field: 'updated_at', dir: 'desc' }, page: 1, perPage: 5 });
  await call('content-blocks-search', { filters: {}, sort: { field: 'updated_at', dir: 'desc' }, page: 1, perPage: 5 });
  await call('invite-user', { email: 'new-client@example.com', firstName: 'New', lastName: 'Client', redirectTo: 'https://example.com' });
})();
