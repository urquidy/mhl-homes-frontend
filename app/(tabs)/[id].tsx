import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker'; // Importar DocumentPicker
import * as FileSystem from 'expo-file-system/legacy'; // Importar FileSystem Legacy
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { default as React, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, LayoutAnimation, LayoutChangeEvent, Modal, PanResponder, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, UIManager, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { WebView } from 'react-native-webview';
import AspectRatioModal from '../../components/project-detail/AspectRatioModal';
import DocumentUploadModal from '../../components/project-detail/DocumentUploadModal';
import EditProjectModal from '../../components/project-detail/EditProjectModal';
import EvidenceUploadModal from '../../components/project-detail/EvidenceUploadModal';
import HistoryModal from '../../components/project-detail/HistoryModal';
import NewTaskModal, { NewTaskData } from '../../components/project-detail/NewTaskModal';
import PlanUploadModal from '../../components/project-detail/PlanUploadModal';
import ProjectDocuments from '../../components/project-detail/ProjectDocuments';
import TaskDateModal from '../../components/project-detail/TaskDateModal';
import { useCustomAlert } from '../../components/ui/CustomAlert';
import ItemDetailModal from '../../components/ui/ItemDetailModal';
import i18n from '../../constants/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectsContext';
import { usePermission } from '../../hooks/usePermission';
import api from '../../services/api';
import { ChecklistItem } from '../../types';

const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

// Habilitar animaciones de layout en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Función auxiliar para calcular dimensiones ajustadas (Fit) ---
const getFittedDimensions = (containerW: number, containerH: number, imgRatio: number) => {
  if (!imgRatio || !containerW || !containerH) return { width: containerW, height: containerH };
  const containerRatio = containerW / containerH;
  // Si el contenedor es más ancho que la imagen, ajustamos por alto.
  // Si la imagen es más ancha que el contenedor, ajustamos por ancho.
  return containerRatio > imgRatio
    ? { width: containerH * imgRatio, height: containerH } 
    : { width: containerW, height: containerW / imgRatio };
};

// Función para actualizar el proyecto con imagen (PUT)
const updateProjectWithFile = async (id: string, projectData: any, imageFile: { uri: string, name: string, type: string, blob?: Blob } | null, onProgress?: (percent: number) => void, signal?: AbortSignal) => {
  const formData = new FormData();

  // 1. Project Data: Blob para application/json
  if (Platform.OS === 'web') {
    const projectBlob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    formData.append('project', projectBlob as any);
  } else {
    // Solución para error 415: Enviar JSON como Data URI para forzar header application/json
    const json = JSON.stringify(projectData);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    formData.append('project', {
      uri: `data:application/json;base64,${b64}`,
      name: 'project.json',
      type: 'application/json'
    } as any);
  }

  // 2. File
  if (imageFile) {
    if (Platform.OS === 'web' && imageFile.blob) {
      formData.append('file', imageFile.blob, imageFile.name);
    } else {
      formData.append('file', {
        uri: imageFile.uri,
        name: imageFile.name,
        type: imageFile.type,
      } as any);
    }
  }

  return await api.put(`/api/projects/${id}`, formData, {
    headers: { 'Content-Type': Platform.OS === 'web' ? undefined : 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
    signal // Pasamos la señal de aborto a Axios
  });
};

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

const ProjectDetailSkeleton = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 80 }}>
        {/* Header Title & Edit Button */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <SkeletonItem style={{ width: '60%', height: 32 }} />
          <SkeletonItem style={{ width: 32, height: 32, borderRadius: 16 }} />
        </View>
        
        {/* Client */}
        <SkeletonItem style={{ width: '40%', height: 20, marginBottom: 8 }} />
        
        {/* Address */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <SkeletonItem style={{ width: 16, height: 16, borderRadius: 8, marginRight: 8 }} />
          <SkeletonItem style={{ width: '70%', height: 16 }} />
        </View>

        {/* Status Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 32 }}>
          <SkeletonItem style={{ width: 100, height: 20, marginRight: 12 }} />
          <SkeletonItem style={{ width: 80, height: 28, borderRadius: 12 }} />
        </View>

        {/* Progress Bar */}
        <View style={{ marginBottom: 24 }}>
          <SkeletonItem style={{ width: '100%', height: 10, borderRadius: 5, marginBottom: 4 }} />
          <SkeletonItem style={{ width: 100, height: 14, alignSelf: 'flex-end' }} />
        </View>

        {/* Documents Section */}
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <SkeletonItem style={{ width: 150, height: 24 }} />
            <SkeletonItem style={{ width: 80, height: 32, borderRadius: 8 }} />
          </View>
          {[1, 2].map(i => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, padding: 12, borderWidth: 1, borderColor: '#EDF2F7', borderRadius: 8 }}>
              <SkeletonItem style={{ width: 40, height: 40, borderRadius: 8, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <SkeletonItem style={{ width: '60%', height: 16, marginBottom: 4 }} />
                <SkeletonItem style={{ width: '30%', height: 12 }} />
              </View>
            </View>
          ))}
        </View>

        {/* Plan Section */}
        <View style={{ marginTop: 16 }}>
          <SkeletonItem style={{ width: 180, height: 24, marginBottom: 12 }} />
          <SkeletonItem style={{ width: '100%', height: 300, borderRadius: 12 }} />
        </View>
      </ScrollView>
    </View>
  );
};

