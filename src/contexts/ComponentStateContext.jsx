import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useSessionRefresh } from '@/lib/sessionRefreshBus';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const ComponentStateContext = createContext();

export const useComponentState = () => useContext(ComponentStateContext);

export const ComponentStateProvider = ({ children }) => {
  const { user, loading: authLoading, authReady, sessionReady } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    // Only set loading to true on initial fetch
    if (rules.length === 0) {
      setLoading(true);
    }
    const { data, error } = await supabase.from('component_rules').select('*');
    if (error) {
      console.error('Error fetching component rules:', error);
      setRules([]);
    } else {
      setRules(data || []);
    }
    setLoading(false);
  }, [rules.length]);

  useEffect(() => {
    fetchRules();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchRules();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchRules]);

  useEffect(() => {
    if (!user || !sessionReady) {
      return undefined;
    }

    const channel = supabase
      .channel('public:component_rules')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'component_rules' }, fetchRules)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRules, sessionReady, user]);

  useSessionRefresh(() => {
    fetchRules();
  }, [fetchRules]);

  const getComponentState = useCallback((componentKey) => {
    if (authLoading || loading || !authReady || !sessionReady) {
      // Do not hide global navigation while contexts are loading to avoid header disappearance.
      // Prefer a conservative visible/disabled fallback for nav elements.
      if (componentKey && typeof componentKey === 'string' && componentKey.startsWith('nav:')) {
        // Keep the account trigger present but inert while auth is settling.
        if (componentKey === 'nav:dashboard') {
          return 'disabled';
        }
        // Avoid flashing login/register while auth isn't settled
        if (componentKey === 'nav:login' || componentKey === 'nav:register') {
          return 'visible';
        }
        return 'visible';
      }
      return 'hidden'; // For non-nav components, keep previous behavior
    }

    const rule = rules.find(r => r.component_key === componentKey);
    if (!rule) {
      console.warn(`No component rule found for key: ${componentKey}`);
      return 'visible'; // Default to visible if no rule is found
    }

    // When a session exists but the profile isn't loaded yet, fallback to 'guest'
    // to avoid resolving an undefined state that would hide components.
    const userType = user?.profile?.user_type ?? (user ? 'guest' : 'anonymous');
    const state = rule[`${userType}_state`];
    
    return state || 'hidden';

  }, [user, rules, authLoading, loading, authReady, sessionReady]);

  const value = {
    loading,
    getComponentState,
    refreshRules: fetchRules,
  };

  return (
    <ComponentStateContext.Provider value={value}>
      {children}
    </ComponentStateContext.Provider>
  );
};
