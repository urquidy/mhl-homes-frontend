import * as SecureStore from 'expo-secure-store';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import api from '../services/api';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: { id: string; username: string; email: string; role: UserRole; imageUri?: string; permissions?: string[]; companyName?: string }, token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserImage: (uri: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar sesión persistente al iniciar
  useEffect(() => {
    const loadSession = async () => {
      try {
        let storedToken, storedUser;
        if (Platform.OS === 'web') {
          storedToken = localStorage.getItem('token');
          storedUser = localStorage.getItem('user');
        } else {
          storedToken = await SecureStore.getItemAsync('token');
          storedUser = await SecureStore.getItemAsync('user');
        }
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = async (userData: { id: string; username: string; email: string; role: UserRole; imageUri?: string; permissions?: string[]; companyName?: string }, newToken: string, refreshToken: string) => {
    const newUser: User = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      permissions: userData.permissions || [],
      companyName: userData.companyName || 'MHL Homes',
      imageUri: userData.imageUri || 'https://i.pravatar.cc/150?u=' + userData.email,
    };

    setToken(newToken);
    setUser(newUser);
    
    if (Platform.OS === 'web') {
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      await SecureStore.setItemAsync('token', newToken);
      await SecureStore.setItemAsync('refreshToken', refreshToken);
      await SecureStore.setItemAsync('user', JSON.stringify(newUser));
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    if (Platform.OS === 'web') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } else {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('refreshToken');
      await SecureStore.deleteItemAsync('user');
    }
  };

  const updateUserImage = async (uri: string) => {
    if (user) {
      const newUser = { ...user, imageUri: uri };
      setUser(newUser);
      if (Platform.OS === 'web') {
        localStorage.setItem('user', JSON.stringify(newUser));
      } else {
        await SecureStore.setItemAsync('user', JSON.stringify(newUser));
      }
    }
  };

  const refreshUser = async () => {
    if (!user || !token) return;

    try {
      // Asumimos que el backend puede devolver los datos completos del usuario,
      // incluyendo la lista de permisos actualizada.
      const response = await api.get(`/api/auth/me`);
      const freshUserData = response.data;
      
      const refreshedUser: User = {
        id: freshUserData.id,
        username: freshUserData.username,
        email: freshUserData.email,
        role: freshUserData.role,
        permissions: freshUserData.permissions || [],
        companyName: freshUserData.companyName || user.companyName,
        imageUri: freshUserData.imageUri || user.imageUri,
      };
      
      setUser(refreshedUser);

      if (Platform.OS === 'web') {
        localStorage.setItem('user', JSON.stringify(refreshedUser));
      } else {
        await SecureStore.setItemAsync('user', JSON.stringify(refreshedUser));
      }
    } catch (error: any) {
      console.error('Error refreshing user session:', error);
      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUserImage, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
};