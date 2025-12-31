import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Image, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminScreen() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'menu' | 'users'>('menu');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estado para Modal de Edición
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ username: '', email: '', role: '', password: '' });

  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    confirmColor?: string;
    isLoading?: boolean;
  }>({ visible: false, title: '', message: '', onConfirm: () => {} });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'users') {
      fetchUsers();
    }
  }, [currentView]);

  const handleDeleteUser = (userId: string) => {
    setConfirmationModal({
      visible: true,
      title: 'Eliminar Usuario',
      message: '¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      confirmColor: '#E53E3E',
      onConfirm: async () => {
        try {
          await api.delete(`/api/users/${userId}`);
          setUsers(prev => prev.filter(u => u.id !== userId));
          Alert.alert('Éxito', 'Usuario eliminado correctamente.');
        } catch (error) {
          console.error('Error deleting user:', error);
          Alert.alert('Error', 'No se pudo eliminar el usuario.');
        }
      }
    });
  };

  const openEditModal = (userToEdit: any) => {
    setEditingUser(userToEdit);
    setFormData({ 
      username: userToEdit.username, 
      email: userToEdit.email, 
      role: userToEdit.role,
      password: '' 
    });
    setEditModalVisible(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ username: '', email: '', role: 'USER', password: '' });
    setEditModalVisible(true);
  };

  const handleCreateUser = async () => {
    try {
      const response = await api.post('/api/users', formData);
      setUsers(prev => [...prev, response.data]);
      setEditModalVisible(false);
      Alert.alert('Éxito', 'Usuario creado correctamente.');
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'No se pudo crear el usuario.');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      // Si la contraseña está vacía al editar, la eliminamos del payload para no sobrescribirla
      const payload = { ...formData };
      if (!payload.password) delete (payload as any).password;

      await api.put(`/api/users/${editingUser.id}`, payload);
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
      setEditModalVisible(false);
      Alert.alert('Éxito', 'Usuario actualizado correctamente.');
    } catch (error) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'No se pudo actualizar el usuario.');
    }
  };

  const renderUserItem = ({ item }: { item: any }) => (
    <View style={styles.userRow}>
      <Image 
        source={{ uri: item.imageUri || `https://ui-avatars.com/api/?name=${item.username}&background=random` }} 
        style={styles.avatar} 
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={[styles.roleBadge, item.role === 'ADMIN' ? styles.roleAdmin : styles.roleUser]}>
          <Text style={[styles.roleText, item.role === 'ADMIN' ? { color: '#FFF' } : { color: '#2D3748' }]}>{item.role}</Text>
        </View>
      </View>
      
       {(user?.role as string) === 'ADMIN' && (
        <View style={styles.actions}>
          <Pressable onPress={() => openEditModal(item)} style={styles.actionButton}>
            <Feather name="edit-2" size={20} color="#3182CE" />
          </Pressable>
          <Pressable onPress={() => handleDeleteUser(item.id)} style={[styles.actionButton, { marginLeft: 8 }]}>
            <Feather name="trash-2" size={20} color="#E53E3E" />
          </Pressable>
        </View>
      )}
    </View>
  );

  if (currentView === 'users') {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => setCurrentView('menu')} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#4A5568" />
          </Pressable>
          <Text style={styles.title}>Gestión de Usuarios</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={users}
            keyExtractor={item => item.id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>No hay usuarios registrados.</Text>}
          />
        )}

        {/* --- MODAL DE CONFIRMACIÓN --- */}
        <Modal
          visible={confirmationModal.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => !confirmationModal.isLoading && setConfirmationModal(prev => ({ ...prev, visible: false }))}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{confirmationModal.title}</Text>
              <Text style={{ fontSize: 16, color: '#4A5568', marginBottom: 24 }}>
                {confirmationModal.message}
              </Text>
              <View style={styles.modalButtons}>
                <Pressable 
                  style={[styles.modalButton, styles.cancelButton, confirmationModal.isLoading && { opacity: 0.5 }]} 
                  onPress={() => setConfirmationModal(prev => ({ ...prev, visible: false }))}
                  disabled={confirmationModal.isLoading}
                >
                  <Text style={{ fontWeight: 'bold', color: '#4A5568' }}>Cancelar</Text>
                </Pressable>
                <Pressable 
                  style={[styles.modalButton, { backgroundColor: confirmationModal.confirmColor || '#3182CE' }, confirmationModal.isLoading && { opacity: 0.7 }]} 
                  onPress={async () => {
                    setConfirmationModal(prev => ({ ...prev, isLoading: true }));
                    try {
                      await confirmationModal.onConfirm();
                    } finally {
                      setConfirmationModal(prev => ({ ...prev, visible: false, isLoading: false }));
                    }
                  }}
                  disabled={confirmationModal.isLoading}
                >
                  {confirmationModal.isLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveButtonText}>{confirmationModal.confirmText || 'Confirmar'}</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Pressable style={styles.fab} onPress={openCreateModal}>
          <Feather name="plus" size={24} color="#FFF" />
        </Pressable>

        <Modal
          visible={editModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</Text>
                <Pressable onPress={() => setEditModalVisible(false)}>
                  <Feather name="x" size={24} color="#4A5568" />
                </Pressable>
              </View>

              <Text style={styles.label}>Usuario</Text>
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={text => setFormData({...formData, username: text})}
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={text => setFormData({...formData, email: text})}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>{editingUser ? 'Nueva Contraseña' : 'Contraseña'}</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={text => setFormData({...formData, password: text})}
                secureTextEntry
                placeholder={editingUser ? "Dejar en blanco para mantener" : ""}
                placeholderTextColor="#A0AEC0"
              />

              <Text style={styles.label}>Rol</Text>
              <View style={styles.roleSelector}>
                {['ADMIN', 'USER'].map(role => (
                  <Pressable 
                    key={role}
                    style={[styles.roleOption, formData.role === role && styles.roleOptionSelected]}
                    onPress={() => setFormData({...formData, role})}
                  >
                    <Text style={[styles.roleOptionText, formData.role === role && styles.roleOptionTextSelected]}>{role}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.saveButton} onPress={editingUser ? handleUpdateUser : handleCreateUser}>
                <Text style={styles.saveButtonText}>{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Administrator</Text>
      <Text style={styles.subtitle}>Manage catalogs and users</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Catalogs</Text>
        
        <Pressable style={styles.card} onPress={() => console.log('Manage Categories')}>
            <View style={styles.cardIcon}>
                <Feather name="list" size={24} color="#3182CE" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Budget Categories</Text>
                <Text style={styles.cardDescription}>Manage expense categories (Partidas)</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#CBD5E0" />
        </Pressable>

        {/* Aquí puedes agregar más catálogos en el futuro */}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Users</Text>
        <Pressable style={styles.card} onPress={() => setCurrentView('users')}>
            <View style={styles.cardIcon}>
                <Feather name="users" size={24} color="#38A169" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>User Management</Text>
                <Text style={styles.cardDescription}>Add, remove or edit users</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#CBD5E0" />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A202C', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#718096', marginBottom: 32 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3748', marginBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  cardDescription: { fontSize: 14, color: '#718096', marginTop: 2 },
  
  // Estilos para la vista de Usuarios
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backButton: { marginRight: 16, padding: 4 },
  listContent: { paddingBottom: 24 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#E2E8F0' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  userEmail: { fontSize: 14, color: '#718096' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 4 },
  roleAdmin: { backgroundColor: '#3182CE' },
  roleUser: { backgroundColor: '#E2E8F0' },
  roleText: { fontSize: 10, fontWeight: 'bold' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { padding: 8 },
  emptyText: { textAlign: 'center', color: '#718096', marginTop: 20 },

  // Estilos Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 12, padding: 24, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A202C' },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, color: '#2D3748' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  cancelButton: { backgroundColor: '#EDF2F7' },
  roleSelector: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleOption: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  roleOptionSelected: { backgroundColor: '#EBF8FF', borderColor: '#3182CE' },
  roleOptionText: { color: '#718096', fontWeight: '600' },
  roleOptionTextSelected: { color: '#3182CE' },
  saveButton: { backgroundColor: '#3182CE', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3182CE',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
});