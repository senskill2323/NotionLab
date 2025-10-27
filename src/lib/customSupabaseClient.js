import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase env vars missing. Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// Ensure singletons across HMR/tab contexts to avoid multiple GoTrueClient instances.
const globalScope = typeof window !== 'undefined' ? window : globalThis;

const NETWORK_ERROR_CODE = 'NETWORK_ERROR';
const SUPABASE_FETCH_TIMEOUT_MS = 30000; // increase to avoid spurious timeouts during heavy admin loads

const readStoredAccessToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage?.getItem('nl-auth');
    if (!raw) return null;
    const stored = JSON.parse(raw);
    return stored?.currentSession?.access_token || stored?.session?.access_token || null;
  } catch (error) {
    console.warn('[supabase] failed to parse stored session', error);
    return null;
  }
};

let cachedAccessToken = readStoredAccessToken();
const getActiveAccessToken = () => {
  if (cachedAccessToken) return cachedAccessToken;
  const fromStorage = readStoredAccessToken();
  if (fromStorage) {
    cachedAccessToken = fromStorage;
    return cachedAccessToken;
  }
  return null;
}; // Only return a session access token; avoid falling back to anon key for Authorization.

const createNetworkErrorResponse = (error, clientLabel) => {
  const message = error?.message || 'Network request failed';
  if (typeof console !== 'undefined') {
    console.warn(`[supabase:${clientLabel}] network request failed`, error);
  }

  const payload = {
    message,
    details: error?.stack || null,
    hint: 'network_error',
    code: NETWORK_ERROR_CODE,
    error: NETWORK_ERROR_CODE,
    error_description: message,
  };

  return new Response(JSON.stringify(payload), {
    status: 503,
    statusText: 'Network Error',
    headers: {
      'Content-Type': 'application/json',
      'X-Supabase-Network-Error': '1',
    },
  });
};

const buildSupabaseFetch = ({ clientLabel, ensureHeaders, getAccessToken }) => async (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  ensureHeaders(headers);

  if (!headers.has('Authorization')) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      console.warn('[supabase:authed] missing access token for request', input);
    }
  } else {
    // eslint-disable-next-line no-console
    console.debug('[supabase:authed] using provided authorization header');
  }

  const upstreamSignal = init.signal;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort('supabase-fetch-timeout');
    }
  }, SUPABASE_FETCH_TIMEOUT_MS);

  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException('Aborted', 'AbortError');
    }
    upstreamSignal.addEventListener(
      'abort',
      () => {
        if (!controller.signal.aborted) {
          controller.abort(upstreamSignal.reason ?? 'upstream-abort');
        }
      },
      { once: true },
    );
  }

  const finalInit = { ...init, headers, signal: controller.signal };
  try {
    return await fetch(input, finalInit);
  } catch (error) {
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (reason === 'supabase-fetch-timeout') {
        return createNetworkErrorResponse(new Error('Supabase fetch timed out'), clientLabel);
      }
      throw error;
    }
    if (error?.name === 'AbortError') {
      throw error;
    }
    return createNetworkErrorResponse(error, clientLabel);
  } finally {
    clearTimeout(timeoutId);
  }
};

const createAuthedClient = () => {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        apikey: supabaseAnonKey || '',
      },
      fetch: buildSupabaseFetch({
        clientLabel: 'authed',
        ensureHeaders: (headers) => {
          if (!headers.has('apikey')) {
            headers.set('apikey', supabaseAnonKey || '');
          }
        },
        getAccessToken: getActiveAccessToken,
      }),
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'nl-auth',
      multiTab: true,
    },
  });

  const assignAccessTokenFromSession = (session) => {
    cachedAccessToken = session?.access_token || null;
  };

  client.auth.getSession().then(({ data, error }) => {
    if (!error) {
      assignAccessTokenFromSession(data?.session);
    }
  }).catch((err) => {
    console.warn('[supabase] failed to warm session cache', err);
  });

  client.auth.onAuthStateChange((_event, session) => {
    assignAccessTokenFromSession(session);
  });

  return client;
};

export const supabase = globalScope.__nl_supabase || createAuthedClient();
if (!globalScope.__nl_supabase) {
  globalScope.__nl_supabase = supabase;
}

try {
  if (typeof window !== 'undefined' && import.meta && import.meta.env && import.meta.env.DEV) {
    if (!globalScope.supabase) {
      globalScope.supabase = supabase;
    }
  }
} catch (_) {
  // ignore if import.meta not available
}
