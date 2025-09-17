// Focus/Visibility Stress Test Utility
// Simulates tab switches by toggling focus/blur and visibilitychange events repeatedly.
// Attempts to override document.hidden and document.visibilityState (best-effort);
// falls back to dispatching events if the props are non-configurable.

interface StressOptions {
  cycles?: number;           // number of hide→show cycles
  intervalMs?: number;       // total duration per cycle (hide + show)
  jitterMs?: number;         // random jitter to better simulate real-world focus storms
  includeFreeze?: boolean;   // dispatch freeze/resume (if supported)
  includePageHide?: boolean; // dispatch pagehide/pageshow as part of the cycle
  log?: boolean;             // log to console
}

interface StressController {
  stop: () => void;
  isRunning: () => boolean;
}

const originalDescriptors = {
  hidden: Object.getOwnPropertyDescriptor(Document.prototype, 'hidden') ||
          Object.getOwnPropertyDescriptor(document, 'hidden'),
  visibilityState: Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState') ||
                   Object.getOwnPropertyDescriptor(document, 'visibilityState'),
};

function setDocVisibility(hidden: boolean, log = false) {
  try {
    const hiddenDesc = Object.getOwnPropertyDescriptor(document, 'hidden');
    const visDesc = Object.getOwnPropertyDescriptor(document, 'visibilityState');

    const define = (prop: 'hidden' | 'visibilityState', getFn: () => any) => {
      try {
        Object.defineProperty(document, prop, { configurable: true, get: getFn });
      } catch (_) {
        // Retry on Document.prototype for some browsers
        try {
          Object.defineProperty(Document.prototype as any, prop, { configurable: true, get: getFn });
        } catch (e2) {
          if (log) console.warn(`[focusStress] Cannot override document.${prop}`, e2);
        }
      }
    };

    define('hidden', () => hidden);
    define('visibilityState', () => (hidden ? 'hidden' : 'visible'));

    if (log) console.log(`[focusStress] visibility overridden → hidden=${hidden}`);
  } catch (e) {
    if (log) console.warn('[focusStress] Failed to set visibility properties:', e);
  }
}

function restoreDocVisibility(log = false) {
  try {
    if (originalDescriptors.hidden) {
      Object.defineProperty(document, 'hidden', originalDescriptors.hidden);
    }
    if (originalDescriptors.visibilityState) {
      Object.defineProperty(document, 'visibilityState', originalDescriptors.visibilityState);
    }
    if (log) console.log('[focusStress] visibility properties restored');
  } catch (e) {
    if (log) console.warn('[focusStress] Failed to restore visibility properties:', e);
  }
}

function dispatch(type: string, target: Window | Document = window, detail?: any, log = false) {
  const ev = new (type === 'visibilitychange' ? Event : CustomEvent)(type, { detail } as any);
  (target as any).dispatchEvent(ev);
  if (log) console.log(`[focusStress] dispatched → ${type}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(base: number, jitterMs = 0) {
  if (!jitterMs) return base;
  const delta = Math.floor((Math.random() - 0.5) * 2 * jitterMs);
  return Math.max(0, base + delta);
}

export const focusStressTest = {
  // Run a burst of rapid visibility/focus toggles
  async burst(toggles = 10, stepMs = 100, opts: Partial<StressOptions> = {}): Promise<void> {
    const log = !!opts.log;
    for (let i = 0; i < toggles; i++) {
      setDocVisibility(true, log);
      dispatch('visibilitychange', document, undefined, log);
      dispatch('blur', window, undefined, log);
      await sleep(stepMs);
      setDocVisibility(false, log);
      dispatch('visibilitychange', document, undefined, log);
      dispatch('focus', window, undefined, log);
      await sleep(stepMs);
    }
    restoreDocVisibility(log);
  },

  // Run a controlled cycle-based stress test
  run(options: StressOptions = {}): StressController {
    const {
      cycles = 8,
      intervalMs = 1000,
      jitterMs = 120,
      includeFreeze = false,
      includePageHide = false,
      log = true,
    } = options;

    let stopped = false;
    let running = true;

    const runner = (async () => {
      const half = Math.max(50, Math.floor(intervalMs / 2));
      for (let i = 0; i < cycles && !stopped; i++) {
        // Hide phase
        setDocVisibility(true, log);
        dispatch('visibilitychange', document, undefined, log);
        dispatch('blur', window, undefined, log);
        if (includePageHide) dispatch('pagehide', window, { persisted: false }, log);
        if (includeFreeze && 'onfreeze' in document) dispatch('freeze', document, undefined, log);
        await sleep(jitter(half, jitterMs));

        // Show phase
        if (includeFreeze && 'onresume' in document) dispatch('resume', document, undefined, log);
        if (includePageHide) dispatch('pageshow', window, { persisted: false }, log);
        setDocVisibility(false, log);
        dispatch('visibilitychange', document, undefined, log);
        dispatch('focus', window, undefined, log);
        await sleep(jitter(half, jitterMs));
      }
      restoreDocVisibility(log);
      running = false;
      if (log) console.log('[focusStress] completed');
    })();

    return {
      stop: () => {
        stopped = true;
        restoreDocVisibility(log);
        running = false;
        if (log) console.log('[focusStress] stopped manually');
      },
      isRunning: () => running,
    };
  },
};

// Expose globally in DEV for convenience
try {
  if ((import.meta as any).env?.DEV) {
    (window as any).focusStressTest = focusStressTest;
    console.log('🧪 focusStressTest loaded. Try: focusStressTest.run({ cycles: 10, intervalMs: 800 })');
  }
} catch {}

export type { StressOptions, StressController };
