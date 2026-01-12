import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View } from 'react-native';
import { useCustomAlert } from '../../components/ui/CustomAlert';
import i18n from '../../constants/i18n';
import api from '../../services/api';

interface ProjectDocumentsProps {
  projectId: string;
  userRole?: string;
  projectStatus?: string;
  onViewDocument: (uri: string, name: string, type?: string) => void;
  onRefreshProjects?: () => void;
  onRefreshChecklist?: () => void;
  canEdit?: boolean;
  onAddDocument?: () => void;
  lastUpdate?: number;
  categories?: { id: string; name: string }[];
}

// Habilitar animaciones de layout en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ProjectDocuments({ projectId, userRole, projectStatus, onViewDocument, onRefreshProjects, onRefreshChecklist, canEdit = false, onAddDocument, lastUpdate, categories = [] }: ProjectDocumentsProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [allDocuments, setAllDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { showAlert, AlertComponent } = useCustomAlert();
  const [isExpanded, setIsExpanded] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 5;
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  // Usamos useCallback para estabilizar la función y evitar ejecuciones dobles innecesarias
  const fetchDocuments = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const response = await api.get(`/api/projects/${projectId}/files`);
      const data = response.data || {};
      
      // La API devuelve un objeto agrupado por fechas { "YYYY-MM-DD": [...] } o un array
      // Aplanamos los valores para obtener una lista única de archivos
      let filesList: any[] = [];
      if (data.data && Array.isArray(data.data)) {
         filesList = data.data; // Respuesta paginada estándar { data: [...], meta: ... }
      } else if (Array.isArray(data)) {
         filesList = data;
      } else {
         filesList = Object.values(data).flat();
      }
      
      const mappedDocuments = filesList.map((file: any) => ({
        id: file.attachmentId || file.id || file.url.split('/').pop(), // Usamos attachmentId si existe
        name: file.name,
        uri: file.url,
        type: file.fileType,
        date: file.date,
        source: file.source || 'PROJECT',
        sourceId: file.sourceId,
        category: file.category
      }));
      
      setAllDocuments(mappedDocuments);
      // La paginación y filtrado se manejan en el useEffect de abajo
      setPage(1); 
    } catch (error) {
      console.log('Error fetching documents:', error);
      // Mock data si falla la API para demostración
      // setDocuments([{ id: '1', name: 'Contrato.pdf', uri: '...', type: 'application/pdf', date: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Efecto para Filtrado y Paginación
  useEffect(() => {
    const filtered = allDocuments.filter(doc => 
      selectedCategory === 'ALL' || doc.category === selectedCategory
    );
    setDocuments(filtered.slice(0, page * LIMIT));
    setHasMore(filtered.length > page * LIMIT);
  }, [allDocuments, selectedCategory, page]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, lastUpdate]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
  };

  const handleUpload = async () => {
    if (projectStatus === 'Completed' || projectStatus === 'COMPLETED') {
      showAlert(i18n.t('documents.restricted'), i18n.t('documents.restrictedMessage'));
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Permitir cualquier archivo
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setIsUploading(true);

      const formData = new FormData();
      if (Platform.OS === 'web' && (asset as any).file) {
        formData.append('file', (asset as any).file);
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
        } as any);
      }

      // Asumimos endpoint POST /api/projects/{id}/attachment
      await api.post(`/api/projects/${projectId}/attachment`, formData, {
        headers: { 'Content-Type': Platform.OS === 'web' ? undefined : 'multipart/form-data' }
      });

      showAlert(i18n.t('common.success'), i18n.t('documents.success'));
      fetchDocuments();
    } catch (error) {
      console.error(error);
      showAlert(i18n.t('common.error'), i18n.t('documents.error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (doc: any) => {
    if (projectStatus === 'Completed' || projectStatus === 'COMPLETED') {
      showAlert(i18n.t('documents.restricted'), i18n.t('documents.deleteRestricted'));
      return;
    }
    showAlert(
      i18n.t('documents.deleteTitle'),
      i18n.t('documents.deleteMessage'),
      [
        { text: i18n.t('common.cancel'), style: "cancel" },
        { 
          text: i18n.t('common.delete'), 
          style: "destructive", 
          onPress: async () => {
            try {
              const { id: attachmentId, source, sourceId } = doc;

              if (source === 'CHECKLIST') {
                if (sourceId) {
                  await api.delete(`/api/checklist/${sourceId}/evidence/${attachmentId}`);
                  if (onRefreshChecklist) onRefreshChecklist();
                }
              } else if (source === 'BUDGET') {
                // En Budget, usamos el ID del gasto como attachmentId
                await api.delete(`/api/budgets/project/${projectId}/expense/${attachmentId}/attachment`);
              } else {
                // Default: PROJECT
                await api.delete(`/api/projects/${projectId}/attachment/${attachmentId}`);
                if (onRefreshProjects) await onRefreshProjects();
              }

              fetchDocuments();
            } catch (error) {
              console.error(error);
              showAlert(i18n.t('common.error'), i18n.t('documents.deleteError'));
            }
          }
        }
      ]
    );
  };

  const getIcon = (mimeType: string) => {
    const type = mimeType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'file-text';
    if (type.includes('image')) return 'image';
    return 'file';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={toggleExpand} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={styles.title}>{i18n.t('documents.title')}</Text>
          <Feather name={isExpanded ? "chevron-down" : "chevron-right"} size={24} color="#1A202C" style={{ marginLeft: 8 }} />
        </Pressable>
        {(userRole === 'ADMIN' || canEdit) && (
          <Pressable style={styles.addButton} onPress={onAddDocument || handleUpload} disabled={isUploading}>
            {isUploading ? <ActivityIndicator size="small" color="#3182CE" /> : <Feather name="plus" size={20} color="#3182CE" />}
            <Text style={styles.addText}>{isUploading ? i18n.t('documents.uploading') : i18n.t('projectDetail.add')}</Text>
          </Pressable>
        )}
      </View>

      {isExpanded && (
        <>
          {/* Filtros por Categoría */}
          {categories.length > 0 && (
            <View style={styles.filterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
                <Pressable 
                  style={[styles.filterChip, selectedCategory === 'ALL' && styles.filterChipActive]}
                  onPress={() => { setSelectedCategory('ALL'); setPage(1); }}
                >
                  <Text style={[styles.filterChipText, selectedCategory === 'ALL' && styles.filterChipTextActive]}>{i18n.t('common.all')}</Text>
                </Pressable>
                {categories.map(cat => (
                  <Pressable 
                    key={cat.id}
                    style={[styles.filterChip, selectedCategory === cat.name && styles.filterChipActive]}
                    onPress={() => { setSelectedCategory(cat.name); setPage(1); }}
                  >
                    <Text style={[styles.filterChipText, selectedCategory === cat.name && styles.filterChipTextActive]}>{cat.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {documents.length === 0 && !isLoading ? (
            <Text style={styles.emptyText}>{i18n.t('documents.empty')}</Text>
          ) : (
            <View style={styles.list}>
              {documents.map((doc) => (
                <Pressable key={doc.id} style={styles.docItem} onPress={() => onViewDocument(doc.uri, doc.name, doc.type)}>
                  <View style={styles.docIcon}>
                    <Feather name={getIcon(doc.type)} size={24} color="#4A5568" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                    <Text style={styles.docDate}>{new Date(doc.date || Date.now()).toLocaleDateString()}</Text>
                  </View>
                  {(userRole === 'ADMIN' || canEdit) && (
                    <Pressable style={styles.deleteButton} onPress={() => handleDelete(doc)}>
                      <Feather name="trash-2" size={18} color="#E53E3E" />
                    </Pressable>
                  )}
                </Pressable>
              ))}
            </View>
          )}
          
          {hasMore && (
            <Pressable style={styles.loadMoreButton} onPress={handleLoadMore} disabled={isLoading}>
              {isLoading ? <ActivityIndicator size="small" color="#3182CE" /> : <Text style={styles.loadMoreText}>{i18n.t('documents.loadMore')}</Text>}
            </Pressable>
          )}
        </>
      )}
      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24, paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', fontFamily: 'Inter-Bold', color: '#1A202C' },
  addButton: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#EBF8FF', borderRadius: 8 },
  addText: { marginLeft: 6, color: '#3182CE', fontWeight: '600', fontSize: 14, fontFamily: 'Inter-SemiBold' },
  emptyText: { color: '#A0AEC0', fontStyle: 'italic', textAlign: 'center', padding: 20, fontFamily: 'Inter-Regular' },
  filterContainer: { marginBottom: 12, flexDirection: 'row' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#EDF2F7', marginRight: 8 },
  filterChipActive: { backgroundColor: '#3182CE' },
  filterChipText: { fontSize: 12, color: '#4A5568' },
  filterChipTextActive: { color: '#FFF', fontWeight: 'bold' },
  list: { gap: 8 },
  docItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#EDF2F7' },
  docIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E2E8F0', borderRadius: 8, marginRight: 12 },
  docName: { fontSize: 16, color: '#2D3748', fontWeight: '500', fontFamily: 'Inter-Medium' },
  docDate: { fontSize: 12, color: '#718096', fontFamily: 'Inter-Regular' },
  deleteButton: { padding: 8 },
  loadMoreButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadMoreText: { color: '#3182CE', fontWeight: '600', fontSize: 14 },
});
