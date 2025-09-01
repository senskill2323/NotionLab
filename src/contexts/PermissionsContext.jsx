import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(null);

  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setUserType(null);
    try {
      if (!user || !user.profile || !user.profile.user_type) {
        const { data, error } = await supabase.from('role_permissions').select('permission').eq('guest', true);
        if (error) throw error;
        setPermissions(data.map(p => p.permission));
        setUserType('guest');
      } else {
        const currentUserType = user.profile.user_type;
        setUserType(currentUserType);
        
        let query = supabase.from('role_permissions').select('permission');
        
        // 'owner' gets all permissions, handled in hasPermission. 
        // For DB query, fetch admin perms to have a base set if needed, but the override is what matters.
        const typeToQuery = currentUserType === 'owner' ? 'admin' : currentUserType;
        
        query = query.eq(typeToQuery, true);
        
        const { data, error } = await query;

        if (error) {
            if (error.code === '42703') { 
                console.warn(`Permissions column for role '${typeToQuery}' not found. User may have limited permissions.`);
                setPermissions([]);
            } else {
                throw error;
            }
        } else {
            const userPermissions = new Set(data.map(p => p.permission));
            setPermissions(Array.from(userPermissions));
        }
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);
  
  const hasPermission = useCallback((requiredPermission) => {
    if (loading) return false;
    // The owner has all permissions, always. This is the ultimate override.
    if (userType === 'owner') return true;
    if (!requiredPermission) return true;
    return permissions.includes(requiredPermission);
  }, [permissions, loading, userType]);

  return (
    <PermissionsContext.Provider value={{ permissions, hasPermission, loading, refetchPermissions: fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
};