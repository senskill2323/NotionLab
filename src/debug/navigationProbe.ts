// Navigation Debug Probe - Critical Tab Switch Bug Investigation
// Tracks all navigation events, auth state changes, and browser lifecycle events

interface NavigationEvent {
  timestamp: number;
  type: string;
  details: any;
  url: string;
  userAgent: string;
}

class NavigationProbe {
  private events: NavigationEvent[] = [];
  private isActive = false;
  private originalPushState: typeof history.pushState;
  private originalReplaceState: typeof history.replaceState;
  private originalAssign: typeof location.assign;
  private originalReplace: typeof location.replace;
  private originalReload: typeof location.reload;

  constructor() {
    // Store original methods for restoration
    this.originalPushState = history.pushState.bind(history);
    this.originalReplaceState = history.replaceState.bind(history);
    this.originalAssign = location.assign.bind(location);
    this.originalReplace = location.replace.bind(location);
    this.originalReload = location.reload.bind(location);
  }

  private log(type: string, details: any = {}) {
    if (!this.isActive) return;
    
    const event: NavigationEvent = {
      timestamp: Date.now(),
      type,
      details,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    this.events.push(event);
    console.log(`🔍 NavigationProbe [${type}]:`, details, `URL: ${event.url}`);
    
    // Keep only last 100 events to prevent memory leak
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }

  startProbe() {
    if (this.isActive) return;
    this.isActive = true;
    
    console.log('🚀 NavigationProbe: Starting comprehensive navigation tracking...');
    
    // 1. Browser Lifecycle Events
    window.addEventListener('beforeunload', (e) => {
      this.log('beforeunload', { returnValue: e.returnValue });
    });
    
    window.addEventListener('unload', () => {
      this.log('unload', {});
    });
    
    window.addEventListener('pagehide', (e) => {
      this.log('pagehide', { persisted: e.persisted });
    });
    
    window.addEventListener('pageshow', (e) => {
      this.log('pageshow', { persisted: e.persisted });
    });
    
    // 2. Visibility and Focus Events
    document.addEventListener('visibilitychange', () => {
      this.log('visibilitychange', { 
        visibilityState: document.visibilityState,
        hidden: document.hidden 
      });
    });
    
    window.addEventListener('blur', () => {
      this.log('window-blur', {});
    });
    
    window.addEventListener('focus', () => {
      this.log('window-focus', {});
    });
    
    // 3. Page Freeze/Resume (modern browsers)
    if ('onfreeze' in document) {
      document.addEventListener('freeze', () => {
        this.log('freeze', {});
      });
    }
    
    if ('onresume' in document) {
      document.addEventListener('resume', () => {
        this.log('resume', {});
      });
    }
    
    // 4. History API Monkey Patching
    history.pushState = (state: any, title: string, url?: string | URL | null) => {
      this.log('history-pushState', { state, title, url });
      return this.originalPushState(state, title, url);
    };
    
    history.replaceState = (state: any, title: string, url?: string | URL | null) => {
      this.log('history-replaceState', { state, title, url });
      return this.originalReplaceState(state, title, url);
    };
    
    window.addEventListener('popstate', (e) => {
      this.log('popstate', { state: e.state });
    });
    
    // 5. Location API Monkey Patching (with error handling for read-only properties)
    try {
      const locationDescriptor = Object.getOwnPropertyDescriptor(location, 'assign');
      if (locationDescriptor && locationDescriptor.writable !== false) {
        location.assign = (url: string | URL) => {
          this.log('location-assign', { url: url.toString() });
          return this.originalAssign(url);
        };
      }
    } catch (e) {
      console.warn('NavigationProbe: Cannot override location.assign (read-only)');
    }
    
    try {
      const replaceDescriptor = Object.getOwnPropertyDescriptor(location, 'replace');
      if (replaceDescriptor && replaceDescriptor.writable !== false) {
        location.replace = (url: string | URL) => {
          this.log('location-replace', { url: url.toString() });
          return this.originalReplace(url);
        };
      }
    } catch (e) {
      console.warn('NavigationProbe: Cannot override location.replace (read-only)');
    }
    
    try {
      const reloadDescriptor = Object.getOwnPropertyDescriptor(location, 'reload');
      if (reloadDescriptor && reloadDescriptor.writable !== false) {
        location.reload = () => {
          this.log('location-reload', {});
          return this.originalReload();
        };
      }
    } catch (e) {
      console.warn('NavigationProbe: Cannot override location.reload (read-only)');
    }
    
    // 6. Storage Events
    window.addEventListener('storage', (e) => {
      this.log('storage-change', {
        key: e.key,
        oldValue: e.oldValue,
        newValue: e.newValue,
        storageArea: e.storageArea === localStorage ? 'localStorage' : 'sessionStorage'
      });
    });
    
    // 7. HMR Events (Vite specific)
    if ((import.meta as any).hot) {
      (import.meta as any).hot.on('vite:beforeUpdate', () => {
        this.log('vite-beforeUpdate', {});
      });
      
      (import.meta as any).hot.on('vite:afterUpdate', () => {
        this.log('vite-afterUpdate', {});
      });
      
      (import.meta as any).hot.on('vite:beforeFullReload', () => {
        this.log('vite-beforeFullReload', {});
      });
      
      (import.meta as any).hot.on('vite:ws:connect', () => {
        this.log('vite-ws-connect', {});
      });
      
      (import.meta as any).hot.on('vite:ws:disconnect', () => {
        this.log('vite-ws-disconnect', {});
      });
    }
    
    // 8. Service Worker Events
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.log('sw-controllerchange', {});
      });
      
