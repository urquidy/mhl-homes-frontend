import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCustomAlert } from '../../components/ui/CustomAlert';
import i18n from '../../constants/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { usePermission } from '../../hooks/usePermission';

export default function ProjectsScreen() {
  const { projects, deleteProject, restoreProject, startProject, refreshProjects, loadMoreProjects, hasMoreProjects, isLoading } = useProjects();
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const router = useRouter();
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [projectToRestore, setProjectToRestore] = useState<string | null>(null);
  const [startModalVisible, setStartModalVisible] = useState(false);
  const [projectToStart, setProjectToStart] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchTimer, setSearchTimer] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { showAlert, AlertComponent } = useCustomAlert();

  // Filtramos los proyectos activos (excluyendo los completados, si esa es la lógica deseada, o mostrando todos)
  // Asumiremos que "Activos" son todos los que no están archivados/borrados. 
  // Si quieres excluir 'Completado', descomenta el filtro.
  const activeProjects = projects.filter(p => {
    const term = searchText.toLowerCase();
    return p.name.toLowerCase().includes(term) ||
           (p.client && p.client.toLowerCase().includes(term)) ||
           (p.address && p.address.toLowerCase().includes(term));
  }); // .filter(p => p.status !== 'Completed');

  const handleDelete = (id: string) => {
    setProjectToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      try {
        await deleteProject(projectToDelete);
      } catch (error) {
        showAlert(i18n.t('common.error'), i18n.t('projects.deleteError'));
      }
    }
    setDeleteModalVisible(false);
    setProjectToDelete(null);
  };

  const handleRestore = (id: string) => {
    setProjectToRestore(id);
    setRestoreModalVisible(true);
  };

  const confirmRestore = async () => {
    if (projectToRestore) {
      try {
        await restoreProject(projectToRestore);
        showAlert(i18n.t('common.success'), i18n.t('projects.projectRestored'));
        // Redirigir a la lista de proyectos activos
        setShowDeleted(false);
        refreshProjects(searchText, true, true); // Limpiar lista al cambiar de contexto
      } catch (error) {
        showAlert(i18n.t('common.error'), i18n.t('projects.restoreError'));
      }
    }
    setRestoreModalVisible(false);
    setProjectToRestore(null);
  };

  const handleStart = (id: string) => {
    setProjectToStart(id);
    setStartModalVisible(true);
  };

  const confirmStart = async () => {
    if (projectToStart) {
      try {
        await startProject(projectToStart);
      } catch (error) {
        showAlert(i18n.t('common.error'), i18n.t('projects.startError'));
      }
    }
    setStartModalVisible(false);
    setProjectToStart(null);
  };

  const handlePressProject = (id: string) => {
    router.push({ pathname: '/(tabs)/[id]', params: { id } });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (refreshProjects) await refreshProjects(searchText, !showDeleted, false); // No limpiar en pull-to-refresh para mantener UX suave
    } catch (error) {
      console.error("Error refreshing projects:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshProjects, searchText, showDeleted]);

  // Manejar búsqueda
  const handleSearch = (text: string) => {
    setSearchText(text);
    
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      refreshProjects(text, !showDeleted, true); // Limpiar al buscar para feedback visual claro
    }, 500);
    setSearchTimer(timer);
  };

  const toggleShowDeleted = () => {
    const newValue = !showDeleted;
    setShowDeleted(newValue);
    refreshProjects(searchText, !newValue, true); // Limpiar lista al cambiar filtro (Activos <-> Eliminados)
  };

  const isNewProject = (dateString?: string) => {
    if (!dateString) return false;
    const created = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else if (projects.length === 0 && !refreshing) {
      fadeAnim.setValue(0);
    }
  }, [isLoading, projects.length, refreshing]);

  return (
    <View style={[styles.container, showDeleted && styles.containerDeleted]}>
      <View style={styles.header}>
        <Text style={styles.title}>{showDeleted ? i18n.t('projects.deletedProjects') : i18n.t('projects.title')}</Text>
        
        {/* Barra de Búsqueda */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#A0AEC0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={i18n.t('common.search')}
            value={searchText}
            onChangeText={handleSearch}
          />
          {hasPermission('PROJECT_DELETE') && (
            <Pressable 
              onPress={toggleShowDeleted} 
              style={[styles.filterButton, showDeleted && styles.filterButtonActive]}
            >
              <Feather 
                name={showDeleted ? "arrow-left" : "trash-2"} 
                size={20} 
                color={showDeleted ? "#FFFFFF" : "#718096"} 
              />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading && !refreshing && projects.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3182CE" />
        </View>
      ) : (
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <FlatList
        data={activeProjects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3182CE']} />
        }
        // Paginación
        onEndReached={loadMoreProjects}
        onEndReachedThreshold={0.5}
        ListFooterComponent={hasMoreProjects && projects.length > 0 ? <ActivityIndicator style={{ padding: 10 }} color="#3182CE" /> : null}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => handlePressProject(item.id)}>
            <View style={styles.cardContent}>
              <View style={styles.nameRow}>
                <Text style={styles.projectName}>{item.name}</Text>
                {isNewProject((item as any).createdAt) && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>{i18n.t('common.new')}</Text>
                  </View>
                )}
              </View>
              <View style={styles.addressContainer}>
                <Feather name="map-pin" size={14} color="#718096" />
                <Text style={styles.addressText}>{item.address || i18n.t('projects.noAddress')}</Text>
              </View>
            </View>
            
            <View style={styles.actions}>
              {showDeleted ? (
                <Pressable onPress={() => handleRestore(item.id)} style={styles.actionButton} hitSlop={10}>
                  <Feather name="refresh-ccw" size={20} color="#38A169" />
                </Pressable>
              ) : (
                <>
                  {item.status === 'Not Started' && (
                    <Pressable onPress={() => handleStart(item.id)} style={styles.actionButton} hitSlop={10}>
                      <Feather name="play-circle" size={20} color="#38A169" />
                    </Pressable>
                  )}
                  {hasPermission('PROJECT_DELETE') && (
                    <Pressable onPress={() => handleDelete(item.id)} style={styles.deleteButton} hitSlop={10}>
                      <Feather name="trash-2" size={20} color="#E53E3E" />
                    </Pressable>
                  )}
                </>
              )}
              <Feather name="chevron-right" size={24} color="#CBD5E0" />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{i18n.t('projects.noProjects')}</Text>
        }
      />
      </Animated.View>
      )}

      {/* Modal de Confirmación de Eliminación */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('projects.deleteTitle')}</Text>
            <Text style={styles.modalMessage}>{i18n.t('projects.deleteConfirmation')}</Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, styles.modalCancelBtn]} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.modalBtnText}>{i18n.t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalDeleteBtn]} onPress={confirmDelete}>
                <Text style={styles.modalDeleteBtnText}>{i18n.t('common.delete')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmación de Inicio */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={startModalVisible}
        onRequestClose={() => setStartModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('projects.startTitle')}</Text>
            <Text style={styles.modalMessage}>{i18n.t('projects.startConfirmation')}</Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, styles.modalCancelBtn]} onPress={() => setStartModalVisible(false)}>
                <Text style={styles.modalBtnText}>{i18n.t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalStartBtn]} onPress={confirmStart}>
                <Text style={styles.modalDeleteBtnText}>{i18n.t('common.start')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmación de Restauración */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={restoreModalVisible}
        onRequestClose={() => setRestoreModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('projects.restoreTitle')}</Text>
            <Text style={styles.modalMessage}>{i18n.t('projects.restoreConfirmation')}</Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, styles.modalCancelBtn]} onPress={() => setRestoreModalVisible(false)}>
                <Text style={styles.modalBtnText}>{i18n.t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalStartBtn]} onPress={confirmRestore}>
                <Text style={styles.modalDeleteBtnText}>{i18n.t('common.confirm')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFFFFF' },
  containerDeleted: { backgroundColor: '#FFF5F5' },
  header: { marginBottom: 24 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 16, color: '#1A202C' },
  listContent: { paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardContent: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  projectName: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', flexShrink: 1 },
  newBadge: { backgroundColor: '#3182CE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  newBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  addressContainer: { flexDirection: 'row', alignItems: 'center' },
  addressText: { fontSize: 14, color: '#718096', marginLeft: 6 },
  emptyText: { textAlign: 'center', color: '#718096', marginTop: 20, fontSize: 16 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginRight: 4,
  },
  actionButton: {
    padding: 8,
    marginRight: 4,
  },
  // Estilos Búsqueda
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#2D3748',
  },
  filterButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#E53E3E',
  },
  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#FFF',
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
    color: '#1A202C',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 24,
    color: '#4A5568',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  modalCancelBtn: { backgroundColor: '#EDF2F7' },
  modalDeleteBtn: { backgroundColor: '#E53E3E' },
  modalStartBtn: { backgroundColor: '#38A169' },
  modalBtnText: {
    color: '#4A5568',
    fontWeight: '600',
  },
  modalDeleteBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});