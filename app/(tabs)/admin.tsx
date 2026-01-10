import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import RolesManager from '../../components/admin/RolesManager';
import { useCustomAlert } from '../../components/ui/CustomAlert';
import i18n from '../../constants/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import api from '../../services/api';

export default function AdminScreen() {
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const [currentView, setCurrentView] = useState<'menu' | 'users' | 'project-steps' | 'roles' | 'agenda-types' | 'site-config'>('menu');
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { showAlert, AlertComponent } = useCustomAlert();
  // Estado para Modal de Edición
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ username: '', email: '', role: '', password: '' });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);

  // Estado para Pasos del Proyecto (Catálogo)
  const [projectSteps, setProjectSteps] = useState<any[]>([]);
  const [stepModalVisible, setStepModalVisible] = useState(false);
  const [stepFormData, setStepFormData] = useState({ name: '', description: '', order: '1', type: 'CATEGORY', parentId: null as string | null });
  const [editingStep, setEditingStep] = useState<any>(null);

  // Estado para Tipos de Agenda (Catálogo Genérico)
  const [agendaTypes, setAgendaTypes] = useState<any[]>([]);
  const [agendaTypeModalVisible, setAgendaTypeModalVisible] = useState(false);
  const [agendaTypeFormData, setAgendaTypeFormData] = useState({ name: '', description: '', primaryColor: '#3182CE', icon: 'calendar' });
  const [editingAgendaType, setEditingAgendaType] = useState<any>(null);

  // Estado para Configuración del Sitio (FRONT_CONFIG)
  const [siteConfigs, setSiteConfigs] = useState<any[]>([]);
  const [siteConfigModalVisible, setSiteConfigModalVisible] = useState(false);
  const [siteConfigFormData, setSiteConfigFormData] = useState({ name: '', description: '', primaryColor: '#D4AF37', secondaryColor: '#1A202C', logoUri: '', loginTitle: '' });
  const [editingSiteConfig, setEditingSiteConfig] = useState<any>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      showAlert(i18n.t('common.error'), i18n.t('admin.errorLoadingUsers'));
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get('/api/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchProjectSteps = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/project-steps/tree');
      setProjectSteps(response.data);
    } catch (error) {
      console.error('Error fetching project steps:', error);
      showAlert(i18n.t('common.error'), i18n.t('admin.errorLoadingSteps'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAgendaTypes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/catalogs/type/AGENDA_TYPE');
      setAgendaTypes(response.data || []);
    } catch (error) {
      console.error('Error fetching agenda types:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSiteConfigs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/catalogs/type/FRONT_CONFIG');
      setSiteConfigs(response.data || []);
    } catch (error) {
      console.error('Error fetching site configs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'users') {
      fetchUsers();
      fetchRoles();
    } else if (currentView === 'project-steps') {
      fetchProjectSteps();
    } else if (currentView === 'agenda-types') {
      fetchAgendaTypes();
    } else if (currentView === 'site-config') {
      fetchSiteConfigs();
    }
  }, [currentView]);

  // Validación en tiempo real
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(formData.email);
    const isUsernameValid = (formData.username || '').trim().length > 0;
    // La contraseña es obligatoria solo si estamos creando un usuario nuevo (editingUser es null)
    const isPasswordValid = editingUser ? true : (formData.password || '').trim().length > 0;
    const isRoleValid = (formData.role || '').trim().length > 0;

    if (formData.email.length > 0 && !isEmailValid) {
      setEmailError(i18n.t('admin.invalidEmail'));
    } else {
      setEmailError(null);
    }

    setIsFormValid(isEmailValid && isUsernameValid && isPasswordValid && isRoleValid);
  }, [formData, editingUser]);

  const handleDeleteUser = (userId: string) => {
    showAlert(
      i18n.t('admin.deleteUser'),
      i18n.t('admin.deleteUserConfirmation'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/users/${userId}`);
              setUsers(prev => prev.filter(u => u.id !== userId));
              showAlert(i18n.t('common.success'), i18n.t('admin.userDeleted'));
            } catch (error) {
              console.error('Error deleting user:', error);
              showAlert(i18n.t('common.error'), i18n.t('admin.errorDeletingUser'));
            }
          }
        }
      ]
    );
  };

  const openEditModal = (userToEdit: any) => {
    setEditingUser(userToEdit);
    // Intentar encontrar el ID del rol si lo que tenemos es el nombre, o usarlo directo si es ID
    const matchingRole = roles.find(r => r.name === userToEdit.role || r.id === userToEdit.role);
    const initialRole = matchingRole ? matchingRole.id : userToEdit.role;
    setFormData({ 
      username: userToEdit.username, 
      email: userToEdit.email, 
      role: initialRole,
      password: '' 
    });
    setEmailError(null);
    setEditModalVisible(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    // Seleccionar el primer rol por defecto si existe
    const defaultRole = roles.length > 0 ? roles[0].id : '';
    setFormData({ username: '', email: '', role: defaultRole, password: '' });
    setEmailError(null);
    setEditModalVisible(true);
  };

  const handleCreateUser = async () => {
    try {
      const payload: any = { ...formData };
      
      // Enviar roles como array
      if (payload.role) {
        payload.roles = [payload.role];
        delete payload.role;
      }

      const response = await api.post('/api/users', payload);
      setUsers(prev => [...prev, response.data]);
      setEditModalVisible(false);
      showAlert(i18n.t('common.success'), i18n.t('admin.userCreated'));
    } catch (error) {
      console.error('Error creating user:', error);
      showAlert(i18n.t('common.error'), i18n.t('admin.errorCreatingUser'));
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      // Si la contraseña está vacía al editar, la eliminamos del payload para no sobrescribirla
      const payload: any = { ...formData };
      if (!payload.password) delete payload.password;

      // Enviar roles como array
      if (payload.role) {
        payload.roles = [payload.role];
        delete payload.role;
      }

      await api.put(`/api/users/${editingUser.id}`, payload);
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
      setEditModalVisible(false);
      showAlert(i18n.t('common.success'), i18n.t('admin.userUpdated'));
    } catch (error) {
      console.error('Error updating user:', error);
      showAlert(i18n.t('common.error'), i18n.t('admin.errorUpdatingUser'));
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
    if (!(stepFormData.name || '').trim()) {
      showAlert(i18n.t('common.error'), i18n.t('admin.nameRequired'));
      return;
    }

    if (stepFormData.type === 'STEP' && !stepFormData.parentId) {
      showAlert(i18n.t('common.error'), i18n.t('admin.parentCategoryRequired'));
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
        showAlert(i18n.t('common.success'), i18n.t('admin.elementUpdated'));
      } else {
        await api.post('/api/project-steps', payload);
        showAlert(i18n.t('common.success'), i18n.t('admin.elementCreated'));
      }
      setStepModalVisible(false);
      fetchProjectSteps();
    } catch (error) {
      console.error('Error saving step:', error);
      showAlert(i18n.t('common.error'), i18n.t('admin.errorSavingElement'));
    }
  };

  const handleDeleteStep = (id: string) => {
    showAlert(
      i18n.t('admin.deleteElement'),
      i18n.t('admin.deleteElementConfirmation'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/project-steps/${id}`);
              fetchProjectSteps();
              showAlert(i18n.t('common.success'), i18n.t('admin.elementDeleted'));
            } catch (error) {
              console.error('Error deleting step:', error);
              showAlert(i18n.t('common.error'), i18n.t('admin.errorDeletingElement'));
            }
          }
        }
      ]
    );
  };

  // --- FUNCIONES PARA TIPOS DE AGENDA ---
  const openCreateAgendaTypeModal = () => {
    setEditingAgendaType(null);
    setAgendaTypeFormData({ name: '', description: '', primaryColor: '#3182CE', icon: 'calendar' });
    setAgendaTypeModalVisible(true);
  };

  const openEditAgendaTypeModal = (item: any) => {
    setEditingAgendaType(item);
    setAgendaTypeFormData({
      name: item.name,
      description: item.description || '',
      primaryColor: item.metadata?.primaryColor || '#3182CE',
      icon: item.metadata?.icon || 'calendar'
    });
    setAgendaTypeModalVisible(true);
  };

  const handleSaveAgendaType = async () => {
    if (!agendaTypeFormData.name.trim()) {
      showAlert(i18n.t('common.error'), i18n.t('admin.nameRequired'));
      return;
    }

    try {
      const payload = {
        type: 'AGENDA_TYPE',
        name: agendaTypeFormData.name,
        description: agendaTypeFormData.description,
        metadata: {
          primaryColor: agendaTypeFormData.primaryColor,
          icon: agendaTypeFormData.icon
        }
      };

      if (editingAgendaType) {
        await api.put(`/api/catalogs/${editingAgendaType.id}`, payload);
        showAlert(i18n.t('common.success'), i18n.t('admin.agendaTypeUpdated'));
      } else {
        await api.post('/api/catalogs', payload);
        showAlert(i18n.t('common.success'), i18n.t('admin.agendaTypeCreated'));
      }
      setAgendaTypeModalVisible(false);
      fetchAgendaTypes();
    } catch (error) {
      console.error('Error saving agenda type:', error);
      showAlert(i18n.t('common.error'), i18n.t('admin.errorSavingAgendaType'));
    }
  };

  const handleDeleteAgendaType = (id: string) => {
    showAlert(i18n.t('admin.deleteAgendaType'), i18n.t('admin.deleteAgendaTypeConfirmation'), [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      { text: i18n.t('common.delete'), style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/api/catalogs/${id}`);
          fetchAgendaTypes();
          showAlert(i18n.t('common.success'), i18n.t('admin.agendaTypeDeleted'));
        } catch (error) {
          console.error('Error deleting agenda type:', error);
          showAlert(i18n.t('common.error'), i18n.t('admin.errorDeletingAgendaType'));
        }
      }}
    ]);
  };

  // --- FUNCIONES PARA CONFIGURACIÓN DEL SITIO ---
  const openCreateSiteConfigModal = () => {
    setEditingSiteConfig(null);
    setSiteConfigFormData({ name: '', description: '', primaryColor: '#D4AF37', secondaryColor: '#1A202C', logoUri: '', loginTitle: '' });
    setSiteConfigModalVisible(true);
  };

  const openEditSiteConfigModal = (item: any) => {
    setEditingSiteConfig(item);
    setSiteConfigFormData({
      name: item.name,
      description: item.description || '',
      primaryColor: item.metadata?.primaryColor || '#D4AF37',
      secondaryColor: item.metadata?.secondaryColor || '#1A202C',
      logoUri: item.metadata?.logoUri || '',
      loginTitle: item.metadata?.loginTitle || ''
    });
    setSiteConfigModalVisible(true);
  };

  const handleSaveSiteConfig = async () => {
    if (!siteConfigFormData.name.trim()) {
      showAlert(i18n.t('common.error'), i18n.t('admin.nameRequired'));
      return;
    }

    try {
      const payload = {
        type: 'FRONT_CONFIG',
        name: siteConfigFormData.name,
        description: siteConfigFormData.description,
        metadata: {
          primaryColor: siteConfigFormData.primaryColor,
          secondaryColor: siteConfigFormData.secondaryColor,
          logoUri: siteConfigFormData.logoUri,
          loginTitle: siteConfigFormData.loginTitle
        }
      };

      if (editingSiteConfig) {
        await api.put(`/api/catalogs/${editingSiteConfig.id}`, payload);
        showAlert(i18n.t('common.success'), 'Configuración actualizada');
      } else {
        await api.post('/api/catalogs', payload);
        showAlert(i18n.t('common.success'), 'Configuración creada');
      }
      setSiteConfigModalVisible(false);
      fetchSiteConfigs();
    } catch (error) {
      console.error('Error saving site config:', error);
      showAlert(i18n.t('common.error'), 'Error al guardar configuración');
    }
  };

  const handlePickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3], // Opcional: Ajustar según formato de logo deseado
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      await uploadLogo(result.assets[0].uri);
    }
  };

  const uploadLogo = async (uri: string) => {
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'logo.jpg';
      
      // Validación 1: Extensión del archivo (Primer filtro)
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic'];
      const ext = filename.split('.').pop()?.toLowerCase();
      
      // Solo validamos extensión si existe y no es una URI de datos o blob
      if (ext && !validExtensions.includes(ext) && !uri.startsWith('data:') && !uri.startsWith('blob:')) {
        showAlert(i18n.t('common.error'), 'Formato de archivo no válido. Use JPG, PNG o WEBP.');
        setIsUploadingLogo(false);
        return;
      }

      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        // Validación 2: Tipo MIME real y Tamaño (Solo Web)
        if (!blob.type.startsWith('image/')) {
          showAlert(i18n.t('common.error'), 'El archivo seleccionado no es una imagen válida.');
          setIsUploadingLogo(false);
          return;
        }
        
        if (blob.size > 5 * 1024 * 1024) { // Límite de 5MB
          showAlert(i18n.t('common.error'), 'La imagen es demasiado grande (Máx 5MB).');
          setIsUploadingLogo(false);
          return;
        }

        formData.append('file', blob, filename);
      } else {
        formData.append('file', { uri, name: filename, type } as any);
      }

      // Subir a endpoint genérico de archivos
      const response = await api.post('/api/files', formData, {
        headers: { 'Content-Type': Platform.OS === 'web' ? undefined : 'multipart/form-data' },
      });

      // Asumimos que el backend devuelve { uri: '...' } o { id: '...' }
      const uploadedUri = response.data?.uri || response.data?.id || response.data?.url;
      if (uploadedUri) {
        setSiteConfigFormData(prev => ({ ...prev, logoUri: uploadedUri }));
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      showAlert(i18n.t('common.error'), 'Error al subir el logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const renderUserItem = ({ item }: { item: any }) => {
    // Resolver nombre del rol para mostrar (si item.role es un ID)
    const roleObj = roles.find(r => r.id === item.role || r.name === item.role);
    const roleName = roleObj ? roleObj.name : item.role;
    const isAdmin = roleName === 'ADMIN';

    return (
      <View style={styles.userRow}>
        <Image 
          source={{ uri: item.imageUri || `https://ui-avatars.com/api/?name=${item.username}&background=random` }} 
          style={styles.avatar} 
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.username}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={[styles.roleBadge, isAdmin ? styles.roleAdmin : styles.roleUser]}>
            <Text style={[styles.roleText, isAdmin ? { color: '#FFF' } : { color: '#2D3748' }]}>{roleName}</Text>
          </View>
        </View>
        
        {hasPermission('USER_UPDATE') && (
        <View style={styles.actions}>
          <Pressable onPress={() => openEditModal(item)} style={styles.actionButton}>
            <Feather name="edit-2" size={20} color="#3182CE" />
          </Pressable>
          {hasPermission('USER_DELETE') && (
            <Pressable onPress={() => handleDeleteUser(item.id)} style={[styles.actionButton, { marginLeft: 8 }]}>
              <Feather name="trash-2" size={20} color="#E53E3E" />
            </Pressable>
          )}
        </View>
      )}
      </View>
    );
  };

  if (currentView === 'users') {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => setCurrentView('menu')} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#4A5568" />
          </Pressable>
          <Text style={styles.title}>{i18n.t('admin.userManagement')}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={users}
            keyExtractor={item => item.id}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('admin.noUsers')}</Text>}
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
                <Text style={styles.modalTitle}>{editingUser ? i18n.t('admin.editUser') : i18n.t('admin.newUser')}</Text>
                <Pressable onPress={() => setEditModalVisible(false)}>
                  <Feather name="x" size={24} color="#4A5568" />
                </Pressable>
              </View>

              <Text style={styles.label}>{i18n.t('common.username')}</Text>
              <TextInput
                style={styles.input}
                value={formData.username}
                onChangeText={text => setFormData({...formData, username: text})}
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, emailError && { borderColor: '#E53E3E', marginBottom: 4 }]}
                value={formData.email}
                onChangeText={text => setFormData({...formData, email: text})}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}

              <Text style={styles.label}>{editingUser ? i18n.t('profile.newPassword') : i18n.t('common.password')}</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={text => setFormData({...formData, password: text})}
                secureTextEntry
                placeholder={editingUser ? i18n.t('admin.leaveBlankToKeep') : ""}
                placeholderTextColor="#A0AEC0"
              />

              <Text style={styles.label}>{i18n.t('common.role')}</Text>
              <View style={[styles.roleSelector, { flexWrap: 'wrap' }]}>
                {roles.map(role => (
                  <Pressable 
                    key={role.id}
                    style={[styles.roleOption, formData.role === role.id && styles.roleOptionSelected, { marginBottom: 8, alignItems: 'flex-start' }]}
                    onPress={() => setFormData({...formData, role: role.id})}
                  >
                    <Text style={[styles.roleOptionText, formData.role === role.id && styles.roleOptionTextSelected]}>{role.name}</Text>
                    {role.description && (
                      <Text style={[styles.roleDescription, formData.role === role.id && styles.roleDescriptionSelected]}>{role.description}</Text>
                    )}
                  </Pressable>
                ))}
                {roles.length === 0 && (
                  <Text style={{ color: '#A0AEC0', fontStyle: 'italic' }}>{i18n.t('admin.loadingRoles')}</Text>
                )}
              </View>

              <Pressable 
                style={[styles.saveButton, !isFormValid && styles.disabledButton]} 
                onPress={editingUser ? handleUpdateUser : handleCreateUser}
                disabled={!isFormValid}
              >
                <Text style={styles.saveButtonText}>{editingUser ? i18n.t('common.saveChanges') : i18n.t('admin.createUser')}</Text>
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
          <Text style={styles.title}>{i18n.t('admin.projectSteps')}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 20 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.listContent}>
            {projectSteps.map((category) => (
              <View key={category.id} style={styles.treeNode}>
                {/* Nodo Categoría */}
                <View style={styles.treeNodeHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                    <View style={[styles.treeNodeIcon, { backgroundColor: '#EBF8FF' }]}>
                      <Feather name="folder" size={20} color="#3182CE" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.treeNodeTitle} numberOfLines={1}>{category.name}</Text>
                      <Text style={styles.treeNodeSubtitle} numberOfLines={1}>{category.description}</Text>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                      <Feather name="corner-down-right" size={16} color="#A0AEC0" style={{ marginRight: 8 }} />
                      <Text style={styles.treeChildTitle} numberOfLines={1}>{step.name}</Text>
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
            {projectSteps.length === 0 && <Text style={styles.emptyText}>{i18n.t('admin.noSteps')}</Text>}
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
                  {editingStep ? i18n.t('admin.editElement') : (stepFormData.parentId ? i18n.t('admin.newStep') : i18n.t('admin.newCategory'))}
                </Text>
                <Pressable onPress={() => setStepModalVisible(false)}>
                  <Feather name="x" size={24} color="#4A5568" />
                </Pressable>
              </View>

              <Text style={styles.label}>{i18n.t('common.name')}</Text>
              <TextInput
                style={styles.input}
                value={stepFormData.name}
                onChangeText={text => setStepFormData({...stepFormData, name: text})}
              />

              <Text style={styles.label}>{i18n.t('common.description')}</Text>
              <TextInput
                style={styles.input}
                value={stepFormData.description}
                onChangeText={text => setStepFormData({...stepFormData, description: text})}
              />

              <Text style={styles.label}>{i18n.t('common.order')}</Text>
              <TextInput
                style={styles.input}
                value={stepFormData.order}
                onChangeText={text => setStepFormData({...stepFormData, order: text})}
                keyboardType="numeric"
              />

              <Pressable style={styles.saveButton} onPress={handleSaveStep}>
                <Text style={styles.saveButtonText}>{i18n.t('common.save')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <AlertComponent />
      </View>
    );
  }

  if (currentView === 'agenda-types') {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => setCurrentView('menu')} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#4A5568" />
          </Pressable>
          <Text style={styles.title}>{i18n.t('admin.agendaTypes')}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={agendaTypes}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('admin.noAgendaTypes')}</Text>}
            renderItem={({ item }) => (
              <View style={styles.userRow}>
                <View style={[styles.colorPreview, { backgroundColor: item.metadata?.primaryColor || '#CBD5E0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Feather name={item.metadata?.icon || 'calendar'} size={14} color="#FFF" />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.description}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable onPress={() => openEditAgendaTypeModal(item)} style={styles.actionButton}>
                    <Feather name="edit-2" size={20} color="#3182CE" />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteAgendaType(item.id)} style={[styles.actionButton, { marginLeft: 8 }]}>
                    <Feather name="trash-2" size={20} color="#E53E3E" />
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}

        <Pressable style={styles.fab} onPress={openCreateAgendaTypeModal}>
          <Feather name="plus" size={24} color="#FFF" />
        </Pressable>

        <Modal visible={agendaTypeModalVisible} transparent={true} animationType="fade" onRequestClose={() => setAgendaTypeModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingAgendaType ? i18n.t('admin.editAgendaType') : i18n.t('admin.newAgendaType')}</Text>
                <Pressable onPress={() => setAgendaTypeModalVisible(false)}><Feather name="x" size={24} color="#4A5568" /></Pressable>
              </View>
              <Text style={styles.label}>{i18n.t('common.name')}</Text>
              <TextInput style={styles.input} value={agendaTypeFormData.name} onChangeText={text => setAgendaTypeFormData({...agendaTypeFormData, name: text})} />
              <Text style={styles.label}>{i18n.t('common.description')}</Text>
              <TextInput style={styles.input} value={agendaTypeFormData.description} onChangeText={text => setAgendaTypeFormData({...agendaTypeFormData, description: text})} />
              <Text style={styles.label}>{i18n.t('admin.color')}</Text>
              <View style={styles.colorPickerRow}>
                {['#3182CE', '#E53E3E', '#38A169', '#D69E2E', '#805AD5', '#D53F8C', '#319795', '#DD6B20', '#718096', '#000000'].map(color => (
                  <Pressable
                    key={color}
                    style={[styles.colorOption, { backgroundColor: color }, agendaTypeFormData.primaryColor === color && styles.colorOptionSelected]}
                    onPress={() => setAgendaTypeFormData({...agendaTypeFormData, primaryColor: color})}
                  />
                ))}
              </View>
              <Text style={styles.label}>{i18n.t('admin.icon')}</Text>
              <View style={styles.iconPickerRow}>
                {['calendar', 'users', 'check-circle', 'clock', 'briefcase', 'file-text', 'tool', 'truck', 'home', 'alert-triangle', 'flag', 'map-pin'].map(iconName => (
                  <Pressable
                    key={iconName}
                    style={[
                      styles.iconOption, 
                      agendaTypeFormData.icon === iconName && styles.iconOptionSelected,
                      agendaTypeFormData.icon === iconName && { backgroundColor: agendaTypeFormData.primaryColor }
                    ]}
                    onPress={() => setAgendaTypeFormData({...agendaTypeFormData, icon: iconName})}
                  >
                    <Feather name={iconName as any} size={20} color={agendaTypeFormData.icon === iconName ? '#FFF' : '#718096'} />
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.saveButton} onPress={handleSaveAgendaType}><Text style={styles.saveButtonText}>{i18n.t('common.save')}</Text></Pressable>
            </View>
          </View>
        </Modal>
        <AlertComponent />
      </View>
    );
  }

  if (currentView === 'site-config') {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => setCurrentView('menu')} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#4A5568" />
          </Pressable>
          <Text style={styles.title}>Configuración del Sitio</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={siteConfigs}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>No hay configuraciones. Crea una para personalizar el tema.</Text>}
            renderItem={({ item }) => (
              <View style={styles.userRow}>
                <View style={[styles.colorPreview, { backgroundColor: item.metadata?.primaryColor || '#CBD5E0' }]} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.description || 'Sin descripción'}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable onPress={() => openEditSiteConfigModal(item)} style={styles.actionButton}>
                    <Feather name="edit-2" size={20} color="#3182CE" />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteAgendaType(item.id)} style={[styles.actionButton, { marginLeft: 8 }]}>
                    <Feather name="trash-2" size={20} color="#E53E3E" />
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}

        <Pressable style={styles.fab} onPress={openCreateSiteConfigModal}>
          <Feather name="plus" size={24} color="#FFF" />
        </Pressable>

        <Modal visible={siteConfigModalVisible} transparent={true} animationType="fade" onRequestClose={() => setSiteConfigModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingSiteConfig ? 'Editar Configuración' : 'Nueva Configuración'}</Text>
                <Pressable onPress={() => setSiteConfigModalVisible(false)}><Feather name="x" size={24} color="#4A5568" /></Pressable>
              </View>
              <Text style={styles.label}>Nombre del Sitio / Marca</Text>
              <TextInput style={styles.input} value={siteConfigFormData.name} onChangeText={text => setSiteConfigFormData({...siteConfigFormData, name: text})} placeholder="Ej. Constructora Demo" />
              
              <Text style={styles.label}>Título Login</Text>
              <TextInput style={styles.input} value={siteConfigFormData.loginTitle} onChangeText={text => setSiteConfigFormData({...siteConfigFormData, loginTitle: text})} placeholder="Ej. Bienvenido al Portal" />

              <Text style={styles.label}>Logo</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <TextInput 
                  style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                  value={siteConfigFormData.logoUri} 
                  onChangeText={text => setSiteConfigFormData({...siteConfigFormData, logoUri: text})} 
                  placeholder="URL o ID del archivo" 
                />
                <Pressable 
                  style={{ backgroundColor: '#EDF2F7', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' }}
                  onPress={handlePickLogo}
                  disabled={isUploadingLogo}
                >
                  {isUploadingLogo ? <ActivityIndicator size="small" color="#3182CE" /> : <Feather name="upload" size={20} color="#4A5568" />}
                </Pressable>
              </View>
              {siteConfigFormData.logoUri ? (
                <View style={{ alignItems: 'center', marginBottom: 16, padding: 8, backgroundColor: '#F7FAFC', borderRadius: 8 }}>
                  <Image 
                    source={{ uri: siteConfigFormData.logoUri.startsWith('http') ? siteConfigFormData.logoUri : `${api.defaults.baseURL || ''}/api/files/${siteConfigFormData.logoUri}` }} 
                    style={{ width: 150, height: 60, resizeMode: 'contain' }} 
                  />
                </View>
              ) : null}

              <Text style={styles.label}>Color Primario</Text>
              <View style={styles.colorPickerRow}>
                {['#D4AF37', '#3182CE', '#E53E3E', '#38A169', '#2D3748', '#805AD5', '#DD6B20', '#000000'].map(color => (
                  <Pressable
                    key={color}
                    style={[styles.colorOption, { backgroundColor: color }, siteConfigFormData.primaryColor === color && styles.colorOptionSelected]}
                    onPress={() => setSiteConfigFormData({...siteConfigFormData, primaryColor: color})}
                  />
                ))}
              </View>

              <Pressable style={styles.saveButton} onPress={handleSaveSiteConfig}><Text style={styles.saveButtonText}>{i18n.t('common.save')}</Text></Pressable>
            </View>
          </View>
        </Modal>
        <AlertComponent />
      </View>
    );
  }

  if (currentView === 'roles') {
    return <RolesManager onBack={() => setCurrentView('menu')} />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{i18n.t('nav.administrator')}</Text>
      <Text style={styles.subtitle}>{i18n.t('admin.subtitle')}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('admin.catalogs')}</Text>
        
        <Pressable style={styles.card} onPress={() => setCurrentView('project-steps')}>
            <View style={styles.cardIcon}>
                <Feather name="layers" size={24} color="#805AD5" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{i18n.t('admin.projectSteps')}</Text>
                <Text style={styles.cardDescription}>{i18n.t('admin.manageProjectSteps')}</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#CBD5E0" />
        </Pressable>

        <Pressable style={styles.card} onPress={() => setCurrentView('site-config')}>
            <View style={styles.cardIcon}>
                <Feather name="layout" size={24} color="#319795" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Configuración del Sitio</Text>
                <Text style={styles.cardDescription}>Personalizar colores, logo y textos</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#CBD5E0" />
        </Pressable>

        <Pressable style={styles.card} onPress={() => setCurrentView('agenda-types')}>
            <View style={styles.cardIcon}>
                <Feather name="calendar" size={24} color="#D69E2E" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{i18n.t('admin.agendaTypes')}</Text>
                <Text style={styles.cardDescription}>{i18n.t('admin.manageAgendaTypes')}</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#CBD5E0" />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('admin.rolesPermissions')}</Text>
        <Pressable style={styles.card} onPress={() => setCurrentView('roles')}>
            <View style={styles.cardIcon}>
                <Feather name="shield" size={24} color="#DD6B20" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{i18n.t('admin.rolesManagement')}</Text>
                <Text style={styles.cardDescription}>{i18n.t('admin.manageRoles')}</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#CBD5E0" />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('admin.users')}</Text>
        <Pressable style={styles.card} onPress={() => setCurrentView('users')}>
            <View style={styles.cardIcon}>
                <Feather name="users" size={24} color="#38A169" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{i18n.t('admin.userManagementTitle')}</Text>
                <Text style={styles.cardDescription}>{i18n.t('admin.manageUsers')}</Text>
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
  errorText: { color: '#E53E3E', fontSize: 12, marginBottom: 12, fontFamily: 'Inter-Regular' },
  cancelButton: { backgroundColor: '#EDF2F7' },
  roleSelector: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleOption: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  roleOptionSelected: { backgroundColor: '#EBF8FF', borderColor: '#3182CE' },
  roleOptionText: { color: '#718096', fontWeight: '600', fontFamily: 'Inter-SemiBold' },
  roleOptionTextSelected: { color: '#3182CE' },
  roleDescription: { fontSize: 11, color: '#A0AEC0', marginTop: 2, fontFamily: 'Inter-Regular' },
  roleDescriptionSelected: { color: '#63B3ED' },
  saveButton: { backgroundColor: '#3182CE', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  disabledButton: { backgroundColor: '#CBD5E0' },
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
  
  colorPreview: { width: 24, height: 24, borderRadius: 12, marginRight: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  colorPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  colorOption: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#FFF', shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  colorOptionSelected: { borderWidth: 2, borderColor: '#2D3748', transform: [{ scale: 1.1 }] },
  iconPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  iconOption: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAFC' },
  iconOptionSelected: { borderWidth: 0, transform: [{ scale: 1.1 }] },
});