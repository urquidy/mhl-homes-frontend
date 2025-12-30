import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, Alert } from 'react-native';
import { useProjects } from '../../contexts/ProjectsContext';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import i18n from '../../constants/i18n';
import { useAuth } from '../../contexts/AuthContext';

export default function ProjectsScreen() {
  const { projects, deleteProject, startProject } = useProjects();
  const { user } = useAuth();
  const router = useRouter();
  
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [startModalVisible, setStartModalVisible] = useState(false);
  const [projectToStart, setProjectToStart] = useState<string | null>(null);

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
        Alert.alert('Error', 'No se pudo eliminar el proyecto. Por favor intenta de nuevo.');
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
        Alert.alert("Error", "No se pudo iniciar el proyecto.");
      }
    }
    setStartModalVisible(false);
    setProjectToStart(null);
  };

  const handlePressProject = (id: string) => {
    router.push({ pathname: '/(tabs)/[id]', params: { id } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('projects.title')}</Text>
      <FlatList
        data={activeProjects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
              {user?.role === 'Admin' && (
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
            <Text style={styles.modalTitle}>Eliminar Proyecto</Text>
            <Text style={styles.modalMessage}>¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.</Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, styles.modalCancelBtn]} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalDeleteBtn]} onPress={confirmDelete}>
                <Text style={styles.modalDeleteBtnText}>Eliminar</Text>
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
            <Text style={styles.modalTitle}>Iniciar Proyecto</Text>
            <Text style={styles.modalMessage}>¿Estás seguro de que deseas iniciar este proyecto? El estado cambiará a "En Progreso" y se registrará la fecha de inicio.</Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, styles.modalCancelBtn]} onPress={() => setStartModalVisible(false)}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalStartBtn]} onPress={confirmStart}>
                <Text style={styles.modalDeleteBtnText}>Iniciar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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