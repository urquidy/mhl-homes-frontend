import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Image, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useCustomAlert } from '../../components/ui/CustomAlert';

export default function AdminScreen() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'menu' | 'users' | 'project-steps'>('menu');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { showAlert, AlertComponent } = useCustomAlert();
  // Estado para Modal de Edición
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ username: '', email: '', role: '', password: '' });

  // Estado para Pasos del Proyecto (Catálogo)
  const [projectSteps, setProjectSteps] = useState<any[]>([]);
  const [stepModalVisible, setStepModalVisible] = useState(false);
  const [stepFormData, setStepFormData] = useState({ name: '', description: '', order: '1', type: 'CATEGORY', parentId: null as string | null });
  const [editingStep, setEditingStep] = useState<any>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      showAlert('Error', 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSteps = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/project-steps/tree');
      setProjectSteps(response.data);
    } catch (error) {
      console.error('Error fetching project steps:', error);
      showAlert('Error', 'No se pudieron cargar los pasos del proyecto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'users') {
      fetchUsers();
    } else if (currentView === 'project-steps') {
      fetchProjectSteps();
    }
  }, [currentView]);

  const handleDeleteUser = (userId: string) => {
    showAlert(
      'Eliminar Usuario',
      '¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/users/${userId}`);
              setUsers(prev => prev.filter(u => u.id !== userId));
              showAlert('Éxito', 'Usuario eliminado correctamente.');
            } catch (error) {
              console.error('Error deleting user:', error);
              showAlert('Error', 'No se pudo eliminar el usuario.');
            }
          }
        }
      ]
    );
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
      showAlert('Éxito', 'Usuario creado correctamente.');
    } catch (error) {
      console.error('Error creating user:', error);
      showAlert('Error', 'No se pudo crear el usuario.');
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
      showAlert('Éxito', 'Usuario actualizado correctamente.');
    } catch (error) {
      console.error('Error updating user:', error);
      showAlert('Error', 'No se pudo actualizar el usuario.');
    }
  };

  // --- FUNCIONES PARA PASOS DEL PROYECTO ---
  const openCreateStepModal = (parentId: string | null = null) => {
    setEditingStep(null);
    setStepFormData({ 
      name: '', 
      description: '', 
      order: '1', 
      type: parentId ? 'STEP' : 'CATEGORY', 
      parentId: parentId 
    });
    setStepModalVisible(true);
  };

  const openEditStepModal = (step: any) => {
    setEditingStep(step);
    setStepFormData({
      name: step.name,
      description: step.description || '',
      order: String(step.order || 1),
      type: step.type,
      parentId: step.parentId
    });
    setStepModalVisible(true);
  };

  const handleSaveStep = async () => {
    if (!stepFormData.name.trim()) {
      showAlert('Error', 'El nombre es obligatorio.');
      return;
    }

    if (stepFormData.type === 'STEP' && !stepFormData.parentId) {
      showAlert('Error', 'El paso debe tener una categoría padre asignada.');
      return;
    }

    try {
      // Construimos el payload explícitamente para cumplir con el JSON requerido:
      // { name, description, order (int), type, parentId }
      const payload = {
        name: stepFormData.name,
        description: stepFormData.description,
        order: parseInt(stepFormData.order) || 1,
        type: stepFormData.type,
        parentId: stepFormData.type === 'CATEGORY' ? null : stepFormData.parentId
      };

      if (editingStep) {
        await api.put(`/api/project-steps/${editingStep.id}`, payload);
        showAlert('Éxito', 'Elemento actualizado correctamente.');
      } else {
        await api.post('/api/project-steps', payload);
        showAlert('Éxito', 'Elemento creado correctamente.');
      }
      setStepModalVisible(false);
      fetchProjectSteps();
    } catch (error) {
      console.error('Error saving step:', error);
      showAlert('Error', 'No se pudo guardar el elemento.');
    }
  };

  const handleDeleteStep = (id: string) => {
    showAlert(
      'Eliminar Elemento',
      '¿Estás seguro? Se eliminarán también los elementos hijos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/project-steps/${id}`);
              fetchProjectSteps();
              showAlert('Éxito', 'Elemento eliminado.');
            } catch (error) {
              console.error('Error deleting step:', error);
              showAlert('Error', 'No se pudo eliminar el elemento.');
            }
          }
        }
      ]
    );
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
        <AlertComponent />
      </View>
    );
  }

  if (currentView === 'project-steps') {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => setCurrentView('menu')} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#4A5568" />
          </Pressable>
          <Text style={styles.title}>Pasos del Proyecto</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 20 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            {projectSteps.map((category) => (
              <View key={category.id} style={styles.treeNode}>
                {/* Nodo Categoría */}
                <View style={styles.treeNodeHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.treeNodeIcon, { backgroundColor: '#EBF8FF' }]}>
                      <Feather name="folder" size={20} color="#3182CE" />
                    </View>
                    <View>
                      <Text style={styles.treeNodeTitle}>{category.name}</Text>
                      <Text style={styles.treeNodeSubtitle}>{category.description}</Text>
                    </View>
                  </View>
                  <View style={styles.treeNodeActions}>
                    <Pressable onPress={() => openCreateStepModal(category.id)} style={styles.actionButton}>
                      <Feather name="plus" size={18} color="#38A169" />
                    </Pressable>
                    <Pressable onPress={() => openEditStepModal(category)} style={styles.actionButton}>
                      <Feather name="edit-2" size={18} color="#3182CE" />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteStep(category.id)} style={styles.actionButton}>
                      <Feather name="trash-2" size={18} color="#E53E3E" />
                    </Pressable>
                  </View>
                </View>

                {/* Nodos Hijos (Pasos) */}
                {category.children && category.children.map((step: any) => (
                  <View key={step.id} style={styles.treeChildNode}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Feather name="corner-down-right" size={16} color="#A0AEC0" style={{ marginRight: 8 }} />
                      <Text style={styles.treeChildTitle}>{step.name}</Text>
                    </View>
                    <View style={styles.treeNodeActions}>
                      <Pressable onPress={() => openEditStepModal(step)} style={styles.actionButton}>
                        <Feather name="edit-2" size={16} color="#718096" />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteStep(step.id)} style={styles.actionButton}>
                        <Feather name="trash-2" size={16} color="#E53E3E" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ))}
            {projectSteps.length === 0 && <Text style={styles.emptyText}>No hay pasos configurados.</Text>}
          </ScrollView>
        )}

        <Pressable style={styles.fab} onPress={() => openCreateStepModal(null)}>
          <Feather name="plus" size={24} color="#FFF" />
        </Pressable>

        {/* Modal Crear/Editar Paso */}
        <Modal
          visible={stepModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setStepModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingStep ? 'Editar Elemento' : (stepFormData.parentId ? 'Nuevo Paso' : 'Nueva Categoría')}
                </Text>
                <Pressable onPress={() => setStepModalVisible(false)}>
                  <Feather name="x" size={24} color="#4A5568" />
                </Pressable>
              </View>

              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={stepFormData.name}
                onChangeText={text => setStepFormData({...stepFormData, name: text})}
              />

              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={styles.input}
                value={stepFormData.description}
                onChangeText={text => setStepFormData({...stepFormData, description: text})}
              />

              <Text style={styles.label}>Orden</Text>
              <TextInput
                style={styles.input}
                value={stepFormData.order}
                onChangeText={text => setStepFormData({...stepFormData, order: text})}
                keyboardType="numeric"
              />

              <Pressable style={styles.saveButton} onPress={handleSaveStep}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <AlertComponent />
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

        <Pressable style={styles.card} onPress={() => setCurrentView('project-steps')}>
            <View style={styles.cardIcon}>
                <Feather name="layers" size={24} color="#805AD5" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Pasos del Proyecto</Text>
                <Text style={styles.cardDescription}>Gestionar árbol de procesos (Cimientos, Estructura...)</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#CBD5E0" />
        </Pressable>
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
      <AlertComponent />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 28, fontWeight: 'bold', fontFamily: 'Inter-Bold', color: '#1A202C', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#718096', marginBottom: 32, fontFamily: 'Inter-Regular' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', fontFamily: 'Inter-Bold', color: '#2D3748', marginBottom: 16 },
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
  cardTitle: { fontSize: 16, fontWeight: 'bold', fontFamily: 'Inter-Bold', color: '#2D3748' },
  cardDescription: { fontSize: 14, color: '#718096', marginTop: 2, fontFamily: 'Inter-Regular' },
  
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
  userName: { fontSize: 16, fontWeight: 'bold', fontFamily: 'Inter-Bold', color: '#2D3748' },
  userEmail: { fontSize: 14, color: '#718096', fontFamily: 'Inter-Regular' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 4 },
  roleAdmin: { backgroundColor: '#3182CE' },
  roleUser: { backgroundColor: '#E2E8F0' },
  roleText: { fontSize: 10, fontWeight: 'bold', fontFamily: 'Inter-Bold' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { padding: 8 },
  emptyText: { textAlign: 'center', color: '#718096', marginTop: 20, fontFamily: 'Inter-Regular' },

  // Estilos Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 12, padding: 24, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', fontFamily: 'Inter-Bold', color: '#1A202C' },
  label: { fontSize: 14, fontWeight: '600', fontFamily: 'Inter-SemiBold', color: '#4A5568', marginBottom: 8 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, color: '#2D3748', fontFamily: 'Inter-Regular' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  cancelButton: { backgroundColor: '#EDF2F7' },
  roleSelector: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleOption: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  roleOptionSelected: { backgroundColor: '#EBF8FF', borderColor: '#3182CE' },
  roleOptionText: { color: '#718096', fontWeight: '600', fontFamily: 'Inter-SemiBold' },
  roleOptionTextSelected: { color: '#3182CE' },
  saveButton: { backgroundColor: '#3182CE', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', fontFamily: 'Inter-Bold' },

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

  // Estilos Árbol de Pasos
  treeNode: { backgroundColor: '#FFF', borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  treeNodeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#F7FAFC', borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  treeNodeIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  treeNodeTitle: { fontSize: 16, fontWeight: 'bold', fontFamily: 'Inter-Bold', color: '#2D3748' },
  treeNodeSubtitle: { fontSize: 12, color: '#718096', fontFamily: 'Inter-Regular' },
  treeNodeActions: { flexDirection: 'row', alignItems: 'center' },
  treeChildNode: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, paddingLeft: 24, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  treeChildTitle: { fontSize: 14, color: '#4A5568', fontFamily: 'Inter-Regular' },
});