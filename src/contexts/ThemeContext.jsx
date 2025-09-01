import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
    import { supabase } from '@/lib/customSupabaseClient';

    const ThemeContext = createContext();

    export const useTheme = () => {
      const context = useContext(ThemeContext);
      if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
      }
      return context;
    };

    const applyThemeToDOM = (themeTokens) => {
      if (!themeTokens) return;
      const root = window.document.documentElement;

      const existingStyle = document.getElementById('dynamic-theme-style');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      let cssVars = '';
      const flattenObject = (obj, prefix = '') => {
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          const newPrefix = prefix ? `${prefix}-${key}` : key;
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            flattenObject(value, newPrefix);
          } else if (typeof value === 'string' || typeof value === 'number') {
            const HSLValue = value.startsWith('hsl') ? value.match(/hsl\(([^)]+)\)/)[1].trim() : value;
            cssVars += `--${newPrefix}: ${HSLValue};`;
          }
        });
      };

      if (themeTokens.colors) {
          flattenObject(themeTokens.colors, 'colors');
      } else {
        flattenObject({
          background: '222.2 84% 4.9%',
          foreground: '210 40% 98%',
        }, 'colors');
      }

      if (themeTokens.radius) {
          cssVars += `--radius: ${themeTokens.radius};`;
      }

      const styleElement = document.createElement('style');
      styleElement.id = 'dynamic-theme-style';
      styleElement.innerHTML = `:root { ${cssVars} }`;
      document.head.appendChild(styleElement);
      root.classList.add('dark');
    };

    export const ThemeProvider = ({ children }) => {
      const [theme, setTheme] = useState(null);
      const [loading, setLoading] = useState(true);

      const fetchAndApplyTheme = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_active_theme_tokens');
        
        let finalTheme;
        if (error) {
          console.error('Error fetching theme, using fallback:', error);
          finalTheme = {
            colors: {
              background: "hsl(222.2 84% 4.9%)",
              foreground: "hsl(210 40% 98%)",
              primary: "hsl(346.8 77.2% 49.8%)",
              card: "hsl(222.2 84% 4.9%)",
              'card-foreground': "hsl(210 40% 98%)",
              popover: "hsl(222.2 84% 4.9%)",
              'popover-foreground': "hsl(210 40% 98%)",
              secondary: "hsl(217.2 32.6% 17.5%)",
              'secondary-foreground': "hsl(210 40% 98%)",
              muted: "hsl(217.2 32.6% 17.5%)",
              'muted-foreground': "hsl(215 20.2% 65.1%)",
              accent: "hsl(217.2 32.6% 17.5%)",
              'accent-foreground': "hsl(210 40% 98%)",
              destructive: "hsl(0 62.8% 30.6%)",
              'destructive-foreground': "hsl(210 40% 98%)",
              border: "hsl(217.2 32.6% 17.5%)",
              input: "hsl(217.2 32.6% 17.5%)",
              ring: "hsl(346.8 77.2% 49.8%)",
            },
            radius: "0.5rem",
          };
        } else {
          finalTheme = data;
        }
        
        setTheme(finalTheme);
        applyThemeToDOM(finalTheme);
        setLoading(false);
      }, []);

      useEffect(() => {
        fetchAndApplyTheme();
      }, [fetchAndApplyTheme]);
      
      const value = {
        theme,
        loading,
        refreshTheme: fetchAndApplyTheme,
        applyTheme: applyThemeToDOM,
      };

      return (
        <ThemeContext.Provider value={value}>
          {children}
        </ThemeContext.Provider>
      );
    };