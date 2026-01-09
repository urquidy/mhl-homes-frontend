import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useCustomAlert } from '../../components/ui/CustomAlert';
import i18n from '../../constants/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { usePermission } from '../../hooks/usePermission';

// --- Componente Skeleton (Carga) ---
const SkeletonItem = ({ style }: { style: any }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[{ backgroundColor: '#EDF2F7', borderRadius: 4 }, style, { opacity }]} />;
};

const ProjectsSkeleton = () => {
  return (
    <View style={styles.container}>
      <SkeletonItem style={{ width: 200, height: 32, marginBottom: 24 }} />
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={styles.card}>
          <View style={{ flex: 1 }}>
            <SkeletonItem style={{ width: 150, height: 20, marginBottom: 8 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <SkeletonItem style={{ width: 16, height: 16, borderRadius: 8, marginRight: 6 }} />
              <SkeletonItem style={{ width: 200, height: 14 }} />
            </View>
          </View>
          <SkeletonItem style={{ width: 24, height: 24, borderRadius: 12 }} />
        </View>
      ))}
    </View>
  );
};

export default function ProjectsScreen() {
  const { projects, deleteProject, startProject, refreshProjects, isLoading } = useProjects();
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const router = useRouter();
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [startModalVisible, setStartModalVisible] = useState(false);
  const [projectToStart, setProjectToStart] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert, AlertComponent } = useCustomAlert();

  // Filtramos los proyectos activos (excluyendo los completados, si esa es la lógica deseada, o mostrando todos)
  // Asumiremos que "Activos" son todos los que no están archivados/borrados. 
  // Si quieres excluir 'Completado', descomenta el filtro.
  const activeProjects = projects; // .filter(p => p.status !== 'Completed');

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
      if (refreshProjects) await refreshProjects();
    } catch (error) {
      console.error("Error refreshing projects:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshProjects]);

  if (isLoading && !refreshing && projects.length === 0) {
    return <ProjectsSkeleton />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('projects.title')}</Text>
      <FlatList
        data={activeProjects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3182CE']} />
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => handlePressProject(item.id)}>
            <View style={styles.cardContent}>
              <Text style={styles.projectName}>{item.name}</Text>
              <View style={styles.addressContainer}>
                <Feather name="map-pin" size={14} color="#718096" />
                <Text style={styles.addressText}>{item.address || i18n.t('projects.noAddress')}</Text>
              </View>
            </View>
            
            <View style={styles.actions}>
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
              <Feather name="chevron-right" size={24} color="#CBD5E0" />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{i18n.t('projects.noProjects')}</Text>
        }
      />

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
      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 24, color: '#1A202C' },
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
  projectName: { fontSize: 18, fontWeight: 'bold', color: '#2D3748', marginBottom: 4 },
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