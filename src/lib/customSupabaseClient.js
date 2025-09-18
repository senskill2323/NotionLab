import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing. Check .env (VITE_SUPABASE_URL/ANON_KEY).');
}

// Ensure singletons across HMR/tab contexts to avoid multiple GoTrueClient instances.
const globalScope = typeof window !== 'undefined' ? window : globalThis;

const supabaseBaseUrl = (() => {
  try {
    return supabaseUrl ? new URL(supabaseUrl) : null;
  } catch (error) {
    console.error('Invalid Supabase URL. Check VITE_SUPABASE_URL.', error);
    return null;
  }
})();

const appendApiKeyIfMissing = (input) => {
  if (!supabaseAnonKey || !supabaseBaseUrl) return input;
  const urlStr = typeof input === 'string' ? input : (input && input.url) ? input.url : null;
  if (!urlStr) return input;

  try {
    const url = new URL(urlStr);
    if (url.origin === supabaseBaseUrl.origin && url.pathname.startsWith('/rest/v1') && !url.searchParams.has('apikey')) {
      url.searchParams.set('apikey', supabaseAnonKey);
      return url.toString();
    }
  } catch (_) {
    // Ignore parse issues; headers still contain apikey.
  }

  return input;
};

const NETWORK_ERROR_CODE = 'NETWORK_ERROR';
const SUPABASE_FETCH_TIMEOUT_MS = 30000; // increase to avoid spurious timeouts during heavy admin loads

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

const buildSupabaseFetch = ({ clientLabel, ensureHeaders }) => async (input, init = {}) => {
  const headers = new Headers(init.headers || {});
  ensureHeaders(headers);

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
  const finalInput = appendApiKeyIfMissing(input);

  try {
    return await fetch(finalInput, finalInit);
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

const createAuthedClient = () => createClient(supabaseUrl, supabaseAnonKey, {
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