import { Colors } from '@/constants/theme';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { useCustomAlert } from '../../components/ui/CustomAlert';
import LanguageSelector from '../../components/ui/LanguageSelector';
import i18n from '../../constants/i18n';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function ProfileScreen() {
  const { user, logout, token, updateUserImage } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const { showAlert, AlertComponent } = useCustomAlert();
  
  // Definimos colores locales si el tema no carga correctamente, o usamos los del tema
  const textColor = Colors[colorScheme]?.text || '#000';
  const subTextColor = Colors[colorScheme]?.icon || '#666';
  const bgColor = Colors[colorScheme]?.background || '#fff';

  useEffect(() => {
    const resolveRoleName = async () => {
      if (!user?.role) {
        setRoleName(user?.permissions?.includes('ROLE_ADMIN') ? 'Admin' : 'User');
        return;
      }

      try {
        const response = await api.get('/api/roles');
        const roles = response.data || [];
        const match = roles.find((r: any) => r.id === user.role);
        if (match) {
          setRoleName(match.name);
        } else {
          setRoleName(user.role);
        }
      } catch (error) {
        setRoleName(user.role);
      }
    };

    resolveRoleName();
  }, [user?.role, user?.permissions]);

  const handleLogout = () => {
    setModalVisible(true);
  };

  const confirmLogout = async () => {
    setModalVisible(false);
    try {
      await AsyncStorage.removeItem('menu_cache');
    } catch (error) {
      console.error('Error clearing menu cache:', error);
    }
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
      showAlert(i18n.t('common.success'), i18n.t('profile.photoUpdated'));
    } catch (error) {
      console.error('Error uploading profile image:', error);
      showAlert(i18n.t('common.error'), i18n.t('profile.photoUpdateError'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showAlert(i18n.t('common.error'), i18n.t('common.fillAllFields'));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showAlert(i18n.t('common.error'), i18n.t('profile.passwordsDoNotMatch'));
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post(`/api/users/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      showAlert(i18n.t('common.success'), i18n.t('profile.passwordUpdated'));
      setChangePasswordModalVisible(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      showAlert(i18n.t('common.error'), i18n.t('profile.passwordUpdateError'));
    } finally {
      setIsChangingPassword(false);
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
            {user?.username || i18n.t('common.username')}
          </Text>
          {(user?.permissions?.includes('ROLE_ADMIN')) && (
            <FontAwesome5 name="crown" size={18} color="#D4AF37" style={{ marginLeft: 8 }} />
          )}
        </View>
        <Text style={[styles.email, { color: subTextColor }]}>
          {user?.email || 'email@example.com'}
        </Text>
        
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{roleName}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.changePasswordButton,
            { opacity: pressed ? 0.8 : 1 }
          ]}
          onPress={() => setLanguageModalVisible(true)}
        >
          <Text style={styles.changePasswordText}>{i18n.t('profile.language')}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.changePasswordButton,
            { opacity: pressed ? 0.8 : 1 }
          ]}
          onPress={() => setChangePasswordModalVisible(true)}
        >
          <Text style={styles.changePasswordText}>{i18n.t('profile.changePassword')}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.logoutButton,
            { opacity: pressed ? 0.8 : 1 }
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>{i18n.t('profile.logout')}</Text>
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
            <Text style={[styles.modalTitle, { color: textColor }]}>{i18n.t('profile.logout')}</Text>
            <Text style={[styles.modalMessage, { color: subTextColor }]}>{i18n.t('profile.logoutConfirmation')}</Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>{i18n.t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.confirmButton]} onPress={confirmLogout}>
                <Text style={styles.confirmButtonText}>{i18n.t('profile.logout')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Cambio de Contraseña */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={changePasswordModalVisible}
        onRequestClose={() => setChangePasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>{i18n.t('profile.changePassword')}</Text>
            
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={i18n.t('profile.currentPassword')}
                placeholderTextColor="#A0AEC0"
                secureTextEntry={!showCurrentPassword}
                value={passwordData.currentPassword}
                onChangeText={(text) => setPasswordData({...passwordData, currentPassword: text})}
              />
              <Pressable onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={styles.eyeIcon}>
                <Feather name={showCurrentPassword ? "eye" : "eye-off"} size={20} color="#A0AEC0" />
              </Pressable>
            </View>
            
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={i18n.t('profile.newPassword')}
                placeholderTextColor="#A0AEC0"
                secureTextEntry={!showNewPassword}
                value={passwordData.newPassword}
                onChangeText={(text) => setPasswordData({...passwordData, newPassword: text})}
              />
              <Pressable onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                <Feather name={showNewPassword ? "eye" : "eye-off"} size={20} color="#A0AEC0" />
              </Pressable>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={i18n.t('profile.confirmNewPassword')}
                placeholderTextColor="#A0AEC0"
                secureTextEntry={!showConfirmPassword}
                value={passwordData.confirmPassword}
                onChangeText={(text) => setPasswordData({...passwordData, confirmPassword: text})}
              />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Feather name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#A0AEC0" />
              </Pressable>
            </View>

            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setChangePasswordModalVisible(false)}>
                <Text style={styles.cancelButtonText}>{i18n.t('common.cancel')}</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.saveButton]} 
                onPress={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveButtonText}>{i18n.t('common.save')}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      
      <LanguageSelector 
        visible={languageModalVisible} 
        onClose={() => setLanguageModalVisible(false)} 
      />
      <AlertComponent />
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
  changePasswordButton: {
    backgroundColor: '#EDF2F7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  changePasswordText: {
    color: '#2D3748',
    fontSize: 16,
    fontWeight: 'bold',
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
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    width: '100%',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    width: '100%',
    height: 50,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
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
  saveButton: {
    backgroundColor: '#3182CE',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  modalOverlayContentWrapper: { // New style for centering content within KAV
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});