import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Platform } from 'react-native';
import { User, UserRole } from '../types';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, role: UserRole, token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
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

  const login = async (email: string, role: UserRole, newToken: string, refreshToken: string) => {
    const newUser: User = {
      id: 'u' + Date.now(),
      username: email.split('@')[0],
      email,
      role,
      companyName: 'MHL Homes',
      imageUri: 'https://i.pravatar.cc/150?u=' + email,
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

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
};