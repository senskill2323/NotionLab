import { useEffect } from 'react';

const SESSION_REFRESH_EVENT = 'nl:supabase-session-refresh';

export const emitSessionRefresh = (detail = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SESSION_REFRESH_EVENT, { detail }));
};

export const subscribeSessionRefresh = (handler) => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener(SESSION_REFRESH_EVENT, handler);
  return () => window.removeEventListener(SESSION_REFRESH_EVENT, handler);
};

export const useSessionRefresh = (callback, deps = []) => {
  useEffect(() => {
    if (typeof callback !== 'function') return undefined;
    const handler = () => callback();
    return subscribeSessionRefresh(handler);
  }, deps);
};