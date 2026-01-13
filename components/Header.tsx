import { Feather } from '@expo/vector-icons';
import { useDrawerStatus } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import i18n from '../constants/i18n';
import { useTenant } from '../contexts/TenantContext';
import api from '../services/api';

interface HeaderProps {
  userImageUri?: string; // URI para la imagen del usuario, opcional
  token?: string | null; // Token para imágenes protegidas
  onMenuPress?: () => void; // Función para abrir/cerrar el menú, ahora opcional
  onAddPress?: () => void; // Función para el botón de agregar
  onProfilePress?: () => void; // Función al presionar el avatar
}

const Header: React.FC<HeaderProps> = ({ userImageUri, token, onMenuPress, onAddPress, onProfilePress }) => {
  const { tenant } = useTenant();
  const router = useRouter();
  // Hook para saber si el menú está abierto. Devuelve 'open' o 'closed'.
  const isDrawerOpen = useDrawerStatus() === 'open';

  // Construir fuente de imagen con headers si es necesario
  const getImageSource = () => {
    if (!userImageUri) return require('../assets/images/user.png');

    // Si es una URL completa o local, usarla tal cual
    if (userImageUri.startsWith('http') || userImageUri.startsWith('file') || userImageUri.startsWith('content') || userImageUri.startsWith('blob')) {
      return { 
        uri: userImageUri, 
        headers: (userImageUri.startsWith('http') && token) ? { Authorization: `Bearer ${token}` } : undefined 
      };
    }

    // Construir URL para ID de archivo o ruta relativa
    const defaultBaseURL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8080' : 'http://192.168.100.59:8080');
    const baseURL = api.defaults.baseURL || defaultBaseURL;
    
    const finalUri = userImageUri.includes('/') 
      ? `${baseURL}${userImageUri.startsWith('/') ? '' : '/'}${userImageUri}` 
      : `${baseURL}/api/files/${userImageUri}`;

    return { uri: finalUri, headers: token ? { Authorization: `Bearer ${token}` } : undefined };
  };

  return (
    <View style={[styles.container, { backgroundColor: tenant.secondaryColor || '#1A202C' }]}>
      <View style={styles.leftContainer}>
        {/* --- Lado Izquierdo: Botón de Menú --- */}
        {onMenuPress ? (
          <Pressable onPress={onMenuPress} style={styles.menuButton}>
            <Feather name="menu" size={24} color={tenant.primaryColor} />
          </Pressable>
        ) : <View style={styles.menuButton} />}
      </View>

      {/* --- Centro: Logo del Tenant --- */}
      <View style={styles.logoContainer}>
        {tenant.logoUri ? (
          <Image source={{ uri: tenant.logoUri }} style={styles.headerLogo} resizeMode="contain" />
        ) : (
          // Fallback: Nombre del tenant si no hay logo
          <Text style={[styles.headerTitle, { color: tenant.primaryColor }]}>{tenant.name}</Text>
        )}
      </View>
      
      {/* --- Lado Derecho: Acciones --- */}
      <View style={styles.rightContainer}>
        {/* Botón de Agregar (Visible si se pasa la función onAddPress) */}
        {onAddPress && (
          <Pressable
              onPress={onAddPress}
              style={({ pressed }) => [styles.newProjectButton, { backgroundColor: tenant.primaryColor }, pressed && styles.buttonPressed]}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
              {/* Solo mostramos el texto si el menú NO está abierto en web, para ahorrar espacio */}
              {(Platform.OS === 'web' && isDrawerOpen) && <Text style={styles.newProjectButtonText}>{i18n.t('nav.newProject')}</Text>}
          </Pressable>
        )}

        {/* Avatar del Usuario */}
        <Pressable onPress={onProfilePress}>
          <Image
            source={getImageSource()}
            style={styles.userAvatar}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#1A202C',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    // Sombra para darle elevación
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuButton: {
    padding: 8,
    marginTop: Platform.OS === 'web' ? 0 : 20,
  },
  leftContainer: {
    minWidth: 40, // Asegura espacio para equilibrar el layout
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newProjectButton: {
    backgroundColor: '#D4AF37', // Dorado
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 16,
    marginTop: Platform.OS === 'web' ? 0 : 20,
  },
  buttonPressed: {
    backgroundColor: '#b89b30', // Dorado más oscuro al presionar
  },
  newProjectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    marginTop: Platform.OS === 'web' ? 0 : 20,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20, // Hace la imagen redonda
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginTop: Platform.OS === 'web' ? 0 : 20,
  },
  // Estilos nuevos para el logo central
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Platform.OS === 'web' ? 0 : 20,
  },
  headerLogo: {
    width: 140,
    height: 35,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Header;

/* 
NOTA: 
1. He añadido una imagen de placeholder local. Asegúrate de tener un archivo en:
   d:\Codigo Fuente\mhl-homes\mhl-homes\assets\images\user-placeholder.png
   O reemplázalo con una imagen real.

2. El botón "New Project" solo se mostrará en la web para optimizar el espacio en móviles.
   Puedes ajustar esta lógica si lo necesitas.

3. Para usar este componente, impórtalo en tu archivo de layout principal (ej. _layout.tsx)
   y pásale las funciones `onMenuPress` y `onNewProjectPress`.
*/