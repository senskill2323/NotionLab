import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isTabSwitchEvent, setIsTabSwitchEvent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOutForced = useCallback(async (showToast = true) => {
    // Vérifier si c'est vraiment une session invalide
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token && !isTabSwitchEvent) {
      console.log('Session still valid, not forcing sign out');
      return;
    }
    
    console.warn("Forcing sign out due to session error.");
    await supabase.auth.signOut();
    setUser(null);
    if (showToast) {
      toast({
        title: "Session expirée",
        description: "Votre session est invalide. Veuillez vous reconnecter.",
        variant: "destructive",
      });
    }
    if (!isTabSwitchEvent && window.location.pathname !== '/connexion') {
      navigate('/connexion', { replace: true });
    }
  }, [toast, navigate, isTabSwitchEvent]);

  const fetchProfileAndSetUser = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      return null;
    }
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, user_types(type_name, display_name)')
        .eq('id', sessionUser.id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('Profile not found for user, signing out.', error.message);
          await handleSignOutForced(false);
          return null;
        }
        throw error;
      }
      
      const fullUser = { 
        ...sessionUser, 
        profile: {
          ...profile,
          user_type: profile.user_types.type_name,
          user_type_display_name: profile.user_types.display_name
        }
      };
      setUser(fullUser);
      return fullUser;

    } catch (e) {
      console.error("Critical error in fetchProfileAndSetUser, signing out.", e?.message);
      await handleSignOutForced(false);
      return null;
    }
  }, [handleSignOutForced]);

  // Tab switch detection to prevent auth navigation during focus changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsTabSwitchEvent(true);
        setTimeout(() => setIsTabSwitchEvent(false), 5000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    setLoading(true);
    const checkInitialSession = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || (session && !session.access_token)) {
            console.warn('Invalid session or refresh token on initial load, forcing sign out.');
            if (error) console.error("Error getting session:", error.message);
            await handleSignOutForced(false); 
        } else if (session) {
            await fetchProfileAndSetUser(session.user);
        }
        setLoading(false);
        setAuthReady(true);
    };
    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_event === 'SIGNED_OUT') {
        setUser(null);
        if (!isTabSwitchEvent) {
          navigate('/connexion', { replace: true });
        }
      } else if (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') {
        if (session?.user) {
          await fetchProfileAndSetUser(session.user);
        } else {
          setUser(null);
        }
        setAuthReady(true);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchProfileAndSetUser, handleSignOutForced, navigate, isTabSwitchEvent]);
  
  const signInWithPassword = async (email, password) => {
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setAuthLoading(false);
      return { user: null, profile: null, error };
    }

    if (data.user) {
      const fullUser = await fetchProfileAndSetUser(data.user);
      setAuthLoading(false);
      return { user: data.user, profile: fullUser?.profile, error: null };
    }
    
    setAuthLoading(false);
    return { user: null, profile: null, error: new Error('User data not available after sign in.') };
  };

  const signUp = async (email, password, firstName, lastName) => {
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    setAuthLoading(false);
    return { data, error };
  };

  const signOut = async () => {
    setAuthLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setAuthLoading(false);
    navigate('/connexion', { replace: true });
  };

  const refreshUser = useCallback(async () => {
    const { data: { user: sessionUser } } = await supabase.auth.getUser();
    if (!sessionUser) {
      setUser(null);
      return null;
    }
    return await fetchProfileAndSetUser(sessionUser);
  }, [fetchProfileAndSetUser]);

  const value = {
    user,
    loading,
    authLoading,
    authReady,
    signInWithPassword,
    signUp,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};