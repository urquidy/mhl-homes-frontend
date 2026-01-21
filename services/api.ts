import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform, Alert } from 'react-native';
import { router } from 'expo-router';

// URL base dinámica
let API_URL: string | undefined;

// En producción, SIEMPRE usamos la variable de entorno.
if (!__DEV__) {
  API_URL = process.env.EXPO_PUBLIC_API_URL;
} else {
  // En desarrollo, permitimos un fallback para conveniencia.
  API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8080' : 'http://192.168.100.59:8080');
}

// Para depuración: Muestra la URL de la API que se está utilizando.
console.log('Connecting to API:', API_URL);

// Si después de la lógica anterior, la URL no está definida en producción, lanzamos un error.
if (!API_URL && !__DEV__) {
  // En lugar de un error que crashea, mostramos una alerta al usuario.
  Alert.alert(
    "Error de Configuración",
    "La dirección del servidor no está configurada. Contacte a soporte."
  );
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper para manejar almacenamiento multiplataforma (Web vs Native)
// Esto asegura compatibilidad con lo que usa AuthContext
const getStorageItem = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
};

const setStorageItem = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const removeStorageItem = async (key: string) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

// --- Sistema de Alertas Globales ---
type AlertCallback = (title: string, message: string) => void;
let globalAlertCallback: AlertCallback | null = null;

export const registerGlobalAlert = (callback: AlertCallback) => {
  globalAlertCallback = callback;
  // Retornar función de limpieza
  return () => { globalAlertCallback = null; };
};

// Interceptor de Solicitud: Agrega el Token automáticamente
api.interceptors.request.use(
  async (config) => {
    // Usamos 'token' para coincidir con AuthContext
    const token = await getStorageItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de Respuesta: Maneja el error 401 y el Refresh Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Manejo global de errores de red (API inalcanzable)
    // Verificamos que no tenga respuesta (network error) y que no sea una cancelación manual
    if (!error.response && error.code !== 'ERR_CANCELED') {
      const message = 'No se pudo conectar con el servidor. Verifique su conexión a internet o la configuración de red.';
      
      if (globalAlertCallback) {
        globalAlertCallback('Error de Conexión', message);
      } else {
        // Fallback por si el componente no está montado
        Platform.OS === 'web' ? window.alert(message) : Alert.alert('Error de Conexión', message);
      }
    }

    // Si el error es 401 (No autorizado) y no hemos reintentado aún
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await getStorageItem('refreshToken');
        
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        // Consumir la API de refresh-token
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken: refreshToken,
        });

        const { token: newToken, refreshToken: newRefreshToken } = response.data;

        if (newToken) {
            await setStorageItem('token', newToken);
            if (newRefreshToken) {
              await setStorageItem('refreshToken', newRefreshToken);
            }
            
            // Actualizar el header de la petición original y reintentarla
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
        }
      } catch (refreshError) {
        // Si el refresh falla, cerramos sesión
        await removeStorageItem('token');
        await removeStorageItem('refreshToken');
        await removeStorageItem('user');
        router.replace('/(auth)');
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;