export default function ProjectDetailScreen() {
  // Obtenemos el 'id' de la URL. Ej: /project/1 -> id = '1'
  const { id, taskId } = useLocalSearchParams<{ id: string; taskId?: string }>();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { getProjectById, getChecklistByProjectId, toggleChecklistItem, updateChecklistEvidence, addChecklistItem, updateProjectPlan, addChecklistEvidence, deleteChecklistEvidence, addChecklistComment, deleteChecklistItem, startProject, isLoading, fetchProjectChecklist, clearProjectChecklist, refreshProjects, addProjectBlueprint } = useProjects();
  const { user, token } = useAuth();
  const { hasPermission } = usePermission();

  const projectId = Array.isArray(id) ? id[0] : (id ?? '');
  const project = projectId ? getProjectById(projectId) : undefined;
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [blueprintChecklistItems, setBlueprintChecklistItems] = useState<ChecklistItem[]>([]);


  const totalTasks = checklistItems.length;
  const completedTasks = checklistItems.filter(i => i.completed).length;
  const isAllTasksCompleted = totalTasks > 0 && totalTasks === completedTasks;
  
  const [viewingImageSource, setViewingImageSource] = useState<{ uri: string; headers?: any } | null>(null);
  const [planImageSource, setPlanImageSource] = useState<any>(null);
  const [planType, setPlanType] = useState<'image' | 'pdf'>('image');
  const [viewingMediaType, setViewingMediaType] = useState<'image' | 'pdf'>('image');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  // Cargar usuarios disponibles para los modales (Editar Proyecto, Nueva Tarea)
  useEffect(() => {
    const fetchUsersAndRoles = async () => {
      if (!token) return;
      try {
        const [usersRes, rolesRes] = await Promise.all([
          api.get('/api/users'),
          api.get('/api/roles')
        ]);
        const users = usersRes.data || [];
        const roles = rolesRes.data || [];
        setAvailableUsers(users.map((u: any) => ({
          ...u,
          role: roles.find((r: any) => r.id === u.role)?.name || u.role
        })));
      } catch (error) {
        console.error('Error fetching users/roles:', error);
      }
    };
    fetchUsersAndRoles();
  }, [token]);

  const [blueprintPages, setBlueprintPages] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Estados para Grupos de Planos
  const [blueprintGroups, setBlueprintGroups] = useState<Record<string, any[]>>({});
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(i18n.t('common.architectural'));

  // Cache para las imágenes de los planos (evitar recargas al paginar)
  const blueprintCache = useRef<Record<string, { source: any, type: 'image' | 'pdf', aspectRatio?: number }>>({});

  // Estados para el progreso de subida
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isEvidenceUploading, setIsEvidenceUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [refreshing, setRefreshing] = useState(false);
  // Estados para Catálogo y Drag & Drop
  const [catalogGroups, setCatalogGroups] = useState<{id: string, name: string, items: {id: string, name: string}[]}[]>([]);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [draggedItem, setDraggedItem] = useState<{ text: string, x: number, y: number } | null>(null);
  const mapRef = useRef<View>(null);
  const [mapBounds, setMapBounds] = useState<{x: number, y: number, w: number, h: number} | null>(null);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filterSearchText, setFilterSearchText] = useState('');
  const [isAspectRatioModalVisible, setIsAspectRatioModalVisible] = useState(false);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isEditProjectModalVisible, setIsEditProjectModalVisible] = useState(false);
  const [isAddGroupModalVisible, setIsAddGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [uploadMode, setUploadMode] = useState<'replace' | 'append' | 'newGroup'>('replace');
  const [isStepsExpanded, setIsStepsExpanded] = useState(true);
  const [collapsedStepGroups, setCollapsedStepGroups] = useState<Record<string, boolean>>({});
  const [isBlueprintStepsExpanded, setIsBlueprintStepsExpanded] = useState(true);
  const [collapsedBlueprintStepGroups, setCollapsedBlueprintStepGroups] = useState<Record<string, boolean>>({});
  
  // Estados para Documentos
  const [isDocModalVisible, setIsDocModalVisible] = useState(false);
  const [docCategories, setDocCategories] = useState<{id: string, name: string}[]>([]);
  const [docsLastUpdate, setDocsLastUpdate] = useState(Date.now());

  // Fetch Document Categories
  useEffect(() => {
    if (token) {
      api.get('/api/catalogs/type/DOCUMENT_CATEGORY')
        .then(res => setDocCategories(res.data || []))
        .catch(err => console.error('Error fetching doc categories:', err));
    }
  }, [token]);

  const handleDocumentUpload = async (data: { name: string; category: string; file: any }) => {
    // Preparar FormData para subida
    const formData = new FormData();
    
    // Append file
    if (Platform.OS === 'web' && data.file.file) {
        formData.append('file', data.file.file, data.file.name);
    } else {
        formData.append('file', {
            uri: data.file.uri,
            name: data.file.name,
            type: data.file.mimeType || 'application/pdf',
        } as any);
    }

    // Append metadata
    formData.append('name', data.name);
    // Buscar el nombre de la categoría usando el ID seleccionado para enviarlo como texto
    const categoryName = docCategories.find(c => c.id === data.category)?.name || data.category;
    formData.append('category', categoryName);

    await api.post(`/api/projects/${projectId}/attachment`, formData, {
        headers: { 'Content-Type': Platform.OS === 'web' ? undefined : 'multipart/form-data' }
    });
    
    setDocsLastUpdate(Date.now());
    showAlert(i18n.t('common.success'), i18n.t('documents.success'));
  };

  const uploadModeRef = useRef<'replace' | 'append' | 'newGroup'>('replace');
  const { showAlert, AlertComponent } = useCustomAlert();
  const [pan, setPan] = useState({ x: 0, y: 0 }); // Estado para la posición (Pan)
  const [isInteracting, setIsInteracting] = useState(false); // Estado para bloquear el scroll principal
  const [containerWidth, setContainerWidth] = useState(0);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  const initialTaskHandled = useRef(false);
  // Animación para la altura del panel del catálogo
  const panelHeight = useRef(new Animated.Value(250)).current;
  const lastPanelHeight = useRef(250);

  const panelPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Iniciar gesto
      },
      onPanResponderMove: (evt, gestureState) => {
        // Arrastrar hacia arriba (dy negativo) aumenta la altura
        let newHeight = lastPanelHeight.current - gestureState.dy;
        if (newHeight < 150) newHeight = 150;
        if (newHeight > 600) newHeight = 600;
        panelHeight.setValue(newHeight);
      },
      onPanResponderRelease: (evt, gestureState) => {
        let newHeight = lastPanelHeight.current - gestureState.dy;
        if (newHeight < 150) newHeight = 150;
        if (newHeight > 600) newHeight = 600;
        lastPanelHeight.current = newHeight;
      }
    })
  ).current;

  // Ref para controlar la cancelación de la subida
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // Fetch de Blueprints (Páginas convertidas)
  const fetchBlueprints = useCallback(async () => {
    if (!projectId || !token) return;
    try {
      const response = await api.get(`/api/projects/${projectId}`);
      const data = response.data || {};
      
      if (data.blueprints && Array.isArray(data.blueprints) && data.blueprints.length > 0) {
        // Agrupar por groupName
        const groups: Record<string, any[]> = {};
        const names: Set<string> = new Set();
        const defaultName = i18n.t('common.architectural');

        data.blueprints.forEach((bp: any) => {
          let gName = bp.groupName;
          // Normalizar MAIN_BLUEPRINT o null al nombre por defecto (Arquitectónico)
          if (!gName || gName === 'MAIN_BLUEPRINT') {
            gName = defaultName;
          }
          if (!groups[gName]) {
            groups[gName] = [];
            names.add(gName);
          }
          groups[gName].push(bp);
        });

        // Ordenar páginas dentro de cada grupo
        Object.keys(groups).forEach(key => {
          groups[key].sort((a: any, b: any) => (a.pageNumber || 0) - (b.pageNumber || 0));
        });

        setBlueprintGroups(groups);
        // Asegurar que "Arquitectónico" esté primero si existe
        const sortedNames = Array.from(names).sort((a, b) => a === defaultName ? -1 : b === defaultName ? 1 : a.localeCompare(b));
        setGroupNames(sortedNames);
      } else {
        setBlueprintGroups({});
        setGroupNames([]);
        setBlueprintPages([]);
      }
    } catch (error) {
      console.error("Error fetching blueprints:", error);
    }
  }, [projectId, token]);

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  // Actualizar páginas cuando cambia el grupo seleccionado
  useEffect(() => {
    // Cuando cambian los datos de los grupos, actualizamos las páginas del grupo actual
    // sin resetear la página actual, para no perder la navegación del usuario.
    if (blueprintGroups[selectedGroup]) {
      setBlueprintPages(blueprintGroups[selectedGroup]);
    } else if (groupNames.length > 0) {
      // Si el grupo seleccionado ya no es válido (ej. se borró), vamos al primero
      setSelectedGroup(groupNames[0]);
    } else {
      setBlueprintPages([]);
    }
  }, [blueprintGroups, groupNames, selectedGroup]);
  
  // Reseteamos a la página 0 solo cuando el usuario cambia de grupo explícitamente.
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedGroup]);

  // Efecto para abrir tarea específica desde notificación
  useEffect(() => {
    if (taskId && checklistItems.length > 0 && !initialTaskHandled.current) {
      const task = checklistItems.find(t => t.id === taskId);
      if (task) {
        if (task.blueprintId && blueprintPages.length > 0) {
          const pageIndex = blueprintPages.findIndex(p => p.id === task.blueprintId);
          if (pageIndex !== -1 && pageIndex !== currentPage) setCurrentPage(pageIndex);
        }
        setSelectedItemId(taskId);
        initialTaskHandled.current = true;
      }
    }
  }, [taskId, checklistItems, blueprintPages]);

  // Cargar la imagen del plano con manejo especial para Web (Blob) y Mobile (Headers)
  useEffect(() => {
    const loadPlanImage = async () => {
      // Priorizar páginas del blueprint si existen, sino usar el plan original
      let uri = blueprintPages.length > 0 ? blueprintPages[currentPage]?.uri : project?.architecturalPlanUri;

      if (!uri) {
        setPlanImageSource(null);
        return;
      }

      // 1. Verificar Caché: Si ya tenemos esta URI procesada, la usamos directo
      if (blueprintCache.current[uri]) {
        const cached = blueprintCache.current[uri];
        setPlanImageSource(cached.source);
        setPlanType(cached.type);
        if (cached.aspectRatio) setImageAspectRatio(cached.aspectRatio);
        return; // Salimos para no activar el spinner ni hacer fetch
      }

      setIsImageLoading(true);

      // Si es local, usar directo
      if (uri.startsWith('file') || uri.startsWith('content') || uri.startsWith('blob')) {
        setPlanImageSource({ uri });
        // En local dejamos que onLoadEnd desactive el spinner (o si es muy rápido)
        return;
      }

      // Construir URL completa
      let finalUri = uri;
      if (!uri.startsWith('http')) {
        // Fallback para desarrollo local en móvil
        const defaultBaseURL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8080' : 'http://192.168.100.59:8080');
        const baseURL = api.defaults.baseURL || defaultBaseURL;
        if (!uri.includes('/')) {
          finalUri = `${baseURL}/api/files/${uri}`;
        } else {
          finalUri = `${baseURL}${uri.startsWith('/') ? '' : '/'}${uri}`;
        }
      }

      if (Platform.OS === 'web') {
        try {
          const response = await fetch(finalUri, { headers: { Authorization: `Bearer ${token}` } });
          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const source = { uri: blobUrl };
            
            let type: 'image' | 'pdf' = 'image';
            let ratio = 1.5;

            if (blob.type === 'application/pdf') {
              type = 'pdf';
              ratio = 1.5;
            } else {
              type = 'image';
              // En Web calculamos el aspect ratio aquí
              Image.getSize(blobUrl, (width, height) => {
                if (height > 0) {
                  ratio = width / height;
                  setImageAspectRatio(ratio);
                  // Actualizar caché con el ratio real cuando esté listo
                  if (blueprintCache.current[uri]) blueprintCache.current[uri].aspectRatio = ratio;
                }
              }, (err) => console.error("Error getting image size:", err));
            }

            setPlanImageSource(source);
            setPlanType(type);
            if (type === 'pdf') setImageAspectRatio(ratio);
            
            // Guardar en caché
            blueprintCache.current[uri] = { source, type, aspectRatio: type === 'pdf' ? 1.5 : undefined };
          }
        } catch (e) { console.error("Error loading plan:", e); } finally {
          setIsImageLoading(false);
        }
      } else {
        const source = { uri: finalUri, headers: { Authorization: `Bearer ${token}` } };
        setPlanImageSource(source);
        
        let type: 'image' | 'pdf' = 'image';
        // Detectar PDF por extensión en Native
        if (finalUri.toLowerCase().endsWith('.pdf')) {
          type = 'pdf';
          setImageAspectRatio(1.5);
        } else {
          type = 'image';
        }
        setPlanType(type);

        // Guardar en caché (Native maneja su propio caché de disco, aquí guardamos la configuración)
        blueprintCache.current[uri] = { source, type, aspectRatio: type === 'pdf' ? 1.5 : undefined };
      }
    };
    
    if (token) loadPlanImage();

    // Limpiar la imagen al desmontar o cambiar de proyecto para evitar que se vea la anterior
    return () => {
      // NO limpiamos setPlanImageSource(null) para evitar parpadeo al cambiar de página
      setIsImageLoading(false);
    };
  }, [project?.architecturalPlanUri, token, blueprintPages, currentPage]);

  // Cargar Checklist del Proyecto al entrar
  useEffect(() => {
    if (projectId && token) {
      fetchProjectChecklist(projectId);
    }
    // Limpiar checklist al salir del proyecto para evitar datos stale
    return () => {
      if (projectId) clearProjectChecklist(projectId);
    };
  }, [projectId, token]);

  useEffect(() => {
    const allChecklistItems = getChecklistByProjectId(projectId) || [];
    const blueprintItems = allChecklistItems.filter(item => item.blueprintId);
    const regularItems = allChecklistItems.filter(item => !item.blueprintId);
    
    setBlueprintChecklistItems(blueprintItems);
    setChecklistItems(regularItems);
  }, [getChecklistByProjectId, projectId]);


  // Cargar Catálogo de Pasos
  useEffect(() => {
    if (token) {
      api.get('/api/project-steps/tree')
        .then(res => {
          const tree = res.data || [];
          const groups: {id: string, name: string, items: {id: string, name: string}[]}[] = [];

          // Función recursiva para extraer solo los 'STEP' del árbol
          const traverse = (nodes: any[]) => {
            nodes.forEach(node => {
              if (node.type === 'CATEGORY') {
                const steps = node.children?.filter((c: any) => c.type === 'STEP').map((c: any) => ({ id: c.id, name: c.name })) || [];
                if (steps.length > 0) {
                  groups.push({ id: node.id, name: node.name, items: steps });
                }
                if (node.children && Array.isArray(node.children)) traverse(node.children);
              } else if (node.children && Array.isArray(node.children)) {
                traverse(node.children);
              }
            });
          };

          traverse(tree);
          setCatalogGroups(groups);
        })
        .catch(err => console.log('Error fetching catalog:', err));
    }
  }, [token]);

  // Filtrar catálogo: Excluir items que ya están en el checklist
  const allChecklistItems = useMemo(() => [...checklistItems, ...blueprintChecklistItems], [checklistItems, blueprintChecklistItems]);

  const filteredCatalogGroups = useMemo(() => {
    return catalogGroups.map(group => ({
      ...group,
      items: group.items.filter(catItem => 
        !allChecklistItems.some(checkItem => checkItem.text === catItem.name)
      )
    })).filter(group => group.items.length > 0);
  }, [catalogGroups, allChecklistItems]);

  // Items filtrados por categoría seleccionada (para el mapa y la lista)
  const filteredChecklistItems = useMemo(() => {
    let items = blueprintChecklistItems;

    // Filtrar por página del plano (si existen blueprints paginados)
    if (blueprintPages.length > 0) {
      const currentBpId = blueprintPages[currentPage]?.id;
      if (currentBpId) {
        items = items.filter(item => item.blueprintId === currentBpId);
      }
    }

    if (selectedCategoryFilter) items = items.filter(item => item.categoryId === selectedCategoryFilter);
    return items;
  }, [blueprintChecklistItems, selectedCategoryFilter, blueprintPages, currentPage]);

  // Helper para obtener color de categoría
  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return null;
    const index = catalogGroups.findIndex(g => g.id === categoryId);
    if (index === -1) return null;
    // Paleta de colores distintivos para categorías
    const colors = ['#3182CE', '#805AD5', '#D69E2E', '#D53F8C', '#319795', '#DD6B20', '#00B5D8', '#718096'];
    return colors[index % colors.length];
  };

  const toggleGroupCollapse = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleStepGroupCollapse = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedStepGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Helper para construir la fuente de la imagen (URI + Headers)
  const getPlanImageSource = (uri: string | null | undefined) => {
    if (!uri) return null;
    
    // Si es una URI local (seleccionada del dispositivo), la usamos directamente
    if (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('blob:')) {
      return { uri };
    }
    
    let finalUri = uri;
    if (!uri.startsWith('http')) {
      // Si viene del backend, concatenamos a la baseURL
      let baseURL = process.env.EXPO_PUBLIC_API_URL || api.defaults.baseURL;
      
      // Fallback inteligente si no hay configuración
      if (!baseURL) {
        const devHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
        baseURL = `http://${devHost}:8080`;
      }

      const cleanBase = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
      const cleanPath = uri.startsWith('/') ? uri : `/${uri}`;
      // Si no parece una ruta completa, asumimos que es un ID para /api/files
      finalUri = !uri.includes('/') ? `${cleanBase}/api/files/${uri}` : `${cleanBase}${cleanPath}`;
    }
    
    // FIX: Reemplazar localhost por 10.0.2.2 en Android para cualquier URL resultante
    if (Platform.OS === 'android' && finalUri.includes('localhost')) {
      finalUri = finalUri.replace('localhost', '10.0.2.2');
    }

    return {
      uri: finalUri,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    };
  };
  
  // Estados para agregar items en el plano
  const [imageLayout, setImageLayout] = useState<{ width: number; height: number } | null>(null);
  const [newItemModal, setNewItemModal] = useState<{ visible: boolean; x: number; y: number; width?: number; height?: number; initialText?: string; initialStepId?: string | null; initialCategoryId?: string | null }>({ visible: false, x: 0, y: 0 });
  
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [drawingShape, setDrawingShape] = useState<'rectangle' | 'circle' | 'pencil' | 'pin'>('rectangle');
  const [zoomScale, setZoomScale] = useState(1);
  const [currentPencilPath, setCurrentPencilPath] = useState<string>('');
  const [currentPencilPathDisplay, setCurrentPencilPathDisplay] = useState<string>(''); // Nueva variable para dibujar en píxeles (sin desfase)
  const [pencilColor, setPencilColor] = useState('#3182CE'); // Color por defecto (Azul)
  
  // Estados para el Modal de Detalle de Item
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const selectedItem = selectedItemId ? allChecklistItems.find(i => i.id === selectedItemId) : null;
  const [startModalVisible, setStartModalVisible] = useState(false);

  // Refs para acceder al estado actualizado dentro del PanResponder (que no se recrea)
  const isDrawingModeRef = useRef(isDrawingMode);
  const currentDrawingRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const imageLayoutRef = useRef<{ width: number; height: number } | null>(null);
  const drawingShapeRef = useRef(drawingShape);
  
  const panRef = useRef({ x: 0, y: 0 });
  const zoomScaleRef = useRef(1);
  const dragStartRef = useRef({ x: 0, y: 0 }); // Ref para guardar el inicio del arrastre
  const drawingStartRef = useRef({ x: 0, y: 0 }); // Ref para guardar el inicio del dibujo (coordenada touch)

  // Sincronizar refs con el estado
  useEffect(() => { isDrawingModeRef.current = isDrawingMode; }, [isDrawingMode]);
  useEffect(() => { 
    if (imageLayout) imageLayoutRef.current = imageLayout; 
  }, [imageLayout]);
  // Sincronizar refs críticos para el dibujo
  useEffect(() => { drawingShapeRef.current = drawingShape; }, [drawingShape]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomScaleRef.current = zoomScale; }, [zoomScale]);
  useEffect(() => { if (imageLayout) imageLayoutRef.current = imageLayout; }, [imageLayout]);

  // Obtener dimensiones reales de la imagen para evitar distorsión
  // Se maneja ahora en el evento onLoad de la imagen para asegurar que el token viaje

  // --- NUEVO: Centrar la imagen cuando cargue o cambie el tamaño del contenedor ---
  const CONTAINER_HEIGHT = Platform.OS === 'web' ? 600 : 300;
  
  useEffect(() => {
    if (containerWidth && imageAspectRatio) {
      const { width, height } = getFittedDimensions(containerWidth, CONTAINER_HEIGHT, imageAspectRatio);
      // Centrar inicialmente
      setPan({
        x: (containerWidth - width) / 2,
        y: (CONTAINER_HEIGHT - height) / 2,
      });
      setZoomScale(1);
    }
  }, [containerWidth, imageAspectRatio]);

  // Actualizar límites del mapa para el Drop
  const updateMapBounds = () => {
    mapRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setMapBounds({ x: pageX, y: pageY, w: width, h: height });
    });
  };

  // 1. PanResponder para MOVER (Panning) - Se adjunta al Viewport
  const panResponder = useRef(
    PanResponder.create({
      // Solo permitir mover si NO estamos dibujando
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return !isDrawingModeRef.current && (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5);
      },
      
      onPanResponderGrant: (evt, gestureState) => {
        setIsInteracting(true); // Bloquear scroll principal
        if (Platform.OS === 'web') evt.preventDefault();

        // Guardamos el punto de inicio del arrastre
        dragStartRef.current = { x: panRef.current.x, y: panRef.current.y };
      },
      
      onPanResponderMove: (evt, gestureState) => {
        if (!isDrawingModeRef.current) {
          const startX = dragStartRef.current.x;
          const startY = dragStartRef.current.y;
          setPan({
            x: startX + gestureState.dx,
            y: startY + gestureState.dy
          });
        }
      },
      
      onPanResponderRelease: (evt, gestureState) => {
        setIsInteracting(false); // Reactivar scroll principal
      },
      onPanResponderTerminate: () => setIsInteracting(false),
    })
  ).current;

  // 2. PanResponder para DIBUJAR (Drawing) - Se adjunta al Overlay
  const drawingResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        setIsInteracting(true);
        if (Platform.OS === 'web') evt.preventDefault();

        // Capturamos la coordenada inicial exacta relativa al Overlay
        let locationX = evt.nativeEvent.locationX;
        let locationY = evt.nativeEvent.locationY;

        // FIX WEB: Usar offsetX/offsetY (Estándar Mouse) para máxima precisión relativa al target (Overlay)
        if (Platform.OS === 'web') {
          if ('offsetX' in evt.nativeEvent) {
            locationX = (evt.nativeEvent as any).offsetX;
            locationY = (evt.nativeEvent as any).offsetY;
          } else if ('layerX' in evt.nativeEvent) {
            locationX = (evt.nativeEvent as any).layerX;
            locationY = (evt.nativeEvent as any).layerY;
          }
        }

        drawingStartRef.current = { x: locationX, y: locationY };
        
        // Validación de seguridad para evitar división por 0 o 1 (dimensiones no cargadas)
        if (baseDimsRef.current.width <= 1 || baseDimsRef.current.height <= 1) return;

        // Calcular coordenadas relativas a la imagen
        const imgX = (locationX - panRef.current.x) / zoomScaleRef.current;
        const imgY = (locationY - panRef.current.y) / zoomScaleRef.current;

        if (isNaN(imgX) || isNaN(imgY)) return;

        if (drawingShapeRef.current === 'pencil') {
          // 1. Vista Previa (Píxeles): Para que el usuario vea el trazo exactamente donde toca
          const startPathDisplay = `M ${imgX.toFixed(2)} ${imgY.toFixed(2)}`;
          setCurrentPencilPathDisplay(startPathDisplay);

          // 2. Guardado (Porcentajes): Para que funcione en todos los dispositivos al guardar
          // Usamos toFixed(4) para evitar notación científica o precisión excesiva que infle el string
          const pctX = (imgX / baseDimsRef.current.width) * 100;
          const pctY = (imgY / baseDimsRef.current.height) * 100;
          const startPath = `M ${pctX.toFixed(4)} ${pctY.toFixed(4)}`;
          setCurrentPencilPath(startPath);
        } else {
          const startDrawing = { x: imgX, y: imgY, width: 0, height: 0 };
          currentDrawingRef.current = startDrawing;
          setCurrentDrawing(startDrawing);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        // Calculamos la posición actual sumando el desplazamiento (dx, dy) al punto inicial
        const locationX = drawingStartRef.current.x + gestureState.dx;
        const locationY = drawingStartRef.current.y + gestureState.dy;
        
        if (baseDimsRef.current.width <= 1 || baseDimsRef.current.height <= 1) return;

        const imgX = (locationX - panRef.current.x) / zoomScaleRef.current;
        const imgY = (locationY - panRef.current.y) / zoomScaleRef.current;

        if (isNaN(imgX) || isNaN(imgY)) return;

        if (drawingShapeRef.current === 'pencil') {
          // Actualizar ambos caminos
          setCurrentPencilPathDisplay(prev => `${prev} L ${imgX.toFixed(2)} ${imgY.toFixed(2)}`);

          const pctX = (imgX / baseDimsRef.current.width) * 100;
          const pctY = (imgY / baseDimsRef.current.height) * 100;
          setCurrentPencilPath(prev => `${prev} L ${pctX.toFixed(4)} ${pctY.toFixed(4)}`);
        } else if (currentDrawingRef.current) {
          const startX = currentDrawingRef.current.x;
          const startY = currentDrawingRef.current.y;
          currentDrawingRef.current = {
            ...currentDrawingRef.current,
            width: imgX - startX,
            height: imgY - startY
          };
          setCurrentDrawing({ ...currentDrawingRef.current });
        }
      },
      onPanResponderRelease: () => {
        setIsInteracting(false);
        const layout = imageLayoutRef.current;
        if (!layout) return;

        if (drawingShapeRef.current === 'pencil') {
          setNewItemModal({ visible: true, x: 0, y: 0, width: 0, height: 0 });
        } else {
          const drawing = currentDrawingRef.current;
          if (drawing) {
            // Normalizar dimensiones
            const finalX = drawing.width < 0 ? drawing.x + drawing.width : drawing.x;
            const finalY = drawing.height < 0 ? drawing.y + drawing.height : drawing.y;
            const finalW = Math.abs(drawing.width);
            const finalH = Math.abs(drawing.height);

            // Convertir a porcentajes
              // Ajustamos por zoomScale porque layout.width es el ancho zoomeado, pero finalX es base.
              const xPct = ((finalX * zoomScaleRef.current) / layout.width) * 100;
              const yPct = ((finalY * zoomScaleRef.current) / layout.height) * 100;
              const wPct = ((finalW * zoomScaleRef.current) / layout.width) * 100;
              const hPct = ((finalH * zoomScaleRef.current) / layout.height) * 100;

            // Si es 'pin', forzamos que sea un punto (sin ancho/alto), o si el dibujo fue muy pequeño (tap)
            const isPoint = drawingShapeRef.current === 'pin' || (finalW < (10 / zoomScaleRef.current) && finalH < (10 / zoomScaleRef.current));

            setNewItemModal({ visible: true, x: xPct, y: yPct, width: isPoint ? undefined : wPct, height: isPoint ? undefined : hPct });
          }
        }
        // MODIFICADO: No limpiamos el dibujo aquí para que persista mientras el modal está abierto.
        // Se limpiará explícitamente al guardar o cancelar.
        setIsDrawingMode(false);
      },
      onPanResponderTerminate: () => setIsInteracting(false),
    })
  ).current;

  // 3. PanResponder para ITEMS DEL CATÁLOGO (Drag & Drop)
  const createCatalogItemResponder = (item: { id: string, name: string }, groupId: string) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt, gestureState) => {
      // Actualizar límites del mapa al iniciar arrastre por si hubo scroll
      updateMapBounds();

      // Minimizar el panel automáticamente para ver mejor el plano
      Animated.timing(panelHeight, {
        toValue: 150,
        duration: 300,
        useNativeDriver: false,
      }).start();
      lastPanelHeight.current = 150;

      // Mostrar el "fantasma"
      const { pageX, pageY } = evt.nativeEvent;
      setDraggedItem({ text: item.name, x: pageX, y: pageY });
    },
    onPanResponderMove: (evt, gestureState) => {
      const { moveX, moveY } = gestureState;
      // En web moveX puede ser 0 si sale de la ventana, fallback a pageX + dx
      const x = moveX || (evt.nativeEvent.pageX);
      const y = moveY || (evt.nativeEvent.pageY);
      setDraggedItem({ text: item.name, x, y });
    },
    onPanResponderRelease: (evt, gestureState) => {
      const dropX = gestureState.moveX || evt.nativeEvent.pageX;
      const dropY = gestureState.moveY || evt.nativeEvent.pageY;

      if (mapBounds && dropX >= mapBounds.x && dropX <= mapBounds.x + mapBounds.w &&
          dropY >= mapBounds.y && dropY <= mapBounds.y + mapBounds.h) {
        
        // Calcular coordenadas relativas a la imagen
        const relX = dropX - mapBounds.x;
        const relY = dropY - mapBounds.y;
        const imgX = (relX - panRef.current.x) / zoomScaleRef.current;
        const imgY = (relY - panRef.current.y) / zoomScaleRef.current;

        // Convertir a porcentajes
        const pctX = (imgX / baseWidth) * 100;
        const pctY = (imgY / baseHeight) * 100;

        setDrawingShape('pin'); // Por defecto Pin al arrastrar
        setNewItemModal({ visible: true, x: pctX, y: pctY, width: 0, height: 0, initialText: item.name, initialStepId: item.id, initialCategoryId: groupId });
      }
      setDraggedItem(null);
    }
  });

  // --- Calcular dimensiones base para renderizado ---
  const { width: baseWidth, height: baseHeight } = getFittedDimensions(containerWidth || windowWidth, CONTAINER_HEIGHT, imageAspectRatio || 1.5);

  // Ref para dimensiones base (para uso en PanResponder sin re-render)
  const baseDimsRef = useRef({ width: 1, height: 1 });
  useEffect(() => {
    if (baseWidth > 0 && baseHeight > 0) {
      baseDimsRef.current = { width: baseWidth, height: baseHeight };
    }
  }, [baseWidth, baseHeight]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setDocsLastUpdate(Date.now());
      const promises = [refreshProjects(), fetchBlueprints()];
      if (projectId) {
        promises.push(fetchProjectChecklist(projectId));
      }
      await Promise.all(promises);
    } catch (error) {
      console.error("Error refreshing project:", error);
    } finally {
      setRefreshing(false);
    }
  }, [projectId, refreshProjects, fetchProjectChecklist, fetchBlueprints]);

  // Mostrar Skeleton si se está cargando y aún no tenemos el proyecto
  if (isLoading && !project) {
    return <ProjectDetailSkeleton />;
  }

  if (!project || !projectId) {
    return (
      <View style={styles.container}>
        <Text>{i18n.t('projectDetail.notFound')}</Text>
      </View>
    );
  }

  const handleToggleItem = (itemId: string) => {
    if (project?.status === 'Completed' || (project?.status as string) === 'COMPLETED') {
      return;
    }
    toggleChecklistItem(projectId, itemId);
  };

  const handleStartProject = () => {
    if (!hasPermission('PROJECT_UPDATE')) {
      showAlert(i18n.t('common.accessDenied'), i18n.t('projectDetail.adminOnlyStatus'));
      return;
    }
    setStartModalVisible(true);
  };

  const confirmStartProject = async () => {
    if (projectId) {
      try {
        await startProject(projectId);
        showAlert(i18n.t('common.success'), i18n.t('projectDetail.projectStarted'));
      } catch (error) {
        showAlert(i18n.t('common.error'), i18n.t('projectDetail.startError'));
      }
    }
    setStartModalVisible(false);
  };

  const handleCompleteProject = async () => {
    if (!hasPermission('PROJECT_CLOSE')) {
      showAlert(i18n.t('common.accessDenied'), i18n.t('projectDetail.adminOnlyClose'));
      return;
    }

    showAlert(
      i18n.t('projectDetail.finishProject'),
      i18n.t('projectDetail.finishConfirmation'),
      [
        { text: i18n.t('common.cancel'), style: "cancel" },
        {
          text: i18n.t('common.finish'),
          onPress: async () => {
            try {
              await api.patch(`/api/projects/${projectId}/status`, { status: 'COMPLETED' });
              if (refreshProjects) await refreshProjects();
              showAlert(i18n.t('common.success'), i18n.t('projectDetail.projectFinished'));
            } catch (error) {
              console.error(error);
              showAlert(i18n.t('common.error'), i18n.t('projectDetail.finishError'));
            }
          }
        }
      ]
    );
  };

  const handleReopenProject = async () => {
    if (!hasPermission('PROJECT_CLOSE')) return;

    showAlert(
      i18n.t('projectDetail.reopenProject'),
      i18n.t('projectDetail.reopenConfirmation'),
      [
        { text: i18n.t('common.cancel'), style: "cancel" },
        {
          text: i18n.t('common.reopen'),
          onPress: async () => {
            try {
              await api.patch(`/api/projects/${projectId}/status`, { status: 'IN_PROGRESS' });
              if (refreshProjects) await refreshProjects();
              showAlert(i18n.t('common.success'), i18n.t('projectDetail.projectReopened'));
            } catch (error) {
              console.error(error);
              showAlert(i18n.t('common.error'), i18n.t('projectDetail.reopenError'));
            }
          }
        }
      ]
    );
  };

  // --- Funciones para Evidencias (Foto/Video) ---
  const handleAddEvidenceMedia = async (source: 'camera' | 'gallery', cameraType?: 'image' | 'video') => {
    if (project?.status === 'Completed' || (project?.status as string) === 'COMPLETED') {
      showAlert(i18n.t('common.restrictedAction'), i18n.t('projectDetail.completedProjectEvidenceRestriction'));
      return;
    }
    if (!selectedItemId) return;

    let result;
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.All, // Permitir Fotos y Videos
      quality: 0.8,
    };

    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showAlert(i18n.t('common.permissionCamera'));
        return;
      }
      
      // Si se especifica tipo (foto o video), forzamos el mediaType
      if (cameraType === 'image') options.mediaTypes = ImagePicker.MediaTypeOptions.Images;
      if (cameraType === 'video') options.mediaTypes = ImagePicker.MediaTypeOptions.Videos;

      result = await ImagePicker.launchCameraAsync(options);
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert(i18n.t('common.permissionGallery'));
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const type = asset.type === 'video' ? 'video' : 'image';
      
      setIsEvidenceUploading(true);
      try {
        await addChecklistEvidence(projectId, selectedItemId, type, asset.uri);
      } catch (error) {
        showAlert(i18n.t('common.error'), i18n.t('projectDetail.evidenceUploadError'));
      } finally {
        setIsEvidenceUploading(false);
      }
    }
  };

  const handlePostComment = () => {
    if (selectedItemId && newComment.trim()) {
      addChecklistComment(projectId, selectedItemId, newComment);
      setNewComment('');
    }
  };

  const handleDeleteItem = () => {
    if (project?.status === 'Completed' || (project?.status as string) === 'COMPLETED') {
      showAlert(i18n.t('common.restrictedAction'), i18n.t('projectDetail.completedProjectDeleteTaskRestriction'));
      return;
    }
    if (selectedItemId) {
      showAlert(
        i18n.t('projectDetail.deleteTask'),
        i18n.t('projectDetail.deleteConfirmation'),
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          { 
            text: i18n.t('common.delete'), 
            style: 'destructive', 
            onPress: async () => {
              await deleteChecklistItem(projectId, selectedItemId);
              setSelectedItemId(null);
            }
          }
        ]
      );
    }
  };

  const handleDeleteEvidence = (evidenceId: string) => {
    if (project?.status === 'Completed' || (project?.status as string) === 'COMPLETED') {
      showAlert(i18n.t('common.restrictedAction'), i18n.t('projectDetail.completedProjectDeleteEvidenceRestriction'));
      return;
    }
    if (!selectedItemId) return;
    
    showAlert(
      i18n.t('projectDetail.deleteEvidence'),
      i18n.t('projectDetail.deleteEvidenceConfirmation'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        { 
          text: i18n.t('common.delete'), 
          style: 'destructive', 
          onPress: async () => {
            await deleteChecklistEvidence(projectId, selectedItemId, evidenceId);
          }
        }
      ]
    );
  };

  const handleUploadPlan = () => {
    if (project?.status === 'Completed' || (project?.status as string)  === 'COMPLETED') {
      showAlert(i18n.t('common.restrictedAction'), i18n.t('projectDetail.completedProjectPlanRestriction'));
      return;
    }
    
    const defaultName = i18n.t('common.architectural');
    const isCustomGroup = selectedGroup !== defaultName;
    const hasPages = blueprintPages.length > 0 || (selectedGroup === defaultName && project?.architecturalPlanUri);

    if (hasPages) {
      const options: any[] = [
        { text: i18n.t('common.cancel'), style: 'cancel' }
      ];

      if (isCustomGroup) {
        options.push({
          text: i18n.t('common.addPage'),
          onPress: () => { setTimeout(() => startPlanUpload('append'), 100); }
        });
      }

      options.push({ 
        text: i18n.t('common.replace'), 
        style: 'destructive', 
        onPress: () => { setTimeout(() => startPlanUpload('replace'), 100); }
      });

      showAlert(
        i18n.t('common.managePlan'),
        i18n.t('common.managePlanMessage'),
        options
      );
    } else {
      startPlanUpload('replace');
    }
  };

  // Función separada para manejar la subida y permitir reintentos
  const uploadSelectedPlan = async (file: { uri: string, name: string, type: string, blob?: any }) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(i18n.t('common.preparing'));

    // Permitir que la UI se actualice (muestre el spinner) antes de procesar la imagen
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Crear nuevo controlador para esta solicitud
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { uri, name, type } = file;
      
      let imageFile: { uri: string, name: string, type: string, blob?: Blob } | { uri: string, name: string, type: string };

      if (Platform.OS === 'web') {
        // Si ya tenemos el blob (DocumentPicker web), lo usamos. Si no, lo obtenemos (ImagePicker web a veces da base64/blob url)
        const blob = file.blob || await (await fetch(uri)).blob();
        imageFile = { uri, name, type, blob };
      } else {
        imageFile = { uri, name, type };
      }

      // Lógica de decisión: PUT (Main) vs POST (Add/Update Group)
      const defaultName = i18n.t('common.architectural');
      
      if (uploadModeRef.current === 'newGroup') {
        // CASO B: Agregar Nuevo Grupo
        await addProjectBlueprint(projectId, imageFile, newGroupName, false);
        setUploadStatus(i18n.t('common.saving'));
        setUploadProgress(100);
        
        // Seleccionar el nuevo grupo
        setSelectedGroup(newGroupName);
        setNewGroupName('');
      } else if (selectedGroup === defaultName) {
        // CASO A: Actualizar Main (Arquitectónico) -> PUT
        const statusMap: Record<string, string> = {
          'Not Started': 'NOT_STARTED',
          'In Progress': 'IN_PROGRESS',
          'Delayed': 'DELAYED',
          'On Time': 'ON_TIME',
          'Completed': 'COMPLETED'
        };

        const projectPayload = {
          name: project!.name,
          client: project!.client,
          address: project!.address,
          startDate: project!.startDate,
          endDate: project!.endDate,
          status: statusMap[project!.status] || project!.status,
          progress: project!.progress,
          participants: [] 
        };

        const response = await updateProjectWithFile(projectId, projectPayload, imageFile, (p) => {
          setUploadProgress(p);
          if (p >= 100) setUploadStatus(i18n.t('common.saving'));
          else setUploadStatus(i18n.t('common.uploading'));
        }, controller.signal);
        
        // Actualizar URI local si es necesario (aunque fetchBlueprints lo hará)
        const newUri = response.data?.architecturalPlanUri || response.data?.imageUri || uri;
        updateProjectPlan(projectId, newUri);
      } else {
        // CASO C: Actualizar Grupo Secundario -> POST con replace según modo
        const shouldReplace = uploadModeRef.current === 'replace';
        await addProjectBlueprint(projectId, imageFile, selectedGroup, shouldReplace);
        setUploadStatus(i18n.t('common.saving'));
        setUploadProgress(100);
      }
      
      await fetchBlueprints(); // Refrescar blueprints por si se generaron nuevas páginas
      
      // Actualizar vista localmente para feedback inmediato
      setPlanImageSource({ uri });
      if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
        setPlanType('pdf');
      } else {
        setPlanType('image');
      }
      
      showAlert(i18n.t('common.success'), i18n.t('projectDetail.planUploaded'));

    } catch (error: any) {
      // Verificar si el error fue por cancelación
      if (error.code === 'ERR_CANCELED' || error.name === 'CanceledError') {
        console.log("Subida cancelada por el usuario");
      } else {
        console.error("Error uploading plan:", error);
        
        showAlert(
          i18n.t('projectDetail.uploadError'),
          i18n.t('projectDetail.uploadErrorRetry'),
          [
            { text: i18n.t('common.cancel'), style: "cancel" },
            { text: i18n.t('common.retry'), onPress: () => uploadSelectedPlan(file) }
          ]
        );
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus('');
      abortControllerRef.current = null;
    }
  };

  // Funciones auxiliares para selección
  const pickImageForPlan = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert(i18n.t('common.permissionGallery'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      quality: 1 
    });
    
    if (!result.canceled) {
      const asset = result.assets[0];

      // Validación de tamaño: 50MB
      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
        showAlert(i18n.t('common.error'), i18n.t('common.imageSizeLimit'));
        return;
      }

      const filename = asset.uri.split('/').pop() || 'plan.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      uploadSelectedPlan({ uri: asset.uri, name: filename, type });
    }
  };

  const pickDocumentForPlan = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      // Validación de tamaño: 50MB
      if (asset.size && asset.size > 50 * 1024 * 1024) {
        showAlert(i18n.t('common.error'), i18n.t('common.pdfSizeLimit'));
        return;
      }

      uploadSelectedPlan({
        uri: asset.uri,
        name: asset.name,
        type: 'application/pdf',
        blob: (asset as any).file // Para soporte web
      });
    } catch (err) {
      console.log('Error picking document:', err);
    }
  };

  // Lógica interna para seleccionar y subir (Menú de opciones)
  const startPlanUpload = (mode: 'replace' | 'append' | 'newGroup' = 'replace') => {
    setUploadMode(mode);
    uploadModeRef.current = mode; // Actualizar ref inmediatamente para uso síncrono en callbacks
    if (Platform.OS === 'web') {
      // En web usamos DocumentPicker que permite seleccionar cualquier archivo
      pickDocumentForPlan();
      return;
    }

    showAlert(
      i18n.t('projectDetail.selectFile'),
      i18n.t('projectDetail.fileTypeQuestion'),
      [
        { text: i18n.t('common.image'), onPress: pickImageForPlan },
        { text: i18n.t('common.pdf'), onPress: pickDocumentForPlan },
        { text: i18n.t('common.cancel'), style: "cancel" }
      ]
    );
  };

  const showEvidenceOptions = () => {
    if (Platform.OS === 'web') {
      // En web, abrir directamente el explorador de archivos (Galería)
      handleAddEvidenceMedia('gallery');
      return;
    }

    const buttons: any[] = [
      { text: i18n.t('projectDetail.takePhoto'), onPress: () => handleAddEvidenceMedia('camera', 'image') },
      { text: i18n.t('projectDetail.recordVideo'), onPress: () => handleAddEvidenceMedia('camera', 'video') },
      { text: i18n.t('projectDetail.gallery'), onPress: () => handleAddEvidenceMedia('gallery') },
    ];

    if (Platform.OS === 'ios') {
      buttons.push({ text: i18n.t('common.cancel'), style: "cancel" });
    }

    showAlert(
      i18n.t('projectDetail.addEvidenceTitle'),
      i18n.t('projectDetail.addEvidenceMessage'),
      buttons
    );
  };

  const saveNewItem = (data: NewTaskData) => {
    if (project?.status === 'Completed' || (project?.status as string) === 'COMPLETED') {
      showAlert(i18n.t('common.restrictedAction'), i18n.t('projectDetail.completedProjectAddTaskRestriction'));
      return;
    }

    if (data.text.trim()) {
      // Validación de límites: Verificar que el punto de inserción esté dentro del plano (0-100%)
      if (newItemModal.x < 0 || newItemModal.y < 0 || newItemModal.x > 100 || newItemModal.y > 100) {
        showAlert(i18n.t('projectDetail.outOfBounds'), i18n.t('projectDetail.outOfBoundsMessage'));
        return;
      }

      setIsSaving(true);
      let finalWidth = newItemModal.width || 0;
      let finalHeight = newItemModal.height || 0;

      // Si se seleccionó una forma de área (rectángulo/círculo) pero no tiene dimensiones (fue un drop), asignar tamaño por defecto
      if ((data.shape === 'rectangle' || data.shape === 'circle') && finalWidth === 0 && finalHeight === 0) {
        finalWidth = 15; // 15% del ancho
        finalHeight = 10; // 10% del alto (aprox)
      }

      // Validar que el área completa (x + width, y + height) no exceda los límites
      // Se da un pequeño margen (100.5) por posibles redondeos
      if (data.shape !== 'pencil' && (newItemModal.x + finalWidth > 100.5 || newItemModal.y + finalHeight > 100.5)) {
        showAlert(i18n.t('projectDetail.outOfBounds'), i18n.t('projectDetail.outOfBoundsMessage'));
        setIsSaving(false);
        return;
      }

      const currentBlueprintId = blueprintPages.length > 0 ? blueprintPages[currentPage]?.id : undefined;

      addChecklistItem(projectId, data.text, newItemModal.x, newItemModal.y, finalWidth, finalHeight, data.assignedTo, data.shape, data.deadline || undefined, data.shape === 'pencil' ? currentPencilPath : undefined, data.shape === 'pencil' ? pencilColor : undefined, data.stepId || undefined, data.categoryId || undefined, currentBlueprintId)
        .then(() => {
          setCurrentPencilPath('');
          setCurrentPencilPathDisplay('');
          // Limpiar dibujo (rectángulo/círculo) al guardar
          setCurrentDrawing(null);
          currentDrawingRef.current = null;
          setNewItemModal({ ...newItemModal, visible: false });
        })
        .catch(() => {
          // El error ya es manejado por el interceptor global o logs
        })
        .finally(() => {
          setIsSaving(false);
        });
    }
  };

  const handleUpdateProjectDetails = async (data: { name: string, participants: string[] }) => {
    try {
      // Reutilizamos updateProjectWithFile pero solo enviando el JSON del proyecto
      const projectPayload = {
        ...project,
        name: data.name,
        participants: data.participants,
      };
      
      // Enviamos null como archivo para solo actualizar datos
      await updateProjectWithFile(projectId, projectPayload, null);
      
      // Refrescamos la lista global de proyectos para que se refleje el cambio
      if (refreshProjects) await refreshProjects();
      
      showAlert(i18n.t('common.success'), i18n.t('projectDetail.projectUpdated'));
    } catch (error) {
      console.error(error);
      showAlert(i18n.t('common.error'), i18n.t('projectDetail.updateError'));
    }
  };

  const handleCloseNewItemModal = () => {
    setCurrentPencilPath('');
    setCurrentPencilPathDisplay('');
    // Limpiar dibujo (rectángulo/círculo) al cancelar
    setCurrentDrawing(null);
    currentDrawingRef.current = null;
    setNewItemModal({ ...newItemModal, visible: false });
  };

  const handleCloseItemDetail = () => {
    setNewComment('');
    setSelectedItemId(null);
  };
  
  const allCatalogSteps = useMemo(() => {
    return catalogGroups.flatMap(group => group.items.map(item => ({...item, categoryId: group.id})));
  }, [catalogGroups]);

  const [isTaskDateModalVisible, setIsTaskDateModalVisible] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<ChecklistItem | null>(null);

  const handleSaveTaskModal = async (data: { startDate: string | null; endDate: string | null; completed: boolean }) => {
    if (!selectedTaskForModal) return;

    try {
        setIsSaving(true);
        if (selectedTaskForModal.id) { // UPDATE with PUT
            const payload = {
                startDate: data.startDate,
                endDate: data.endDate,
                completed: data.completed,
                deadline: data.endDate,
            };
            await api.put(`/api/checklist/${selectedTaskForModal.id}`, payload);
        } else { // CREATE with POST
           const localId = Date.now().toString();
            const payload = {
                itemId: localId,
                text: selectedTaskForModal.text,
                projectId: projectId,
                stepId: selectedTaskForModal.stepId,
                categoryId: selectedTaskForModal.categoryId,
                completed: data.completed,
                startDate: data.startDate,
                endDate: data.endDate,
                deadline: data.endDate,
            };
            await api.post(`/api/checklist`, payload);
        }
        await fetchProjectChecklist(projectId);
    } catch (error) {
        console.error("Error saving checklist item:", error);
        showAlert(i18n.t('common.error'), i18n.t('projectDetail.taskDatesError'));
    } finally {
        setIsSaving(false);
        setIsTaskDateModalVisible(false);
        setSelectedTaskForModal(null);
    }
  };

  const handleEditItemDates = (item: ChecklistItem) => {
    if (!item) return;
    setSelectedItemId(null); // Close ItemDetailModal
    setSelectedTaskForModal(item);
    setIsTaskDateModalVisible(true);
  };

  const handleCatalogStepClick = async (catalogStep: { id: string, name: string, categoryId: string }) => {
    const existingItem = allChecklistItems.find(item => item.stepId === catalogStep.id);

    if (existingItem) {
        setSelectedTaskForModal(existingItem);
        setIsTaskDateModalVisible(true);
    } else {
        const newItem: Partial<ChecklistItem> = {
            text: catalogStep.name,
            stepId: catalogStep.id,
            categoryId: catalogStep.categoryId,
            completed: false,
        };
        setSelectedTaskForModal(newItem as ChecklistItem);
        setIsTaskDateModalVisible(true);
    }
  };

  
  // Sincronizar dimensiones base con el layout real renderizado para máxima precisión
  const onImageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setImageLayout({ width, height });
    
    // FIX: Eliminamos la actualización de baseDimsRef aquí.
    // Confiamos en el useEffect existente que usa baseWidth/baseHeight calculados matemáticamente.
    // Esto asegura que el SVG de Vista Previa y el cálculo de Guardado usen EXACTAMENTE las mismas dimensiones.
  };

  // Funciones de Zoom
  const handleZoom = (factor: number) => {
    const newScale = Math.max(1, Math.min(5, zoomScale * factor));
    if (newScale === zoomScale) return;

    // Calcular centro del viewport para hacer zoom hacia el centro
    const viewportW = containerWidth || windowWidth;
    const viewportH = CONTAINER_HEIGHT;
    const centerX = viewportW / 2;
    const centerY = viewportH / 2;

    // Ajustar Pan para mantener el centro
    const imgX = (centerX - pan.x) / zoomScale;
    const imgY = (centerY - pan.y) / zoomScale;
    const newPanX = centerX - (imgX * newScale);
    const newPanY = centerY - (imgY * newScale);

    setZoomScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleDownloadViewingDoc = async () => {
    if (!viewingImageSource?.uri) return;
    
    try {
      if (Platform.OS === 'web') { // Web
        const response = await fetch(viewingImageSource.uri, { headers: viewingImageSource.headers });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Intentar obtener nombre del archivo de la URI
        a.download = viewingImageSource.uri.split('/').pop() || 'download';
        document.body.appendChild(a);
        a.click();
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(url);
      } else {
        let filename = viewingImageSource.uri.split('/').pop() || 'download'; // Native
        
        // Limpiar query params si existen
        if (filename.includes('?')) filename = filename.split('?')[0];

        // Asegurar extensión correcta para evitar "archivo corrupto" al compartir
        if (viewingMediaType === 'pdf' && !filename.toLowerCase().endsWith('.pdf')) {
          filename += '.pdf';
        } else if (viewingMediaType === 'image' && !filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          filename += '.jpg';
        }

        const fileDir = ((FileSystem as any).documentDirectory || '') + filename;
        const downloadRes = await FileSystem.downloadAsync(
          viewingImageSource.uri,
          fileDir,
          { headers: viewingImageSource.headers }
        );
        if (downloadRes.status === 200) {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadRes.uri, {
              mimeType: viewingMediaType === 'pdf' ? 'application/pdf' : 'image/jpeg',
              UTI: viewingMediaType === 'pdf' ? 'com.adobe.pdf' : 'public.image'
            });
          } else {
            showAlert(i18n.t('common.downloadComplete'), i18n.t('common.savedTo') + downloadRes.uri);
          }
        }
      }
    } catch (error) {
      console.error(error);
      showAlert(i18n.t('common.error'), i18n.t('common.downloadError'));
    }
  };

  // Función para manejar la visualización de documentos (PDF/Imagen)
  const handleViewDocument = async (uri: string, name: string, type: string) => {
    const source = getPlanImageSource(uri);
    if (!source) return;

    const isPdf = type?.toLowerCase().includes('pdf') || name.toLowerCase().endsWith('.pdf') || uri.toLowerCase().endsWith('.pdf');

    // WEB: Fetch con headers -> Blob -> ObjectURL para que el iframe pueda cargarlo
    if (Platform.OS === 'web' && isPdf) {
      setIsImageLoading(true);
      try {
        const response = await fetch(source.uri, { headers: source.headers });
        if (!response.ok) throw new Error('No se pudo cargar el documento');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setViewingImageSource({ uri: blobUrl }); // Guardamos la URL local del blob
        setViewingMediaType('pdf');
      } catch (e) { console.error(e); showAlert(i18n.t('common.error'), i18n.t('common.loadError')); }
      finally { setIsImageLoading(false); }
    } else {
      // MOBILE & IMAGENES: Usamos la fuente directa
      setViewingImageSource(source);
      setViewingMediaType(isPdf ? 'pdf' : 'image');
    }
  };

  return (
    // El ScrollView principal se deshabilita si estamos dibujando para evitar conflictos, 
    // pero permitimos scroll si estamos en modo dibujo pero haciendo zoom/pan (manejado por los scrollviews internos)
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={{ 
          padding: 24, 
          paddingBottom: insets.bottom + 80 
        }} 
        scrollEnabled={!isInteracting}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3182CE']} />
        }
      >
      {/* Usamos Stack.Screen para configurar el título de la cabecera dinámicamente */}
      <Stack.Screen options={{ title: project.name, headerBackTitle: 'Proyectos' }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginBottom: 8 }}>
          <Text style={[styles.title, { marginBottom: 0, flexShrink: 1 }]}>{project.name}</Text>
          {(project.status === 'Completed' || (project?.status as string) === 'COMPLETED') && (
            <Pressable 
              onPress={() => {
                if (hasPermission('PROJECT_CLOSE')) {
                  handleReopenProject();
                } else {
                  showAlert(i18n.t('projectDetail.projectClosed'), i18n.t('projectDetail.projectClosedMessage'));
                }
              }}
              style={{ marginLeft: 8, backgroundColor: '#FED7D7', padding: 4, borderRadius: 6 }}
            >
              <Feather name="lock" size={16} color="#C53030" />
            </Pressable>
          )}
        </View>
        {hasPermission('PROJECT_UPDATE') && (
          <Pressable 
            onPress={() => {
              if (project.status === 'Completed' || (project?.status as string) === 'COMPLETED') {
                showAlert(i18n.t('projectDetail.projectClosed'), i18n.t('projectDetail.editClosedProjectRestriction'));
              } else {
                setIsEditProjectModalVisible(true);
              }
            }} 
            style={{ padding: 8, marginBottom: 8 }}
          >
            <Feather name="edit-2" size={20} color={(project.status === 'Completed' || (project?.status as string) === 'COMPLETED') ? "#A0AEC0" : "#3182CE"} />
          </Pressable>
        )}
      </View>
      <Text style={styles.client}>{i18n.t('projectDetail.client')}: {project.client}</Text>
      
      <View style={styles.addressContainer}>
        <Feather name="map-pin" size={16} color="#718096" />
        <Text style={styles.address}>{project.address || i18n.t('projects.noAddress')}</Text>
      </View>

      <View style={styles.statusRow}>
        <Pressable 
          onPress={() => {
            setIsHistoryModalVisible(true);
            setIsLoadingHistory(true);
            api.get(`/api/audit-logs/entity/${projectId}`)
              .then(res => setAuditLogs(res.data))
              .catch(err => console.error(err))
              .finally(() => setIsLoadingHistory(false));
          }} 
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={styles.statusText}>{i18n.t('common.status')}: {
            project.status === 'Not Started' ? (i18n.t('dashboard.status.notStarted') || 'Not Started') :
            project.status === 'In Progress' ? i18n.t('dashboard.status.inProgress') :
            project.status === 'Delayed' ? i18n.t('dashboard.status.delayed') :
            project.status === 'Completed' ? i18n.t('dashboard.status.completed') : i18n.t('dashboard.status.onTime')
          }</Text>
          <Feather name="info" size={16} color="#718096" style={{ marginLeft: 8 }} />
        </Pressable>
        {project.status === 'Not Started' && (
          <Pressable onPress={handleStartProject} style={styles.inlineStartButton}>
            <Feather name="play-circle" size={16} color="#38A169" />
            <Text style={styles.inlineStartButtonText}>{i18n.t('common.start')}</Text>
          </Pressable>
        )}
        {project.status !== 'Completed' && isAllTasksCompleted && (
          <Pressable onPress={handleCompleteProject} style={[styles.inlineStartButton, { backgroundColor: '#EBF8FF', borderColor: '#3182CE' }]}>
            <Feather name="check-circle" size={16} color="#3182CE" />
            <Text style={[styles.inlineStartButtonText, { color: '#3182CE' }]}>{i18n.t('common.finish')}</Text>
          </Pressable>
        )}
      </View>
      
      {/* Barra de Progreso */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${project.progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{project.progress}% {i18n.t('common.completed')}</Text>
      </View>

      {/* Sección de Documentos del Proyecto */}
      {hasPermission('PROJECT_DOCUMENTS') && (
        <ProjectDocuments 
          projectId={projectId} 
          userRole={user?.role as string}
          projectStatus={project?.status}
          onViewDocument={handleViewDocument as any}
          canEdit={hasPermission('PROJECT_DOCUMENTS')}
          onAddDocument={() => setIsDocModalVisible(true)}
          lastUpdate={docsLastUpdate}
          categories={docCategories}
        />
      )}

      {/* Sección de Pasos del Proyecto (Checklist Catálogo) */}
      <View style={styles.section}>
        <Pressable onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsStepsExpanded(!isStepsExpanded);
        }} style={styles.collapsibleSectionHeader}>
          <Text style={styles.sectionTitle}>Pasos del Proyecto</Text>
          <Feather name={isStepsExpanded ? 'chevron-down' : 'chevron-right'} size={24} color="#1A202C" />
        </Pressable>
        
        {isStepsExpanded && (
          <View>
            {catalogGroups.length > 0 ? (
              catalogGroups.map(group => (
                <View key={group.id} style={styles.stepGroupContainer}>
                  <Pressable onPress={() => toggleStepGroupCollapse(group.id)} style={styles.stepGroupHeader}>
                    <Text style={styles.stepGroupTitle}>{group.name}</Text>
                    <Feather name={collapsedStepGroups[group.id] ? 'chevron-right' : 'chevron-down'} size={22} color="#4A5568" />
                  </Pressable>

                  {!collapsedStepGroups[group.id] && (
                    <View style={styles.stepGroupItemsContainer}>
                      {group.items.map(step => {
                        const correspondingItem = allChecklistItems.find(item => item.stepId === step.id);
                        const isCompleted = correspondingItem?.completed || false;
                        
                        return (
                          <Pressable key={step.id} style={styles.simpleChecklistItem} onPress={() => handleCatalogStepClick({ ...step, categoryId: group.id })}>
                            <Feather name={isCompleted ? 'check-square' : 'square'} size={24} color={isCompleted ? '#38A169' : '#A0AEC0'} />
                            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 12 }}>
                              <Text style={[styles.simpleChecklistItemText, { marginLeft: 0 }, isCompleted && styles.simpleChecklistItemTextCompleted]}>{step.name}</Text>
                              {correspondingItem && (correspondingItem.startDate || (isCompleted && correspondingItem.endDate)) ? (
                                <View>
                                  {correspondingItem.startDate && (
                                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                                          <Text style={styles.stepDateLabel}>{i18n.t('projectDetail.startDate')}:</Text>
                                          <Text style={styles.stepDateText}>{new Date(correspondingItem.startDate).toLocaleDateString()}</Text>
                                      </View>
                                  )}
                                  {isCompleted && correspondingItem.endDate && (
                                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 2 }}>
                                          <Text style={styles.stepDateLabel}>{i18n.t('projectDetail.endDate')}:</Text>
                                          <Text style={styles.stepDateText}>{new Date(correspondingItem.endDate).toLocaleDateString()}</Text>
                                      </View>
                                  )}
                                </View>
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.placeholder}>{i18n.t('projectDetail.noCatalogSteps')}</Text>
            )}
          </View>
        )}
      </View>

      {/* Sección del Plano Arquitectónico */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('projectDetail.interactivePlan')}</Text>
        
        {/* Tabs de Grupos de Planos */}
        <View style={styles.groupTabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 40 }}>
            {groupNames.map(name => (
              <Pressable 
                key={name} 
                style={[styles.groupTab, selectedGroup === name && styles.groupTabActive]}
                onPress={() => setSelectedGroup(name)}
              >
                <Text style={[styles.groupTabText, selectedGroup === name && styles.groupTabTextActive]}>{name}</Text>
              </Pressable>
            ))}
            {hasPermission('PROJECT_UPDATE') && (
              <Pressable 
                style={[styles.groupTab, { backgroundColor: '#EBF8FF', borderColor: '#BEE3F8' }]}
                onPress={() => setIsAddGroupModalVisible(true)}
              >
                <Feather name="plus" size={16} color="#3182CE" />
              </Pressable>
            )}
          </ScrollView>
        </View>

        {project.architecturalPlanUri ? (
          <>
          <View style={styles.drawingControls}>
            <View style={styles.toolsContainer}>
              {/* Herramienta: Mover (Pan) */}
              <Pressable onPress={() => setIsDrawingMode(false)} style={[styles.toolButton, !isDrawingMode && styles.toolButtonActive]}>
                <Feather name="move" size={20} color={!isDrawingMode ? '#FFF' : '#4A5568'} />
              </Pressable>
              
              <View style={styles.toolSeparator} />

              {/* Selector de Forma */}
              <Pressable onPress={() => { setIsDrawingMode(true); setDrawingShape('rectangle'); }} style={[styles.toolButton, isDrawingMode && drawingShape === 'rectangle' && styles.toolButtonActive]}>
                <Feather name="square" size={20} color={isDrawingMode && drawingShape === 'rectangle' ? '#FFF' : '#4A5568'} />
              </Pressable>
              <Pressable onPress={() => { setIsDrawingMode(true); setDrawingShape('circle'); }} style={[styles.toolButton, isDrawingMode && drawingShape === 'circle' && styles.toolButtonActive]}>
                <Feather name="circle" size={20} color={isDrawingMode && drawingShape === 'circle' ? '#FFF' : '#4A5568'} />
              </Pressable>
              <Pressable onPress={() => { setIsDrawingMode(true); setDrawingShape('pin'); }} style={[styles.toolButton, isDrawingMode && drawingShape === 'pin' && styles.toolButtonActive]}>
                <Feather name="map-pin" size={20} color={isDrawingMode && drawingShape === 'pin' ? '#FFF' : '#4A5568'} />
              </Pressable>
              <Pressable onPress={() => { setIsDrawingMode(true); setDrawingShape('pencil'); }} style={[styles.toolButton, isDrawingMode && drawingShape === 'pencil' && styles.toolButtonActive]}>
                <Feather name="edit-3" size={20} color={isDrawingMode && drawingShape === 'pencil' ? '#FFF' : '#4A5568'} />
              </Pressable>
              {planType === 'pdf' && (
                <Pressable onPress={() => setIsAspectRatioModalVisible(true)} style={[styles.toolButton, isAspectRatioModalVisible && styles.toolButtonActive]}>
                  <Feather name="maximize" size={20} color={isAspectRatioModalVisible ? '#FFF' : '#4A5568'} />
                </Pressable>
              )}
              <View style={styles.toolSeparator} />
              <Pressable onPress={() => { setIsCatalogOpen(!isCatalogOpen); updateMapBounds(); }} style={[styles.toolButton, isCatalogOpen && styles.toolButtonActive]}>
                <Feather name="list" size={20} color={isCatalogOpen ? '#FFF' : '#4A5568'} />
              </Pressable>
            </View>

            <Text style={styles.instructionText}>
              {isDrawingMode ? i18n.t('projectDetail.drawing') : i18n.t('projectDetail.move')}
            </Text>
          </View>
          
          {/* Barra de Filtros de Categoría */}
          <View style={styles.filterContainer}>
            <Pressable style={styles.filterButton} onPress={() => setIsFilterModalVisible(true)}>
              <Feather name="filter" size={16} color="#3182CE" />
              <Text style={styles.filterButtonText}>
                {selectedCategoryFilter 
                  ? catalogGroups.find(g => g.id === selectedCategoryFilter)?.name || i18n.t('common.filter')
                  : i18n.t('projectDetail.filterByCategory')
                }
              </Text>
              {selectedCategoryFilter && (
                <Pressable onPress={() => setSelectedCategoryFilter(null)} style={{ marginLeft: 8, padding: 2 }} hitSlop={8}>
                  <Feather name="x" size={16} color="#3182CE" />
                </Pressable>
              )}
            </Pressable>
          </View>

          {/* Selector de Color para Lápiz */}
          {isDrawingMode && drawingShape === 'pencil' && (
            <View style={styles.colorPickerRow}>
              {['#3182CE', '#E53E3E', '#38A169', '#D69E2E', '#000000', '#FFFFFF'].map(color => (
                <Pressable
                  key={color}
                  style={[styles.colorOption, { backgroundColor: color }, pencilColor === color && styles.colorOptionSelected]}
                  onPress={() => setPencilColor(color)}
                />
              ))}
            </View>
          )}
          
          {/* MODIFICADO: Estilos para limitar ancho en web y usar altura constante */}
          <View style={[styles.planWrapper, { height: CONTAINER_HEIGHT }]} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
                
            {/* Viewport del Mapa (Área visible) */}
            <View 
              style={styles.viewport}
              ref={mapRef}
              collapsable={false} // Importante para Android: evita que la vista se optimice y altere coordenadas
              {...panResponder.panHandlers}
            >
              <View 
                onLayout={onImageLayout}
                style={{
                  position: 'absolute',
                  left: pan.x,
                  top: pan.y,
                  // MODIFICADO: Usar dimensiones base calculadas para "Fit" (ajustar)
                  width: baseWidth * zoomScale,
                  height: baseHeight * zoomScale,
                }}
                collapsable={false}
              >
            {planType === 'pdf' ? (
              <View style={{ width: '100%', height: '100%' }}>
                {Platform.OS === 'web' ? (
                  React.createElement('iframe', { src: planImageSource?.uri, style: { width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }, scrolling: 'no' })
                ) : (
                  <WebView 
                    source={planImageSource || { uri: '' }} 
                    style={{ flex: 1 }} 
                    scalesPageToFit={true}
                    scrollEnabled={false}
                    // Ocultar controles nativos en Android si es posible
                    overScrollMode="never"
                  />
                )}
                {/* Capa transparente absoluta que "aplana" el PDF: Bloquea interacción directa con el visor y permite dibujar encima */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent', zIndex: 10 }]} />
              </View>
            ) : (
            <Image
              source={planImageSource || { uri: '' }}
              // IMPORTANTE: En Web, resizeMode debe estar en style para garantizar 'stretch' (fill)
              style={[styles.planImage, { width: '100%', height: '100%', resizeMode: 'stretch' }]}
              // pointerEvents="none" // Evitar que la imagen robe eventos de toque
              resizeMode="stretch" // Usamos stretch para evitar desajustes de coordenadas por letterboxing
              onLoad={(e) => {
                // Validación segura: En Mobile 'source' siempre existe con {width, height}.
                // En Web moderno, nativeEvent.source también existe. Usamos un fallback seguro.
                const source = e.nativeEvent?.source || (Platform.OS === 'web' ? { width: e.nativeEvent?.source?.width, height: e.nativeEvent?.source?.height } : null);
                if (source) {
                  // @ts-ignore
                  const { width, height } = source;
                  if (height > 0) setImageAspectRatio(width / height);
                }
              }}
              onLoadEnd={() => {
                // En móvil desactivamos el spinner cuando la imagen termina de renderizarse
                if (Platform.OS !== 'web') setIsImageLoading(false);
              }}
            />
            )}

            {/* Capa SVG para trazos de lápiz */}
            {/* MODIFICADO: viewBox 0-100 para usar porcentajes y preserveAspectRatio="none" para que se estire con la imagen */}
            <Svg 
              width="100%"
              height="100%"
              style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
            >
              {filteredChecklistItems.map(item => (
                item.shape === 'pencil' && item.path ? (
                  <SvgPath
                    key={item.id}
                    d={item.path}
                    stroke={item.color || (item.completed ? '#38A169' : '#E53E3E')}
                    // Ajustar grosor: 3px visuales convertidos a escala 0-100
                    strokeWidth={3 * (100 / (baseWidth || 1))}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null
              ))}
            </Svg>

            {/* Preview del Lápiz (Píxeles) - Separado para garantizar coincidencia exacta con cursor */}
            {currentPencilPathDisplay ? (
              <Svg
                width="100%"
                height="100%"
                style={[StyleSheet.absoluteFill, { pointerEvents: 'none', top: 0, left: 0 }]}
                viewBox={`0 0 ${baseWidth || 1} ${baseHeight || 1}`} // Usamos dimensiones base para mapeo 1:1
                preserveAspectRatio="none"
              >
                <SvgPath
                  d={currentPencilPathDisplay}
                  stroke={pencilColor}
                  strokeWidth={3} // 3 píxeles base
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            ) : null}
            
            {/* Renderizar Pines sobre el mapa */}
            {filteredChecklistItems.map((item) => {
              if (item.x === undefined || item.y === undefined) return null;
              
              // Si tiene ancho/alto es un Área, si no es un Pin
              // El lápiz se maneja en el SVG, así que aquí filtramos
              if (item.shape === 'pencil') return null;

              const catColor = getCategoryColor(item.categoryId);
              const statusColor = item.completed ? '#38A169' : '#E53E3E';
              const pinColor = catColor || statusColor;

              // Renderizado específico para el PIN (Icono de mapa)
              if (item.shape === 'pin') {
                return (
                  <Pressable
                    key={item.id}
                    style={{
                      position: 'absolute',
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      marginLeft: -12, // Centrar horizontalmente (mitad de 24)
                      marginTop: -24,  // Anclar en la punta inferior (altura completa de 24)
                    }}
                    onPress={() => setSelectedItemId(item.id)}
                  >
                    <Feather name="map-pin" size={24} color={pinColor} />
                    {/* Si tiene categoría, mostramos el estado (verde/rojo) con un pequeño punto indicador */}
                    {catColor && (
                      <View style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: statusColor,
                        borderWidth: 1,
                        borderColor: '#FFF'
                      }} />
                    )}
                  </Pressable>
                );
              }

              const isArea = (item.width && item.height) || item.shape === 'rectangle' || item.shape === 'circle';
              const areaBorderColor = catColor || statusColor;
              // Si hay color de categoría, usamos ese con opacidad. Si no, usamos el de estado.
              const areaBgColor = catColor 
                ? (item.completed ? `${catColor}80` : `${catColor}40`) // Hex + Alpha (80=50%, 40=25%)
                : (item.completed ? 'rgba(56, 161, 105, 0.5)' : 'rgba(229, 62, 62, 0.5)');

              return (
                <Pressable
                  key={item.id}
                  style={[
                    isArea ? styles.mapArea : styles.mapPin,
                    { 
                      left: `${item.x}%`, 
                      top: `${item.y}%`,
                      // Estilos condicionales para Área vs Pin
                      width: isArea ? `${item.width ?? 0}%` : 24,
                      height: isArea ? `${item.height ?? 0}%` : 24,
                      backgroundColor: areaBgColor,
                      borderColor: areaBorderColor,
                      borderRadius: item.shape === 'circle' ? 9999 : 4, // Círculo vs Rectángulo
                    }
                  ]}
                  onPress={() => setSelectedItemId(item.id)}
                >
                  {!isArea && <Feather name={item.completed ? "check" : "alert-circle"} size={14} color="#FFF" />}
                </Pressable>
              );
            })}

            {/* Renderizar dibujo en progreso */}
            {currentDrawing && (
              <View style={[
                styles.drawingOverlay,
                {
                  left: (currentDrawing.width < 0 ? currentDrawing.x + currentDrawing.width : currentDrawing.x) * zoomScale,
                  top: (currentDrawing.height < 0 ? currentDrawing.y + currentDrawing.height : currentDrawing.y) * zoomScale,
                  width: Math.abs(currentDrawing.width) * zoomScale,
                  height: Math.abs(currentDrawing.height) * zoomScale,
                  borderRadius: drawingShape === 'circle' ? 9999 : 4,
                }
              ]} />
            )}
              </View>

              {/* Overlay para Dibujar: Solo visible en modo dibujo, captura todos los toques */}
              {isDrawingMode && (
                <View
                  // Aseguramos fondo transparente para capturar toques en Web
                  style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent', cursor: Platform.OS === 'web' ? 'crosshair' : 'auto' } as any]}
                  collapsable={false}
                  {...drawingResponder.panHandlers}
                />
              )}
            </View>

            {/* Spinner de Carga de Imagen */}
            {isImageLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#3182CE" />
              </View>
            )}

            {/* Controles de Paginación de Planos */}
            {blueprintPages.length > 1 && (
              <View style={styles.paginationControls}>
                <Pressable 
                  onPress={() => setCurrentPage(p => Math.max(0, p - 1))} 
                  disabled={currentPage === 0}
                  style={[styles.pageButton, currentPage === 0 && styles.pageButtonDisabled]}
                >
                  <Feather name="chevron-left" size={24} color={currentPage === 0 ? "#A0AEC0" : "#4A5568"} />
                </Pressable>
                <Text style={styles.pageText}>
                  {currentPage + 1} / {blueprintPages.length}
                </Text>
                <Pressable 
                  onPress={() => setCurrentPage(p => Math.min(blueprintPages.length - 1, p + 1))} 
                  disabled={currentPage === blueprintPages.length - 1}
                  style={[styles.pageButton, currentPage === blueprintPages.length - 1 && styles.pageButtonDisabled]}
                >
                  <Feather name="chevron-right" size={24} color={currentPage === blueprintPages.length - 1 ? "#A0AEC0" : "#4A5568"} />
                </Pressable>
              </View>
            )}

            {/* Controles de Zoom Flotantes */}
            <View style={styles.zoomControls}>
              <Pressable onPress={() => handleZoom(1.2)} style={styles.zoomButton}>
                <Feather name="plus" size={24} color="#4A5568" />
              </Pressable>
              <View style={styles.zoomDivider} />
              <Pressable onPress={() => handleZoom(0.8)} style={styles.zoomButton}>
                <Feather name="minus" size={24} color="#4A5568" />
              </Pressable>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8, gap: 20 }}>
            <Pressable onPress={() => {
              setViewingImageSource(planImageSource);
              setViewingMediaType(planType);
            }}>
              <Text style={{ color: '#3182CE', fontSize: 14 }}>{planType === 'pdf' ? i18n.t('projectDetail.viewDocument') : i18n.t('projectDetail.viewFullImage')}</Text>
            </Pressable>
            {hasPermission('PROJECT_UPDATE') && (
              <Pressable onPress={handleUploadPlan} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="refresh-cw" size={14} color="#718096" style={{ marginRight: 4 }} />
                <Text style={{ color: '#718096', fontSize: 14 }}>{i18n.t('projectDetail.replacePlan')}</Text>
              </Pressable>
            )}
          </View>
          </>
        ) : (
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDF2F7' }]}>
            <Feather name="image" size={48} color="#CBD5E0" />
            <Text style={{ marginTop: 16, color: '#718096', marginBottom: 16 }}>{i18n.t('projectDetail.noPlan')}</Text>
            {hasPermission('PROJECT_UPDATE') && (
              <Pressable style={styles.uploadPlanButton} onPress={handleUploadPlan}>
                <Feather name="upload" size={16} color="#3182CE" />
                <Text style={styles.uploadPlanText}>{i18n.t('projectDetail.uploadPlan')}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{i18n.t('projectDetail.checklistLog')}</Text>
        {filteredChecklistItems.length > 0 ? (
          filteredChecklistItems.map(item => (
            <View key={item.id} style={styles.checklistItemContainer}>
              <View style={styles.checklistItem}>
                <Pressable onPress={() => setSelectedItemId(item.id)} style={styles.checkboxPressable}>
                  <Feather
                    name={item.completed ? 'check-square' : 'square'}
                    size={24}
                    color={item.completed ? '#38A169' : '#A0AEC0'}
                  />
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={[styles.checklistItemText, item.completed && styles.checklistItemTextCompleted]}>{item.text}</Text>
                    {item.assignedTo && (
                      <Text style={styles.assignedToText}>{i18n.t('projectDetail.assignedTo')}: {
                        availableUsers.find(u => u.id === item.assignedTo)?.username || item.assignedTo
                      }</Text>
                    )}
                    <View style={{marginLeft: 16, marginTop: 4}}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.stepDateLabel}>{i18n.t('projectDetail.startDate')}:</Text>
                          <Text style={styles.stepDateText}>
                              {item.startDate ? new Date(item.startDate).toLocaleDateString() : i18n.t('common.notSet')}
                          </Text>
                      </View>
                      {item.completed && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                              <Text style={styles.stepDateLabel}>{i18n.t('projectDetail.endDate')}:</Text>
                              <Text style={styles.stepDateText}>
                                  {item.endDate ? new Date(item.endDate).toLocaleDateString() : i18n.t('common.pending')}
                              </Text>
                          </View>
                      )}
                      {item.deadline && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            <Text style={styles.stepDateLabel}>{i18n.t('newTask.deadline')}:</Text>
                            <Text style={styles.stepDateText}>
                                {new Date(item.deadline).toLocaleDateString()}
                            </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
                <Pressable onPress={() => handleToggleItem(item.id)} style={styles.cameraButton}>
                   {/* Botón rápido para marcar completado */}
                   <Feather name={item.completed ? "check-circle" : "circle"} size={22} color={item.completed ? "#38A169" : "#CBD5E0"} />
                </Pressable>
              </View>
              {/* Indicador de evidencias */}
              {(item.evidence?.length || 0) > 0 && (
                <Text style={styles.evidenceCountText}>{(item.evidence?.length || 0)} {i18n.t('projectDetail.attachments')}</Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.placeholder}>{i18n.t('projectDetail.noTasks')}</Text>
        )}
      </View>

      {/* Modal para ver la imagen en pantalla completa */}
      <Modal
        visible={!!viewingImageSource}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingImageSource(null)}
      >
        <View style={styles.modalContainer}>
          <Pressable style={styles.modalCloseButton} onPress={() => setViewingImageSource(null)}>
            <Feather name="x" size={32} color="#FFFFFF" />
          </Pressable>
          <Pressable style={styles.modalDownloadButton} onPress={handleDownloadViewingDoc}>
            <Feather name="download" size={32} color="#FFFFFF" />
          </Pressable>
          {viewingMediaType === 'pdf' ? (
            Platform.OS === 'web' ? (
              React.createElement('iframe', { src: viewingImageSource?.uri, style: { width: '90%', height: '85%', border: 'none', backgroundColor: '#FFF' } })
            ) : Platform.OS === 'android' ? (
              // FIX ANDROID: WebView no renderiza PDF nativamente. Ofrecemos abrirlo externamente.
              <View style={{ width: '85%', padding: 24, backgroundColor: '#FFF', borderRadius: 12, alignItems: 'center' }}>
                <Feather name="file-text" size={48} color="#718096" />
                <Text style={{ marginTop: 16, marginBottom: 24, textAlign: 'center', color: '#4A5568', fontSize: 16 }}>
                  {i18n.t('projectDetail.pdfAndroidMessage')}
                </Text>
                <Pressable style={[styles.modalButton, { backgroundColor: '#3182CE', width: '100%', alignItems: 'center' }]} onPress={handleDownloadViewingDoc}>
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{i18n.t('projectDetail.openPdf')}</Text>
                </Pressable>
              </View>
            ) : (
              <WebView source={viewingImageSource!} style={{ flex: 1, width: '100%' }} />
            )
          ) : (
            <Image
              source={viewingImageSource!}
              style={styles.fullscreenImage}
              resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Modal para agregar nueva tarea en el plano */}
      <NewTaskModal
        visible={newItemModal.visible}
        onClose={handleCloseNewItemModal}
        onSave={saveNewItem}
        isSaving={isSaving}
        catalogGroups={catalogGroups}
        availableUsers={availableUsers}
        initialData={{
          text: newItemModal.initialText,
          stepId: newItemModal.initialStepId,
          categoryId: newItemModal.initialCategoryId,
          shape: drawingShape
        }}
      />

      <ItemDetailModal
        visible={!!selectedItem}
        item={selectedItem}
        onClose={handleCloseItemDetail}
        onToggleStatus={(id) => handleToggleItem(id)}
        onDelete={handleDeleteItem}
        onAddEvidence={showEvidenceOptions}
        onDeleteEvidence={handleDeleteEvidence}
        onPostComment={handlePostComment}
        newComment={newComment}
        setNewComment={setNewComment}
        userRole={user?.role as string}
        getPlanImageSource={getPlanImageSource}
        onViewImage={(source, type) => {
          setViewingImageSource(source);
          setViewingMediaType(type);
        }}
        onEditDates={handleEditItemDates}
      />

      {/* Modal de Edición de Proyecto */}
      <EditProjectModal
        visible={isEditProjectModalVisible}
        onClose={() => setIsEditProjectModalVisible(false)}
        project={project}
        availableUsers={availableUsers}
        onUpdate={handleUpdateProjectDetails}
      />

      {/* Modal para Agregar Nuevo Grupo de Planos */}
      <Modal
        visible={isAddGroupModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsAddGroupModalVisible(false)}
      >
        <View style={styles.inputModalContainer}>
          <View style={styles.inputModalContent}>
            <Text style={styles.inputModalTitle}>{i18n.t('common.newPlanGroup')}</Text>
            <Text style={styles.label}>{i18n.t('common.groupName')}</Text>
            <TextInput style={styles.input} value={newGroupName} onChangeText={setNewGroupName} placeholder="Ej. Eléctrico, Hidráulico..." />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setIsAddGroupModalVisible(false)}><Text>{i18n.t('common.cancel')}</Text></Pressable>
              <Pressable style={[styles.modalButton, styles.saveButton]} onPress={() => { setIsAddGroupModalVisible(false); setTimeout(() => startPlanUpload('newGroup'), 100); }} disabled={!newGroupName.trim()}><Text style={styles.saveButtonText}>{i18n.t('common.confirm')}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmación de Inicio */}
      <Modal
        visible={startModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStartModalVisible(false)}
      >
        <View style={styles.inputModalContainer}>
          <View style={styles.inputModalContent}>
            <Text style={styles.inputModalTitle}>{i18n.t('projects.startTitle')}</Text>
            <Text style={{ fontSize: 16, color: '#4A5568', marginBottom: 24 }}>
              {i18n.t('projects.startConfirmation')}
            </Text>
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setStartModalVisible(false)}>
                <Text style={{ fontWeight: 'bold', color: '#4A5568' }}>{i18n.t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, { backgroundColor: '#38A169' }]} onPress={confirmStartProject}>
                <Text style={styles.saveButtonText}>{i18n.t('common.start')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Ajuste de Aspect Ratio (PDF) */}
      <AspectRatioModal
        visible={isAspectRatioModalVisible}
        onClose={() => setIsAspectRatioModalVisible(false)}
        currentAspectRatio={imageAspectRatio}
        onAspectRatioChange={setImageAspectRatio}
      />

      {/* Modal de Progreso de Carga */}
      <PlanUploadModal
        visible={isUploading}
        progress={uploadProgress}
        status={uploadStatus}
        onCancel={handleCancelUpload}
      />

      {/* Modal de Historial de Cambios */}
      <HistoryModal
        visible={isHistoryModalVisible}
        onClose={() => setIsHistoryModalVisible(false)}
        isLoading={isLoadingHistory}
        auditLogs={auditLogs}
      />

      {/* Modal de Subida de Documentos */}
      <DocumentUploadModal
        visible={isDocModalVisible}
        onClose={() => setIsDocModalVisible(false)}
        onUpload={handleDocumentUpload}
        categories={docCategories}
      />

      {/* Modal de Carga de Evidencia */}
      <EvidenceUploadModal visible={isEvidenceUploading} />

      <AlertComponent />
      </ScrollView>

      {/* Panel de Catálogo (Bottom Sheet simulado) - AHORA FUERA DEL SCROLLVIEW */}
      {isCatalogOpen && (
        <>
          <Pressable 
            style={styles.catalogOverlay} 
            onPress={() => setIsCatalogOpen(false)} 
          />
          <Animated.View style={[styles.catalogPanel, { height: panelHeight, paddingBottom: insets.bottom + 16 }]}>
            {/* Barra para arrastrar (Handle) */}
            <View {...panelPanResponder.panHandlers} style={styles.panelHandleContainer}>
              <View style={styles.panelHandle} />
            </View>

          <View style={styles.catalogHeader}>
            <Text style={styles.catalogTitle}>{i18n.t('projectDetail.stepsCatalog')}</Text>
            <Pressable onPress={() => setIsCatalogOpen(false)}>
              <Feather name="x" size={20} color="#4A5568" />
            </Pressable>
          </View>
          <Text style={styles.catalogSubtitle}>{i18n.t('projectDetail.dragElement')}</Text>
          <ScrollView style={styles.catalogList} showsVerticalScrollIndicator={true}>
            {filteredCatalogGroups.map((group) => (
              <View key={group.id} style={styles.catalogGroup}>
                <Pressable 
                  onPress={() => toggleGroupCollapse(group.id)} 
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 4 }}
                >
                  <Feather name={collapsedGroups[group.id] ? "chevron-right" : "chevron-down"} size={14} color="#718096" />
                  {/* Indicador de color de la categoría (Leyenda) */}
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: getCategoryColor(group.id) || '#CBD5E0', marginRight: 6, marginLeft: 4 }} />
                  <Text style={[styles.catalogGroupTitle, { marginBottom: 0 }]}>{group.name}</Text>
                </Pressable>
                
                {!collapsedGroups[group.id] && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {group.items.map((item) => (
                      <View 
                        key={item.id} 
                        style={[styles.catalogItem, { marginBottom: 8 }]}
                        {...createCatalogItemResponder(item, group.id).panHandlers}
                      >
                        <Feather name="check-square" size={16} color="#3182CE" style={{ marginRight: 8 }} />
                        <Text style={styles.catalogItemText}>{item.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
            {filteredCatalogGroups.length === 0 && <Text style={{ color: '#A0AEC0', fontStyle: 'italic', padding: 10 }}>{i18n.t('projectDetail.noElements')}</Text>}
          </ScrollView>
        </Animated.View>
        </>
      )}

      {/* Elemento Arrastrado (Fantasma) */}
      {draggedItem && (
        <View style={[styles.draggedGhost, { top: draggedItem.y - 20, left: draggedItem.x - 50 }]}>
          <Feather name="check-square" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.draggedGhostText}>{draggedItem.text}</Text>
        </View>
      )}

      {/* Modal para Filtrar Categorías */}
      <Modal
        visible={isFilterModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <Pressable style={styles.inputModalContainer} onPress={() => setIsFilterModalVisible(false)}>
          <Pressable style={styles.inputModalContent} onPress={() => {}}>
            <Text style={styles.inputModalTitle}>{i18n.t('projectDetail.filterByCategory')}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('projectDetail.searchCategory')}
              value={filterSearchText}
              onChangeText={setFilterSearchText}
            />
            <ScrollView>
              <Pressable 
                style={styles.filterModalItem} 
                onPress={() => { setSelectedCategoryFilter(null); setIsFilterModalVisible(false); }}
              >
                <Text style={styles.filterModalItemText}>{i18n.t('common.all')}</Text>
              </Pressable>
              {catalogGroups
                .filter(g => g.name.toLowerCase().includes(filterSearchText.toLowerCase()))
                .map(group => (
                  <Pressable 
                    key={group.id} 
                    style={styles.filterModalItem} 
                    onPress={() => { setSelectedCategoryFilter(group.id); setIsFilterModalVisible(false); }}
                  >
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: getCategoryColor(group.id) || '#CBD5E0', marginRight: 12 }} />
                    <Text style={styles.filterModalItemText}>{group.name}</Text>
                  </Pressable>
                ))
              }
              {catalogGroups.filter(g => g.name.toLowerCase().includes(filterSearchText.toLowerCase())).length === 0 && (
                <Text style={{ color: '#A0AEC0', padding: 12, textAlign: 'center' }}>{i18n.t('projectDetail.noCategoriesFound')}</Text>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <TaskDateModal
        visible={isTaskDateModalVisible}
        onClose={() => {
            setIsTaskDateModalVisible(false);
            setSelectedTaskForModal(null);
        }}
        onSave={handleSaveTaskModal}
        task={selectedTaskForModal}
        showAlert={showAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  title: { fontSize: 28, fontWeight: 'bold', fontFamily: 'Inter-Bold', color: '#1A202C', marginBottom: 8 },
  client: { fontSize: 18, color: '#4A5568', fontFamily: 'Inter-Regular', marginBottom: 8 },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    color: '#4A5568',
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  statusText: { fontSize: 16, color: '#718096', fontFamily: 'Inter-Regular' },
  stepGroupContainer: {
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    overflow: 'hidden',
  },
  stepGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F7FAFC',
  },
  stepGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  stepGroupItemsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  inlineStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9AE6B4'
  },

  inlineStartButtonText: { color: '#38A169', fontWeight: 'bold', fontFamily: 'Inter-Bold', fontSize: 12, marginLeft: 4 },
  progressContainer: { marginBottom: 24 },
  progressBarBackground: { height: 10, backgroundColor: '#EDF2F7', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#3182CE' },
  progressText: { marginTop: 4, fontSize: 12, color: '#718096', fontFamily: 'Inter-SemiBold', textAlign: 'right' },
  
  drawingControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  instructionText: { fontSize: 14, color: '#718096', fontFamily: 'Inter-Regular', marginRight: 8 },
  toolsContainer: { flexDirection: 'row', backgroundColor: '#EDF2F7', borderRadius: 8, padding: 2 },
  toolButton: { padding: 8, borderRadius: 6 },
  toolButtonActive: { backgroundColor: '#3182CE' },
  toolSeparator: { width: 1, backgroundColor: '#CBD5E0', marginHorizontal: 4, marginVertical: 4 },
  filterContainer: { marginBottom: 12 },
  filterButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  filterButtonText: { marginLeft: 8, color: '#2D3748', fontWeight: '600', fontFamily: 'Inter-SemiBold' },
  filterModalItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  filterModalItemText: { fontSize: 16, color: '#2D3748', fontFamily: 'Inter-Regular' },
  colorPickerRow: { flexDirection: 'row', gap: 12, marginBottom: 8, paddingHorizontal: 4 },
  colorOption: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#FFF', shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  colorOptionSelected: { borderWidth: 2, borderColor: '#2D3748', transform: [{ scale: 1.1 }] },

  planWrapper: { 
    position: 'relative', 
    borderRadius: 12, 
    overflow: 'hidden', 
    backgroundColor: '#F7FAFC', 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    // MODIFICADO: Estilos para web
    width: '100%',
    alignSelf: 'center',
    maxWidth: 800, // Limita el ancho en pantallas grandes
  },
  viewport: { width: '100%', height: '100%', overflow: 'hidden' },
  planImage: { },
  
  zoomControls: { position: 'absolute', bottom: 16, right: 16, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, flexDirection: 'column', shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  zoomButton: { padding: 10, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: 1, backgroundColor: '#E2E8F0', width: '100%' },

  groupTabsContainer: { flexDirection: 'row', marginBottom: 12 },
  groupTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  groupTabActive: { backgroundColor: '#3182CE', borderColor: '#3182CE' },
  groupTabText: { fontSize: 14, color: '#718096', fontWeight: '600' },
  groupTabTextActive: { color: '#FFF' },

  paginationControls: { position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, zIndex: 20 },
  pageButton: { padding: 4 },
  pageButtonDisabled: { opacity: 0.3 },
  pageText: { marginHorizontal: 12, fontSize: 14, fontWeight: '600', color: '#2D3748' },

  mapPin: { position: 'absolute', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: -12, marginTop: -12, borderWidth: 2, borderColor: '#FFF', shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  mapArea: { position: 'absolute', borderWidth: 2, borderRadius: 12 }, // Área dibujada (círculo/rectángulo redondeado)
  drawingOverlay: { position: 'absolute', borderWidth: 2, borderColor: '#3182CE', backgroundColor: 'rgba(49, 130, 206, 0.3)', borderRadius: 12 },
  
  viewFullText: { textAlign: 'center', color: '#3182CE', marginTop: 8, fontSize: 14, fontFamily: 'Inter-Regular' },
  assignedToText: { fontSize: 12, color: '#718096', marginLeft: 16, marginTop: 2, fontFamily: 'Inter-Regular' },

  section: { marginTop: 16 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', fontFamily: 'Inter-Bold', color: '#1A202C', marginBottom: 12 },
  placeholder: { fontSize: 16, color: '#A0AEC0', textAlign: 'center', paddingVertical: 40, fontFamily: 'Inter-Regular' },
  checklistItemContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkboxPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checklistItemText: {
    fontSize: 16,
    color: '#2D3748',
    fontFamily: 'Inter-Regular',
    marginLeft: 16,
  },
  checklistItemTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#A0AEC0',
  },
  cameraButton: {
    padding: 8,
    marginLeft: 12,
  },
  // Estilos para el modal de imagen
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  modalDownloadButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 8 },
  cancelButton: { backgroundColor: '#EDF2F7' },
  saveButton: { backgroundColor: '#3182CE' },
  saveButtonText: { color: '#FFF', fontWeight: 'bold' },
  uploadPlanButton: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#EBF8FF', borderRadius: 8 },
  uploadPlanText: { marginLeft: 8, color: '#3182CE', fontWeight: '600' },

  // Estilos Modal Detalle Item
  itemModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  itemModalContent: { width: '100%', maxWidth: 600, backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  itemModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  itemModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A202C' },
  itemModalText: { fontSize: 18, marginBottom: 16, color: '#2D3748' },
  itemStatusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  statusLabel: { fontSize: 16, color: '#718096', marginRight: 8 },
  statusButton: { padding: 4 },
  statusButtonText: { fontSize: 16, fontWeight: 'bold' },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#4A5568', marginTop: 16, marginBottom: 8 },
  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  evidenceThumbnail: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#EDF2F7' },
  videoIconOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8 },
  removeEvidenceButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#E53E3E',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  addEvidenceButton: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addEvidenceText: { fontSize: 12, color: '#718096', marginTop: 4, fontFamily: 'Inter-Regular' },
  commentItem: { backgroundColor: '#F7FAFC', padding: 12, borderRadius: 8, marginBottom: 8 },
  commentText: { fontSize: 14, color: '#2D3748', fontFamily: 'Inter-Regular' },
  commentDate: { fontSize: 10, color: '#A0AEC0', marginTop: 4, textAlign: 'right', fontFamily: 'Inter-Regular' },
  commentInputContainer: { flexDirection: 'row', marginTop: 16, alignItems: 'center' },
  commentInput: { flex: 1, backgroundColor: '#EDF2F7', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8 },
  sendButton: { backgroundColor: '#3182CE', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  evidenceCountText: { fontSize: 12, color: '#718096', marginLeft: 40, marginTop: 4, fontFamily: 'Inter-Regular' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E53E3E', padding: 12, borderRadius: 8, marginTop: 24 },
  deleteButtonText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8, fontFamily: 'Inter-Bold' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(247, 250, 252, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  // Estilos Catálogo
  catalogPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, zIndex: 100 },
  catalogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catalogTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748', fontFamily: 'Inter-Bold' },
  catalogSubtitle: { fontSize: 12, color: '#718096', marginBottom: 12, fontFamily: 'Inter-Regular' },
  catalogList: { flex: 1 },
  catalogItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EBF8FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#BEE3F8' },
  catalogItemText: { color: '#2C5282', fontWeight: '600', fontSize: 14, fontFamily: 'Inter-SemiBold' },
  catalogGroup: { marginRight: 16 },
  catalogGroupTitle: { fontSize: 12, fontWeight: 'bold', color: '#718096', marginBottom: 8, marginLeft: 4, fontFamily: 'Inter-Bold' },
  catalogOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 90 },
  draggedGhost: { position: 'absolute', flexDirection: 'row', alignItems: 'center', backgroundColor: '#3182CE', padding: 12, borderRadius: 24, zIndex: 9999, elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, opacity: 0.9 },
  draggedGhostText: { color: '#FFF', fontWeight: 'bold', fontFamily: 'Inter-Bold' },
  panelHandleContainer: { width: '100%', alignItems: 'center', paddingVertical: 10, marginTop: -10, marginBottom: 5 },
  panelHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#CBD5E0' },

  // Estilos Modales Generales (Restaurados)
  inputModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', width: '100%' },
  inputModalContent: { width: '85%', maxWidth: 400, backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 5 },
  inputModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, backgroundColor: '#FFF' },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  collapsibleSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  simpleChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  simpleChecklistItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#2D3748',
    fontFamily: 'Inter-Regular',
  },
  simpleChecklistItemTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#A0AEC0',
  },
  stepDateLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    fontFamily: 'Inter-SemiBold',
    marginRight: 4,
  },
  stepDateText: {
    fontSize: 12,
    color: '#718096',
    fontFamily: 'Inter-Regular',
  },
});