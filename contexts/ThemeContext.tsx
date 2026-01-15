import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';

// 1. Definición de la configuración del Tema
export interface ThemeConfig {
  primaryColor: string;
  secondaryColor?: string;
  menuColor?: string;
  backgroundColor?: string;
  logoUri?: string;
  loginTitle?: string;
}

// 2. Configuración por defecto
const defaultTheme: ThemeConfig = {
  primaryColor: '#3182CE', // Azul corporativo (mejor usabilidad)
  secondaryColor: '#1A202C',
  menuColor: '#FFFFFF',
  backgroundColor: '#F7FAFC',
  loginTitle: 'Welcome'
};

interface ThemeContextType {
  theme: ThemeConfig;
  isLoading: boolean;
  reloadTheme: () => Promise<void>;
}

// 3. Creación del contexto
const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  isLoading: true,
  reloadTheme: async () => {},
});

// 4. Provider del Tema
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [isLoading, setIsLoading] = useState(true);

  const resolveLogoUri = (uri?: string) => {
    if (!uri) return undefined;
    if (uri.startsWith('http') || uri.startsWith('data:') || uri.startsWith('file:')) return uri;
    const baseURL = api.defaults.baseURL || process.env.EXPO_PUBLIC_API_URL || '';
    return `${baseURL}/api/files/${uri}`;
  };

  // 5. Función para cargar la configuración
  const loadThemeConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      /*const response = await api.get('/api/catalogs/type/FRONT_CONFIG');
      const configs = response.data;
      
      // Usar la primera configuración encontrada, si existe
      if (configs && configs.length > 0) {
        const activeConfig = configs[0];
        setTheme({
          primaryColor: activeConfig.metadata?.primaryColor || defaultTheme.primaryColor,
          secondaryColor: activeConfig.metadata?.secondaryColor || defaultTheme.secondaryColor,
          menuColor: activeConfig.metadata?.menuColor || defaultTheme.menuColor,
          backgroundColor: activeConfig.metadata?.backgroundColor || defaultTheme.backgroundColor,
          logoUri: resolveLogoUri(activeConfig.metadata?.logoUri),
          loginTitle: activeConfig.metadata?.loginTitle || defaultTheme.loginTitle,
        });
      } else {
        setTheme(defaultTheme);
      }*/
    } catch (error) {
      console.error('Error loading theme config, using default theme:', error);
      setTheme(defaultTheme); // Usar el tema por defecto en caso de error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 6. Carga inicial
  useEffect(() => {
    loadThemeConfig();
  }, [loadThemeConfig]);

  // 7. Función para recargar
  const reloadTheme = async () => {
    await loadThemeConfig();
  };

  return (
    <ThemeContext.Provider value={{ theme, isLoading, reloadTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 8. Hook para consumir el contexto
export const useTheme = () => useContext(ThemeContext);
