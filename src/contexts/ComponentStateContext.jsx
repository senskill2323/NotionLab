import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const ComponentStateContext = createContext();

export const useComponentState = () => useContext(ComponentStateContext);

export const ComponentStateProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
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

    const channel = supabase
      .channel('public:component_rules')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'component_rules' }, () => {
        fetchRules();
      })
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [fetchRules]);

  const getComponentState = useCallback((componentKey) => {
    if (authLoading || loading) {
      return 'hidden'; // Default to hidden while loading to prevent flicker
    }

    const rule = rules.find(r => r.component_key === componentKey);
    if (!rule) {
      console.warn(`No component rule found for key: ${componentKey}`);
      return 'visible'; // Default to visible if no rule is found
    }

    const userType = user ? user.profile?.user_type : 'anonymous';
    const state = rule[`${userType}_state`];
    
    return state || 'hidden';

  }, [user, rules, authLoading, loading]);

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