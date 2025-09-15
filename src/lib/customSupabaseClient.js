import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing. Check .env (VITE_SUPABASE_URL/ANON_KEY).');
}

// Public client to fetch public resources without user session interference
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      apikey: supabaseAnonKey || '',
      Authorization: `Bearer ${supabaseAnonKey || ''}`,
    },
    fetch: async (input, init = {}) => {
      const headers = new Headers(init.headers || {});
      headers.set('apikey', supabaseAnonKey || '');
      headers.set('Authorization', `Bearer ${supabaseAnonKey || ''}`);

      // Fallback: add apikey as query param for REST calls if some intermediary strips headers
      let finalInput = input;
      try {
        const urlStr = typeof input === 'string' ? input : (input && input.url) ? input.url : null;
        if (urlStr) {
          const u = new URL(urlStr);
          const base = new URL(supabaseUrl);
          if (u.origin === base.origin && u.pathname.startsWith('/rest/v1')) {
            if (!u.searchParams.has('apikey') && supabaseAnonKey) {
              u.searchParams.set('apikey', supabaseAnonKey);
              finalInput = u.toString();
            }
          }
        }
      } catch (_) {
        // ignore URL parse issues; headers still ensure auth
      }

      return fetch(finalInput, { ...init, headers });
    },
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    // Utiliser une storageKey unique pour éviter les collisions avec le client authentifié
    storageKey: 'nl-public-auth',
    // Le client public n'a pas besoin de multi‑onglets/broadcast
    multiTab: false,
  },
});

// Force apikey + Authorization headers globally to avoid intermittent missing-header issues
// (e.g., when intermediaries strip headers or internal fetches occur)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      apikey: supabaseAnonKey || '',
    },
    // Enforce headers even if an internal call overrides them
    fetch: async (input, init = {}) => {
      const headers = new Headers(init.headers || {});
      if (!headers.has('apikey')) headers.set('apikey', supabaseAnonKey || '');
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${supabaseAnonKey || ''}`);

      // Fallback: add apikey as query param for REST calls if some intermediary strips headers
      let finalInput = input;
      try {
        const urlStr = typeof input === 'string' ? input : (input && input.url) ? input.url : null;
        if (urlStr) {
          const u = new URL(urlStr);
          const base = new URL(supabaseUrl);
          if (u.origin === base.origin && u.pathname.startsWith('/rest/v1')) {
            if (!u.searchParams.has('apikey') && supabaseAnonKey) {
              u.searchParams.set('apikey', supabaseAnonKey);
              finalInput = u.toString();
            }
          }
        }
      } catch (_) {
        // ignore URL parse issues; headers still ensure auth
      }

      return fetch(finalInput, { ...init, headers });
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // StorageKey dédiée pour le client authentifié
    storageKey: 'nl-auth',
    // Conserver le fonctionnement multi-onglets pour la session utilisateur
    multiTab: true,
  },
});