import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from './SupabaseAuthContext';

const PermissionsContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

export const PermissionsProvider = ({ children }) => {
  const location = useLocation();
  const { user, authReady } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);
  const [error, setError] = useState(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [ready, setReady] = useState(false); // true when we have a valid cache or a fresh network result
  const retryRef = useRef({ timer: null, backoff: 5000 });
  const lastVisibilityFetchRef = useRef(0);

  const isProtectedPath = useCallback((path) => {
    const protectedPrefixes = [
      '/dashboard',
      '/chat',
      '/nouveau-ticket',
      '/ticket',
      '/tickets',
      '/formation-builder',
      '/parcours',
      '/forum',
      '/admin',
    ];
    return protectedPrefixes.some((p) => path.startsWith(p));
  }, []);

  const CACHE_PREFIX = 'perm_cache_v1:';
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL to avoid stale perms
  const getCacheKey = (u) => {
    if (!u || !u.id) return `${CACHE_PREFIX}guest`;
    return `${CACHE_PREFIX}${u.id}`;
  };

  const readCache = (u) => {
    try {
      const cacheKey = getCacheKey(u);
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.permissions)) return null;
      if (!parsed.ts || (Date.now() - parsed.ts) > CACHE_TTL_MS) {
        return null; // stale
      }
      return parsed;
    } catch (_) {
      return null;
    }
  };

  const writeCache = (u, perms, type) => {
    try {
      const cacheKey = getCacheKey(u);
      localStorage.setItem(cacheKey, JSON.stringify({ permissions: perms, userType: type, ts: Date.now() }));
    } catch (_) {
      // ignore cache write errors
    }
  };

  const fetchPermissions = useCallback(async () => {
    // Avoid racing before auth and profile are settled
    if (!authReady) return;
    setUserType(null);
    setError(null);
    setUsingFallback(false);

    // Fast path: valid cache for this user
    const cached = readCache(user);
    const hasValidCache = !!cached;
    if (hasValidCache) {
      setPermissions(cached.permissions);
      setUserType(cached.userType || (user?.profile?.user_type ?? 'guest'));
      setReady(true);
      setLoading(false);
      // Skip immediate network fetch; rely on TTL, visibility/online events, or explicit refresh
      return;
    } else {
      // No valid cache: set minimal fallback, but mark as not ready
      const fallbackType = user?.profile?.user_type || 'guest';
      setUserType(fallbackType);
      // If we were already ready once, keep UI ready and fetch in background without forcing fallback UI
      if (!ready) {
        setPermissions([]);
        setUsingFallback(true);
        setReady(false);
        setLoading(false);
      }
    }

    try {
      // Safety timeout via Promise.race to avoid blocking the UI
      const TIMEOUT_MS = 6000;
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ __timeout: true }), TIMEOUT_MS)
      );

      // If no authenticated user or profile not loaded yet, do not hit the network at all.
      if (!user || !user.profile || !user.profile.user_type) {
        setUserType('guest');
        setUsingFallback(!hasValidCache);
        // Not ready yet: wait for profile or explicit refresh
        setReady(false);
        setLoading(false);
        return;
      }

      let result;
      {
        const currentUserType = user.profile.user_type;
        setUserType(currentUserType);
        const typeToQuery = currentUserType === 'owner' ? 'admin' : currentUserType;
        const query = supabase.from('role_permissions').select('permission').eq(typeToQuery, true);
        result = await Promise.race([query, timeoutPromise]);
      }

      if (result && result.__timeout) {
        console.debug('Permissions fetch timed out. Using minimal or cached permissions.');
        setUsingFallback(!hasValidCache);
        // Fail-open for UI readiness: allow app to continue with fallback
        setReady(true);
        setLoading(false);
        return;
      }

      const { data, error: fetchErr } = result || {};
      if (fetchErr) {
        if (fetchErr.code === '42703') {
          console.warn('Permissions column not found for role. User may have limited permissions.');
          setPermissions([]);
          setUsingFallback(!hasValidCache);
          setReady(hasValidCache);
        } else {
          throw fetchErr;
        }
      } else if (Array.isArray(data)) {
        const userPermissions = Array.from(new Set(data.map(p => p.permission)));
        setPermissions(userPermissions);
        writeCache(user, userPermissions, user?.profile?.user_type ?? 'guest');
        setUsingFallback(false);
        setReady(true);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError(err);
      setPermissions([]);
      setUsingFallback(!hasValidCache);
      // Fail-open for UI readiness on error as well
      setReady(true);
    } finally {
      setLoading(false);
    }
  }, [user, authReady, ready]);

  // Prefetch permissions only on protected routes, once auth is ready
  useEffect(() => {
    const path = location.pathname || '';
    if (authReady && isProtectedPath(path)) {
      fetchPermissions();
    }
  }, [authReady, location.pathname, fetchPermissions, isProtectedPath]);

  // Background retry if we're using fallback (timeout or temporary failure)
  useEffect(() => {
    if (!ready || !usingFallback) {
      // clear any pending retries
      if (retryRef.current.timer) {
        clearTimeout(retryRef.current.timer);
        retryRef.current.timer = null;
      }
      retryRef.current.backoff = 5000;
      return;
    }

    if (retryRef.current.timer) return; // already scheduled

    const retry = async () => {
      await fetchPermissions();
      // if still usingFallback after fetch, schedule next retry with backoff
      if (retryRef.current) {
        retryRef.current.backoff = Math.min((retryRef.current.backoff || 5000) * 2, 60000);
        retryRef.current.timer = setTimeout(retry, retryRef.current.backoff);
      }
    };

    retryRef.current.backoff = 5000;
    retryRef.current.timer = setTimeout(retry, retryRef.current.backoff);

    return () => {
      if (retryRef.current.timer) {
        clearTimeout(retryRef.current.timer);
        retryRef.current.timer = null;
      }
    };
  }, [ready, usingFallback, fetchPermissions]);

  // Refresh on network regain and when tab becomes visible (protected pages only)
  useEffect(() => {
    const onOnline = () => {
      const path = window.location?.pathname || '';
      if (authReady && isProtectedPath(path)) fetchPermissions();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const path = window.location?.pathname || '';
        const now = Date.now();
        // Throttle to once every 3 seconds to prevent loops on Windows focus/blur storms
        if (authReady && isProtectedPath(path) && now - (lastVisibilityFetchRef.current || 0) > 3000) {
          lastVisibilityFetchRef.current = now;
          fetchPermissions();
        }
      }
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchPermissions, isProtectedPath, authReady]);

  const hasPermission = useCallback((requiredPermission) => {
    // The owner has all permissions, always. This is the ultimate override.
    if (userType === 'owner') return true;
    if (loading) return false;
    if (!requiredPermission) return true;
    return permissions.includes(requiredPermission);
  }, [permissions, loading, userType]);

  return (
    <PermissionsContext.Provider value={{
      permissions,
      hasPermission,
      loading,
      error,
      ready,
      usingFallback,
      // keep backwards compatibility: both names
      refetchPermissions: fetchPermissions,
      refreshPermissions: fetchPermissions,
    }}>
      {children}
    </PermissionsContext.Provider>
  );
};