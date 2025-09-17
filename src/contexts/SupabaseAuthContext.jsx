import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { queryClient } from '@/lib/reactQueryClient';
import { emitSessionRefresh } from '@/lib/sessionRefreshBus';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isTabSwitchRef = useRef(false);
  const signOutVerifyTimerRef = useRef(null);
  const lastVisibleCheckRef = useRef(0);
  const lastSessionExpiresAtRef = useRef(null);

  const processSessionRefresh = useCallback((session, sourceEvent) => {
    if (!session?.access_token) {
      lastSessionExpiresAtRef.current = null;
      return;
    }
    const expiresAt = session?.expires_at ?? null;
    if (expiresAt === null) {
      return;
    }
    const previous = lastSessionExpiresAtRef.current;
    const hasChanged = previous === null || Number(previous) !== Number(expiresAt);
    lastSessionExpiresAtRef.current = expiresAt;
    if (!hasChanged) {
      return;
    }
    queueMicrotask(() => {
      try {
        queryClient.invalidateQueries();
      } catch (err) {
        console.error('Failed to invalidate query cache after session refresh', err);
      }
      emitSessionRefresh({ expiresAt, sourceEvent });
    });
  }, []);
  const handleSignOutForced = useCallback(async (showToast = true) => {
    // VÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©rifier si c'est vraiment une session invalide
    const { data: { session } } = await supabase.auth.getSession();
    // If a valid session exists, never force sign-out. Tab switch flag only suppresses UX (toast/nav).
    if (session?.access_token) {
      console.log('Session still valid, not forcing sign out');
      return;
    }
    
    console.warn("Forcing sign out due to session error.");
    lastSessionExpiresAtRef.current = null;
    await supabase.auth.signOut();
    setUser(null);
    if (showToast && !isTabSwitchRef.current) {
      toast({
        title: "Session expirÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©e",
        description: "Votre session est invalide. Veuillez vous reconnecter.",
        variant: "destructive",
      });
    }
    if (!isTabSwitchRef.current && window.location.pathname !== '/connexion') {
      navigate('/connexion', { replace: true });
    }
  }, [toast, navigate]);

  const fetchProfileAndSetUser = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setUser(null);
      return null;
    }
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, user_types(type_name, display_name)')
        .eq('id', sessionUser.id)
        .single()
        .throwOnError();
      
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
      console.error("Error in fetchProfileAndSetUser", e?.message || e);
      // Network/visibility-related glitches should not force sign-out.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Keep current user; allow background retries via other effects.
          return null;
        }
      } catch (_) {
        // ignore
      }
      await handleSignOutForced(false);
      return null;
    }
  }, [handleSignOutForced]);

  // Tab visibility handling: mark hidden to suppress UX, and rehydrate on visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        isTabSwitchRef.current = true;
        setTimeout(() => {
          isTabSwitchRef.current = false;
        }, 5000);
      } else if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - (lastVisibleCheckRef.current || 0) < 1500) return;
        lastVisibleCheckRef.current = now;
        // Re-check session and refresh profile if needed after tab becomes visible
        queueMicrotask(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              // If we lost user due to a transient glitch, rehydrate quickly
              if (!user) {
                await fetchProfileAndSetUser(session.user);
              }
            }
          } catch (_) {
            // ignore
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, fetchProfileAndSetUser]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || (session && !session.access_token)) {
          console.warn('Invalid session or refresh token on initial load, forcing sign out.');
          if (error) console.error("Error getting session:", error.message);
          await handleSignOutForced(false); 
        } else if (session) {
          setTimeout(async () => {
            processSessionRefresh(session, 'INITIAL_SESSION');
            await fetchProfileAndSetUser(session.user);
          });
        }
      } catch (e) {
        console.error('Error during initial session check:', e);
        // Fail-safe: do not block UI indefinitely
      } finally {
        if (isMounted) {
          setLoading(false);
          setAuthReady(true);
        }
      }
    };
    checkInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        // console.debug('[Auth] onAuthStateChange', _event, { hasUser: !!session?.user });
        if (_event === 'SIGNED_OUT') {
            lastSessionExpiresAtRef.current = null;
          // Debounce handling to avoid transient sign-outs during Edge tab resume.
          if (signOutVerifyTimerRef.current) clearTimeout(signOutVerifyTimerRef.current);
          signOutVerifyTimerRef.current = setTimeout(async () => {
            try {
              const { data: { session: rechecked } } = await supabase.auth.getSession();
              if (!rechecked) {
                setUser(null);
                if (!isTabSwitchRef.current && window.location.pathname !== '/connexion') {
                  navigate('/connexion', { replace: true });
                }
              }
            } finally {
              signOutVerifyTimerRef.current = null;
            }
          }, isTabSwitchRef.current ? 1200 : 400);
          return;
        }

        if (_event === 'INITIAL_SESSION' || _event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED') {
          if (session?.user) {
            setTimeout(async () => {
              processSessionRefresh(session, _event);
              await fetchProfileAndSetUser(session.user);
            });
          } else {
            // Keep previous user if any until verification determines a real sign-out.
            lastSessionExpiresAtRef.current = null;
            setUser(null);
          }
          setAuthReady(true);
        }
      } catch (err) {
        console.error('Error in onAuthStateChange handler:', err);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
      if (signOutVerifyTimerRef.current) {
        clearTimeout(signOutVerifyTimerRef.current);
        signOutVerifyTimerRef.current = null;
      }
    };
  }, [fetchProfileAndSetUser, handleSignOutForced, processSessionRefresh, navigate]);

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
    try {
      const normalizedEmail = String(email || '').trim();
      // 1) Check availability via RPC to avoid obfuscated responses and ensure UX
      const { data: available, error: rpcError } = await supabase.rpc('check_email_available', { p_email: normalizedEmail });
      if (rpcError) {
        console.error('RPC check_email_available error:', rpcError);
        setAuthLoading(false);
        const err = new Error("Impossible de vérifier la disponibilité de l'e-mail. Veuillez réessayer.");
        err.code = 'email_check_failed';
        return { data: null, error: err };
      }

      if (!available) {
        // Email already used
        const err = new Error('Votre e-mail est déjà utilisé');
        err.code = 'email_already_used';
        setAuthLoading(false);
        return { data: null, error: err };
      }

      // 2) Proceed with actual sign-up
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      // Fallback mapping if Supabase returns a duplicate email error despite pre-check
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (
          msg.includes('already registered') ||
          (msg.includes('email') && msg.includes('already')) ||
          msg.includes('already exists') ||
          msg.includes('user already')
        ) {
          const err = new Error('Votre e-mail est déjà utilisé');
          err.code = 'email_already_used';
          setAuthLoading(false);
          return { data: null, error: err };
        }
      }
      setAuthLoading(false);
      return { data, error };
    } catch (e) {
      console.error('Unexpected error during signUp:', e);
      setAuthLoading(false);
      const err = new Error("Une erreur est survenue pendant l'inscription. Veuillez réessayer.");
      err.code = 'signup_failed';
      return { data: null, error: err };
    }
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
    throw new Error('useAuth doit ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âªtre utilisÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  l\'intÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©rieur d\'un AuthProvider');
  }
  return context;
};
