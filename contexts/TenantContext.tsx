import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import api from '../services/api';

// Definición de la configuración del Tenant
export interface TenantConfig {
  id: string;
  name: string;
  logoUri?: string;
  primaryColor: string;
  secondaryColor?: string;
  loginTitle?: string;
}

// Configuración por defecto (Tu marca original)
const defaultTenant: TenantConfig = {
  id: 'mhl_homes',
  name: 'MHL Homes',
  primaryColor: '#D4AF37', // Dorado original
  loginTitle: 'Welcome'
};

interface TenantContextType {
  tenant: TenantConfig;
  isLoading: boolean;
  setTenantId: (id: string) => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant: defaultTenant,
  isLoading: false,
  setTenantId: async () => {},
});

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantConfig>(defaultTenant);
  const [isLoading, setIsLoading] = useState(true);

  // Sincronizar el ID del tenant con los headers de Axios automáticamente
  useEffect(() => {
    if (tenant?.id) {
      api.defaults.headers.common['X-Tenant-ID'] = tenant.id;
    }
  }, [tenant]);

  // Helper para resolver la URL completa del logo
  const resolveLogoUri = (uri?: string) => {
    if (!uri) return undefined;
    if (uri.startsWith('http') || uri.startsWith('data:') || uri.startsWith('file:')) return uri;
    // Si es un ID relativo, construir la URL completa
    const baseURL = api.defaults.baseURL || process.env.EXPO_PUBLIC_API_URL || '';
    return `${baseURL}/api/files/${uri}`;
  };

  const loadTenantConfig = useCallback(async (manualId?: string) => {
    setIsLoading(true);
    try {
      let identifier = manualId;

      // Si no se especificó ID manual, intentamos detectarlo
      if (!identifier) {
        // 1. Detección por Subdominio (Prioridad en Web Producción)
        if (Platform.OS === 'web') {
          const hostname = window.location.hostname;
          const parts = hostname.split('.');
          
          if (parts.length > 2 && parts[0] !== 'www') {
            identifier = parts[0];
          }

          // Detección de entorno local: Forzar tenant base
          if (!identifier && (hostname === 'localhost' || hostname.startsWith('192.168.') || hostname === '127.0.0.1')) {
            identifier = 'mhl_homes'; // Cambia esto por el ID real de tu configuración base
          }
        }

        // 2. Si no hay subdominio, buscamos en almacenamiento local (Persistencia)
        if (!identifier) {
          const storedId = await AsyncStorage.getItem('tenant_id');
          if (storedId) identifier = storedId;
        }
      }

      // Default si no se encontró nada
      if (!identifier) identifier = 'default';

      // Configurar header temporalmente para esta petición
      api.defaults.headers.common['X-Tenant-ID'] = identifier;

      // Intentar cargar configuración dinámica desde el backend (FRONT_CONFIG)
      let configLoaded = false;
      try {
        const response = await api.get('/api/public/config');
        const dynamicConfig = response.data;

        if (dynamicConfig) {
          setTenant({
            id: identifier,
            name: dynamicConfig.name,
            primaryColor: dynamicConfig.metadata?.primaryColor || dynamicConfig.primaryColor || defaultTenant.primaryColor,
            secondaryColor: dynamicConfig.metadata?.secondaryColor || dynamicConfig.secondaryColor,
            logoUri: resolveLogoUri(dynamicConfig.metadata?.logoUri || dynamicConfig.logoUri),
            loginTitle: dynamicConfig.metadata?.loginTitle || dynamicConfig.loginTitle || defaultTenant.loginTitle
          });
          configLoaded = true;
        }
      } catch (error: any) {
        console.log('No dynamic config found or API error, using defaults.');
        
        // Si el tenant no existe (404) y no es el modo demo local, revertimos al default
        if (error.response?.status === 404 && identifier !== 'demo') {
          identifier = defaultTenant.id;
          await AsyncStorage.removeItem('tenant_id');
        }
      }

      // Si no se cargó configuración dinámica, usar defaults o hardcoded
      if (!configLoaded) {
        if (identifier === 'demo') {
          setTenant({
            id: 'demo',
            name: 'Demo Constructora',
            primaryColor: '#3182CE',
            logoUri: 'https://via.placeholder.com/300x150.png?text=Demo+Logo',
            loginTitle: 'Portal de Contratistas'
          });
        } else {
          setTenant({ ...defaultTenant, id: identifier });
        }
      }

      // Guardar en persistencia para futuras recargas (si no es default)
      if (identifier !== 'default') {
        await AsyncStorage.setItem('tenant_id', identifier);
      }

    } catch (error) {
      console.error('Error loading tenant config:', error);
      setTenant(defaultTenant);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    loadTenantConfig();
  }, [loadTenantConfig]);

  // Función expuesta para cambiar el tenant manualmente (ej. desde UI de login o admin)
  const setTenantId = async (id: string) => {
    await loadTenantConfig(id);
  };

  return (
    <TenantContext.Provider value={{ tenant, isLoading, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);