      navigator.serviceWorker.addEventListener('message', (e) => {
        this.log('sw-message', { data: e.data });
      });
    }
    
    // 9. React Router Navigation (if available)
    this.hookReactRouter();
    
    // 10. Supabase Auth Events (if available)
    this.hookSupabaseAuth();
    
    this.log('probe-started', { timestamp: Date.now() });
  }
  
  private hookReactRouter() {
    // Try to hook into React Router if available
    try {
      // Check if React Router is available in window
      const router = (window as any).__REACT_ROUTER__;
      if (router) {
        this.log('react-router-detected', { version: router.version });
      }
    } catch (e) {
      // React Router not available or not exposed
    }
  }
  
  private hookSupabaseAuth() {
    // Try to hook into Supabase auth if available
    try {
      const supabase = (window as any).supabase;
      if (supabase?.auth) {
        supabase.auth.onAuthStateChange((event: string, session: any) => {
          this.log('supabase-auth-change', { 
            event, 
            hasSession: !!session,
            userId: session?.user?.id 
          });
        });
        
        this.log('supabase-auth-hooked', {});
      }
    } catch (e) {
      // Supabase not available
    }
  }
  
  stopProbe() {
    if (!this.isActive) return;
    this.isActive = false;
    
    // Restore original methods (with error handling)
    try {
      history.pushState = this.originalPushState;
      history.replaceState = this.originalReplaceState;
    } catch (e) {
      console.warn('NavigationProbe: Cannot restore history methods');
    }
    
    try {
      location.assign = this.originalAssign;
    } catch (e) {
      // location.assign might be read-only, ignore
    }
    
    try {
      location.replace = this.originalReplace;
    } catch (e) {
      // location.replace might be read-only, ignore
    }
    
    try {
      location.reload = this.originalReload;
    } catch (e) {
      // location.reload might be read-only, ignore
    }
    
    this.log('probe-stopped', { totalEvents: this.events.length });
    console.log('🛑 NavigationProbe: Stopped tracking');
  }
  
  getEvents(): NavigationEvent[] {
    return [...this.events];
  }
  
  getEventsSince(timestamp: number): NavigationEvent[] {
    return this.events.filter(e => e.timestamp >= timestamp);
  }
  
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }
  
  clearEvents() {
    this.events = [];
    console.log('🧹 NavigationProbe: Events cleared');
  }
  
  // Helper to detect critical navigation patterns
  detectCriticalPatterns(): string[] {
    const patterns: string[] = [];
    
    // Pattern 1: Visibility change followed by navigation
    for (let i = 0; i < this.events.length - 1; i++) {
      const current = this.events[i];
      const next = this.events[i + 1];
      
      if (current.type === 'visibilitychange' && 
          current.details.visibilityState === 'hidden' &&
          next.timestamp - current.timestamp < 5000 && // Within 5 seconds
          (next.type.includes('pushState') || next.type.includes('replaceState') || 
           next.type.includes('assign') || next.type.includes('reload'))) {
        patterns.push(`Visibility change → Navigation: ${current.type} → ${next.type}`);
      }
    }
    
    // Pattern 2: Auth state change causing navigation
    for (let i = 0; i < this.events.length - 1; i++) {
      const current = this.events[i];
      const next = this.events[i + 1];
      
      if (current.type === 'supabase-auth-change' &&
          next.timestamp - current.timestamp < 1000 &&
          (next.type.includes('pushState') || next.type.includes('replaceState'))) {
        patterns.push(`Auth change → Navigation: ${current.details.event} → ${next.type}`);
      }
    }
    
    // Pattern 3: HMR causing full reload
    const hmrReloads = this.events.filter(e => e.type === 'vite-beforeFullReload');
    if (hmrReloads.length > 0) {
      patterns.push(`HMR full reloads detected: ${hmrReloads.length} times`);
    }
    
    return patterns;
  }
}

// Global instance
const navigationProbe = new NavigationProbe();

// Expose to window for debugging
(window as any).navigationProbe = navigationProbe;

export { navigationProbe };
export type { NavigationEvent };
