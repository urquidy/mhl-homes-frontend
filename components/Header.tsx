import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDrawerStatus } from '@react-navigation/drawer';

interface HeaderProps {
  userImageUri?: string; // URI para la imagen del usuario, opcional
  token?: string | null; // Token para imágenes protegidas
  onMenuPress?: () => void; // Función para abrir/cerrar el menú, ahora opcional
  onAddPress?: () => void; // Función para el botón de agregar
  onProfilePress?: () => void; // Función al presionar el avatar
}

const Header: React.FC<HeaderProps> = ({ userImageUri, token, onMenuPress, onAddPress, onProfilePress }) => {
  const router = useRouter();
  // Hook para saber si el menú está abierto. Devuelve 'open' o 'closed'.
  const isDrawerOpen = useDrawerStatus() === 'open';

  // Construir fuente de imagen con headers si es necesario
  const imageSource = userImageUri
    ? { uri: userImageUri, headers: token ? { Authorization: `Bearer ${token}` } : undefined }
    : require('../assets/images/user.png');

  return (
    <View style={styles.container}>
      {/* --- Lado Izquierdo: Botón de Menú --- */}
      {onMenuPress ? (
        <Pressable onPress={onMenuPress} style={styles.menuButton}>
          <Feather name="menu" size={24} color="#D4AF37" />
        </Pressable>
      ) : <View style={styles.menuButton} /> /* Espaciador para mantener el layout */}

      {/* --- Lado Derecho: Acciones --- */}
      <View style={styles.rightContainer}>
        {/* Botón de Agregar (Visible si se pasa la función onAddPress) */}
        {onAddPress && (
          <Pressable
              onPress={onAddPress}
              style={({ pressed }) => [styles.newProjectButton, pressed && styles.buttonPressed]}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
              {/* Solo mostramos el texto si el menú NO está abierto en web, para ahorrar espacio */}
              {(Platform.OS === 'web' && isDrawerOpen) && <Text style={styles.newProjectButtonText}>New Project</Text>}
          </Pressable>
        )}

        {/* Avatar del Usuario */}
        <Pressable onPress={onProfilePress}>
          <Image
            source={imageSource}
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