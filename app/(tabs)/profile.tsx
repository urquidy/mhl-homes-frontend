import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, useColorScheme, Modal, ActivityIndicator, Alert, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '@/constants/theme';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';

export default function ProfileScreen() {
  const { user, logout, token, updateUserImage } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  
  // Definimos colores locales si el tema no carga correctamente, o usamos los del tema
  const textColor = Colors[colorScheme]?.text || '#000';
  const subTextColor = Colors[colorScheme]?.icon || '#666';
  const bgColor = Colors[colorScheme]?.background || '#fff';

  const handleLogout = () => {
    setModalVisible(true);
  };

  const confirmLogout = async () => {
    setModalVisible(false);
    await logout();
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user?.id) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
      } else {
        formData.append('file', { uri, name: filename, type } as any);
      }

      const response = await api.post(`/api/users/${user.id}/profile-image`, formData, {
        headers: { 'Content-Type': Platform.OS === 'web' ? undefined : 'multipart/form-data' },
      });

      const newUri = response.data?.imageUri || uri;
      await updateUserImage(newUri);
      Alert.alert('Éxito', 'Foto de perfil actualizada.');
    } catch (error) {
      console.error('Error uploading profile image:', error);
      Alert.alert('Error', 'No se pudo actualizar la foto de perfil.');
    } finally {
      setIsUploading(false);
    }
  };

  const getProfileImageSource = () => {
    const uri = user?.imageUri;
    if (!uri) return { uri: 'https://i.pravatar.cc/150' };

    // Si es una URL completa o local, usarla tal cual
    if (uri.startsWith('http') || uri.startsWith('file') || uri.startsWith('content') || uri.startsWith('blob')) {
      return { 
        uri, 
        headers: (uri.startsWith('http') && token) ? { Authorization: `Bearer ${token}` } : undefined 
      };
    }

    // Construir URL para ID de archivo o ruta relativa
    const defaultBaseURL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8080' : 'http://192.168.100.59:8080');
    const baseURL = api.defaults.baseURL || defaultBaseURL;
    
    const finalUri = uri.includes('/') 
      ? `${baseURL}${uri.startsWith('/') ? '' : '/'}${uri}` 
      : `${baseURL}/api/files/${uri}`;

    return { uri: finalUri, headers: token ? { Authorization: `Bearer ${token}` } : undefined };
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <Pressable onPress={handlePickImage} style={styles.avatarContainer}>
          <Image
            source={getProfileImageSource()}
            style={styles.avatar}
          />
          <View style={styles.editIconBadge}>
            {isUploading ? <ActivityIndicator size="small" color="#FFF" /> : <FontAwesome5 name="camera" size={16} color="#FFF" />}
          </View>
        </Pressable>
        <View style={styles.nameContainer}>
          <Text style={[styles.username, { color: textColor, marginBottom: 0 }]}>
            {user?.username || 'Usuario'}
          </Text>
          {(user?.role as string) === 'ADMIN' && (
            <FontAwesome5 name="crown" size={18} color="#D4AF37" style={{ marginLeft: 8 }} />
          )}
        </View>
        <Text style={[styles.email, { color: subTextColor }]}>
          {user?.email || 'email@example.com'}
        </Text>
        
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || 'Viewer'}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            { opacity: pressed ? 0.8 : 1 }
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </Pressable>
      </View>

      {/* Modal de Confirmación Personalizado */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Cerrar Sesión</Text>
            <Text style={[styles.modalMessage, { color: subTextColor }]}>¿Estás seguro que deseas salir?</Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.confirmButton]} onPress={confirmLogout}>
                <Text style={styles.confirmButtonText}>Cerrar Sesión</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ccc',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3182CE',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    marginBottom: 16,
  },
  roleBadge: {
    backgroundColor: '#D4AF37', // Dorado corporativo
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actions: {
    marginTop: 'auto', // Empuja el botón hacia abajo
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#FF3B30', // Rojo estándar de iOS para acciones destructivas
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#EDF2F7',
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButtonText: {
    color: '#4A5568',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});