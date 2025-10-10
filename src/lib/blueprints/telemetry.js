const DEFAULT_ENDPOINT = '/api/telemetry/blueprint-autosave';

const getTelemetryEndpoint = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BLUEPRINT_AUTOSAVE_TELEMETRY_URL) {
      return import.meta.env.VITE_BLUEPRINT_AUTOSAVE_TELEMETRY_URL;
    }
  } catch (error) {
    // ignore - import.meta not available
  }
  return DEFAULT_ENDPOINT;
};

const sanitizePayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (value === undefined || typeof value === 'function') {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
};

export function emitBlueprintAutosaveTelemetry(event, data = {}) {
  if (typeof window === 'undefined') return;

  const endpoint = getTelemetryEndpoint();
  if (!endpoint) return;

  const payload = sanitizePayload({
    event,
    source: 'blueprint_autosave',
    timestamp: new Date().toISOString(),
    ...data,
  });

  try {
    const body = JSON.stringify(payload);
    if (navigator?.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
      return;
    }

    if (typeof fetch === 'function') {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (error) {
    if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.debug('[blueprint-autosave] telemetry emit failed', error);
    }
  }
}
