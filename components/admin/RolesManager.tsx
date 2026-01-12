// d:\Codigo Fuente\mhl-homes\mhl-homes\components\admin\RolesManager.tsx

import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import i18n from '../../constants/i18n';
import { usePermission } from '../../hooks/usePermission';
import api from '../../services/api';
import { useCustomAlert } from '../ui/CustomAlert';

interface RolesManagerProps {
  onBack: () => void;
}

export default function RolesManager({ onBack }: RolesManagerProps) {
  const [roles, setRoles] = useState<any[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', description: '', permissions: [] as string[] });
  
  const { showAlert, AlertComponent } = useCustomAlert();
  const { hasPermission } = usePermission();

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      showAlert(i18n.t('common.error'), i18n.t('roles.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/api/roles/permissions');
      setAvailablePermissions(response.data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  // Agrupar permisos por prefijo (ej. PROJECT, USER, MENU)
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, string[]> = {};
    availablePermissions.forEach(perm => {
      const prefix = perm.split('_')[0];
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(perm);
    });
    return groups;
  }, [availablePermissions]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showAlert(i18n.t('common.error'), i18n.t('roles.nameRequired'));
      return;
    }

    try {
      if (editingRole) {
        await api.put(`/api/roles/${editingRole.id}`, formData);
        showAlert(i18n.t('common.success'), i18n.t('roles.updateSuccess'));
      } else {
        await api.post('/api/roles', formData);
        showAlert(i18n.t('common.success'), i18n.t('roles.createSuccess'));
      }
      setModalVisible(false);
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      showAlert(i18n.t('common.error'), i18n.t('roles.saveError'));
    }
  };

  const handleDelete = (id: string) => {
    showAlert(
      i18n.t('roles.deleteTitle'),
      i18n.t('roles.deleteMessage'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/roles/${id}`);
              fetchRoles();
              showAlert(i18n.t('common.success'), i18n.t('roles.deleteSuccess'));
            } catch (error) {
              console.error('Error deleting role:', error);
              showAlert(i18n.t('common.error'), i18n.t('roles.deleteError'));
            }
          }
        }
      ]
    );
  };

  const openModal = (role?: any) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions || []
      });
    } else {
      setEditingRole(null);
      setFormData({ name: '', description: '', permissions: [] });
    }
    setModalVisible(true);
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => {
      const exists = prev.permissions.includes(permission);
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== permission) };
      } else {
        return { ...prev, permissions: [...prev.permissions, permission] };
      }
    });
  };

  const toggleGroup = (groupPerms: string[]) => {
    setFormData(prev => {
      const allSelected = groupPerms.every(p => prev.permissions.includes(p));
      let newPermissions = [...prev.permissions];

      if (allSelected) {
        newPermissions = newPermissions.filter(p => !groupPerms.includes(p));
      } else {
        groupPerms.forEach(p => {
          if (!newPermissions.includes(p)) newPermissions.push(p);
        });
      }
      return { ...prev, permissions: newPermissions };
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.roleName}>{item.name}</Text>
          <Text style={styles.roleDescription}>{item.description}</Text>
        </View>
        <View style={styles.actions}>
          {hasPermission('ROLE_UPDATE') && (
            <Pressable onPress={() => openModal(item)} style={styles.actionButton}>
              <Feather name="edit-2" size={20} color="#3182CE" />
            </Pressable>
          )}
          {hasPermission('ROLE_DELETE') && (
            <Pressable onPress={() => handleDelete(item.id)} style={styles.actionButton}>
              <Feather name="trash-2" size={20} color="#E53E3E" />
            </Pressable>
          )}
        </View>
      </View>
      <View style={styles.permissionsContainer}>
        <Text style={styles.permissionsLabel}>{i18n.t('roles.permissions')}: {item.permissions?.length || 0}</Text>
        <View style={styles.tagsRow}>
          {(item.permissions || []).slice(0, 5).map((p: string) => (
            <View key={p} style={styles.permissionTag}>
              <Text style={styles.permissionText}>{p.replace('MENU_', '').replace('_', ' ')}</Text>
            </View>
          ))}
          {(item.permissions?.length || 0) > 5 && (
            <View style={styles.permissionTag}>
              <Text style={styles.permissionText}>+{item.permissions.length - 5} más</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (!hasPermission('ROLE_READ')) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#4A5568" />
          </Pressable>
          <Text style={styles.title}>Gestión de Roles</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Feather name="lock" size={48} color="#CBD5E0" />
          <Text style={{ marginTop: 16, fontSize: 18, color: '#718096' }}>{i18n.t('common.accessDenied')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#4A5568" />
        </Pressable>
        <Text style={styles.title}>{i18n.t('roles.title')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={roles}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>{i18n.t('roles.empty')}</Text>}
        />
      )}

      {hasPermission('ROLE_CREATE') && (
        <Pressable style={styles.fab} onPress={() => openModal()}>
          <Feather name="plus" size={24} color="#FFF" />
        </Pressable>
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingRole ? i18n.t('roles.edit') : i18n.t('roles.new')}</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color="#4A5568" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.label}>{i18n.t('roles.name')}</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={text => setFormData({ ...formData, name: text })}
                placeholder="Ej. ADMIN"
              />

              <Text style={styles.label}>{i18n.t('roles.desc')}</Text>
              <TextInput
                style={styles.input}
                value={formData.description}
                onChangeText={text => setFormData({ ...formData, description: text })}
                placeholder={i18n.t('roles.descPlaceholder')}
              />

              <Text style={styles.label}>{i18n.t('roles.permissions')}</Text>
              {Object.entries(groupedPermissions).map(([group, perms]) => {
                const allSelected = perms.every(p => formData.permissions.includes(p));
                return (
                <View key={group} style={styles.permissionGroup}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupTitle}>{group}</Text>
                    <Pressable onPress={() => toggleGroup(perms)}>
                      <Text style={styles.selectAllText}>{allSelected ? i18n.t('roles.deselect') : i18n.t('roles.todos')}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.permissionsGrid}>
                    {perms.map(perm => {
                      const isSelected = formData.permissions.includes(perm);
                      // Mostrar solo la parte específica del permiso para limpiar la UI (ej. READ en lugar de PROJECT_READ)
                      const displayName = perm.startsWith(group + '_') ? perm.replace(group + '_', '') : perm;
                      
                      return (
                        <Pressable
                          key={perm}
                          style={[styles.permOption, isSelected && styles.permOptionSelected]}
                          onPress={() => togglePermission(perm)}
                        >
                          <Text style={[styles.permText, isSelected && styles.permTextSelected]}>
                            {displayName.replace(/_/g, ' ')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                );
              })}
            </ScrollView>

            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{i18n.t('common.save')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backButton: { padding: 8, marginRight: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1A202C' },
  list: { paddingBottom: 80 },
  card: { backgroundColor: '#F7FAFC', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  roleName: { fontSize: 18, fontWeight: 'bold', color: '#2D3748' },
  roleDescription: { fontSize: 14, color: '#718096', marginTop: 4 },
  actions: { flexDirection: 'row' },
  actionButton: { padding: 8, marginLeft: 4 },
  permissionsContainer: { marginTop: 12 },
  permissionsLabel: { fontSize: 12, fontWeight: '600', color: '#4A5568', marginBottom: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  permissionTag: { backgroundColor: '#EBF8FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  permissionText: { fontSize: 10, color: '#3182CE', fontWeight: '500' },
  emptyText: { textAlign: 'center', color: '#A0AEC0', marginTop: 24 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3182CE', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.27, shadowRadius: 4.65 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 500, backgroundColor: '#FFF', borderRadius: 12, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A202C' },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 16, color: '#2D3748' },
  permissionGroup: { marginBottom: 16 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, backgroundColor: '#F7FAFC', padding: 6, borderRadius: 4 },
  groupTitle: { fontSize: 12, fontWeight: 'bold', color: '#718096' },
  selectAllText: { fontSize: 11, color: '#3182CE', fontWeight: '600' },
  permissionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  permOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
  permOptionSelected: { backgroundColor: '#3182CE', borderColor: '#3182CE' },
  permText: { fontSize: 12, color: '#4A5568' },
  permTextSelected: { color: '#FFF', fontWeight: '600' },
  saveButton: { backgroundColor: '#3182CE', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
