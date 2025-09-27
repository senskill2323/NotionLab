import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

const LayoutPreferencesContext = createContext(null);

export const LayoutPreferencesProvider = ({ children }) => {
  const [footerVisible, setFooterVisible] = useState(true);

  const updateFooter = useCallback((visible) => {
    setFooterVisible(Boolean(visible));
  }, []);

  const resetLayout = useCallback(() => {
    setFooterVisible(true);
  }, []);

  const value = useMemo(() => ({
    footerVisible,
    setFooterVisible: updateFooter,
    resetLayout,
  }), [footerVisible, updateFooter, resetLayout]);

  return (
    <LayoutPreferencesContext.Provider value={value}>
      {children}
    </LayoutPreferencesContext.Provider>
  );
};

export const useLayoutPreferences = () => {
  const context = useContext(LayoutPreferencesContext);
  if (!context) {
    throw new Error('useLayoutPreferences must be used within a LayoutPreferencesProvider');
  }
  return context;
};
