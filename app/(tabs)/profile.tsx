import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, useColorScheme, Modal } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, logout, token } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
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

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <Image
          source={{ 
            uri: user?.imageUri || 'https://i.pravatar.cc/150',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          }}
          style={styles.avatar}
        />
        <Text style={[styles.username, { color: textColor }]}>
          {user?.username || 'Usuario'}
        </Text>
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
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    backgroundColor: '#ccc',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
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