import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Project, ChecklistItem, ProjectStatus, ProjectBudget } from '../types';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';
import GlobalAlert from '../components/GlobalAlert';

// --- Datos Iniciales (los que estaban en index.tsx) ---
const initialProjects: Project[] = [
  { 
    id: '1', 
    name: 'Los Robles Residence', 
    client: 'Garcia Family', 
    status: 'In Progress',
    address: '123 Las Cumbres Ave, Green Hills',
    progress: 75,
    participants: ['https://i.pravatar.cc/150?u=1', 'https://i.pravatar.cc/150?u=2', 'https://i.pravatar.cc/150?u=3'],
    architecturalPlanUri: 'https://images.adsttc.com/media/images/5e1d/0296/3312/fd58/9c00/006d/large_jpg/02_1F.jpg?1578959500'
  },
  { 
    id: '2', 
    name: 'Zenith Corporate Offices', 
    client: 'Zenith Inc.', 
    status: 'Delayed',
    address: '400 Financial Blvd, Downtown',
    progress: 45,
    participants: ['https://i.pravatar.cc/150?u=4', 'https://i.pravatar.cc/150?u=5']
  },
  { 
    id: '3', 
    name: 'Central Apartment Remodel', 
    client: 'Ana Martinez', 
    status: 'In Progress',
    address: '402 5th of May St, Historic Center',
    progress: 90,
    participants: ['https://i.pravatar.cc/150?u=6']
  },
  { 
    id: '4', 
    name: 'La Pradera Commercial Complex', 
    client: 'Vista Investments', 
    status: 'Completed',
    address: 'National Highway Km 20',
    progress: 100,
    participants: ['https://i.pravatar.cc/150?u=7', 'https://i.pravatar.cc/150?u=8', 'https://i.pravatar.cc/150?u=9']
  },
  { 
    id: '5', 
    name: '"El Refugio" Country House', 
    client: 'Carlos Sanchez', 
    status: 'In Progress',
    address: 'Royal Road s/n, Bravo Valley',
    progress: 30,
    participants: ['https://i.pravatar.cc/150?u=10', 'https://i.pravatar.cc/150?u=11']
  },
  { id: '6', name: '"Horizon" Apartment Tower', client: 'Urban Construction', status: 'Delayed', address: '88 Sea Ave', progress: 15, participants: ['https://i.pravatar.cc/150?u=12'] },
];

// --- Creación del Contexto ---
interface ProjectsContextType {
  projects: Project[];
  addProject: (project: { name: string; client: string; architecturalPlanUri?: string; address?: string; startDate?: string; endDate?: string; status?: ProjectStatus; participants?: string[] }) => Promise<void>;
  checklists: Record<string, ChecklistItem[]>;
  budgets: Record<string, ProjectBudget>;
  getProjectById: (id: string) => Project | undefined;
  getChecklistByProjectId: (projectId: string) => ChecklistItem[];
  toggleChecklistItem: (projectId: string, itemId: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  startProject: (id: string) => Promise<void>;
  updateChecklistEvidence: (projectId: string, itemId: string, uri: string) => void;
  addChecklistItem: (projectId: string, text: string, x?: number, y?: number, width?: number, height?: number, assignedTo?: string, shape?: 'rectangle' | 'circle' | 'pencil' | 'pin', deadline?: string, path?: string, color?: string, stepId?: string, categoryId?: string) => Promise<void>;
  updateProjectPlan: (projectId: string, uri: string) => void;
  addChecklistEvidence: (projectId: string, itemId: string, type: 'image' | 'video', uri: string) => Promise<void>;
  deleteChecklistEvidence: (projectId: string, checklistId: string, evidenceId: string) => Promise<void>;
  addChecklistComment: (projectId: string, itemId: string, text: string) => Promise<void>;
  deleteChecklistItem: (projectId: string, itemId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  refreshBudgets: () => Promise<void>;
  fetchProjectChecklist: (projectId: string) => Promise<void>;
  clearProjectChecklist: (projectId: string) => void;
  isLoading: boolean;
  isBudgetsLoading: boolean;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

// --- Proveedor del Contexto ---
export const ProjectsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [checklists, setChecklists] = useState<Record<string, ChecklistItem[]>>({});
  const [budgets, setBudgets] = useState<Record<string, ProjectBudget>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isBudgetsLoading, setIsBudgetsLoading] = useState(false);

  // Ref para acceder al estado actual de checklists dentro del intervalo sin reiniciar el efecto
  const checklistsRef = useRef(checklists);
  useEffect(() => { checklistsRef.current = checklists; }, [checklists]);

  // --- LÓGICA DE MOCK BACKEND: CÁLCULO DE PROGRESO ---
  const updateProjectProgress = (projectId: string, currentChecklistItems: ChecklistItem[]) => {
    const totalItems = currentChecklistItems.length;
    let newProgress = 0;
    
    if (totalItems > 0) {
      const completedItems = currentChecklistItems.filter(item => item.completed).length;
      newProgress = Math.round((completedItems / totalItems) * 100);
    }

    setProjects(prevProjects => prevProjects.map(p => {
      if (p.id === projectId && p.progress !== newProgress) {
        return { ...p, progress: newProgress };
      }
      return p;
    }));
  };

  // Recalcular progreso inicial al montar el componente
  useEffect(() => {
    console.log('🔌 API URL configurada:', process.env.EXPO_PUBLIC_API_URL);
    projects.forEach(p => {
      const items = checklists[p.id] || [];
      updateProjectProgress(p.id, items);
    });
  }, []);

  // Función centralizada para refrescar proyectos desde la API
  const refreshProjects = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await api.get('/api/projects');
      const data = response.data;
      const mappedProjects: Project[] = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        client: p.client,
        status: (p.status === 'IN_PROGRESS' || p.status === 'In Progress') ? 'In Progress' : 
                (p.status === 'DELAYED' || p.status === 'Delayed') ? 'Delayed' : 
                (p.status === 'COMPLETED' || p.status === 'Completed') ? 'Completed' : 
                (p.status === 'ON_TIME' || p.status === 'On Time') ? 'On Time' : 
                (p.status === 'NOT_STARTED' || p.status === 'Not Started') ? 'Not Started' : 'In Progress',
        address: p.address,
        progress: p.progress,
        participants: p.participants ? p.participants.map((part: any) => part.imageUri || part.username) : [],
        architecturalPlanUri: p.architecturalPlanUri || p.imageUri,
        imageUri: p.imageUri,
        startDate: p.startDate,
        endDate: p.endDate,
      }));
      setProjects(mappedProjects);
    } catch (err) {
      console.error('Error fetching projects:', err);
      if (Platform.OS === 'web') {
        console.warn('⚠️ Error en Web: Si ves un error de red, verifica que tu backend permita peticiones desde este origen (CORS).');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch de Presupuestos
  const refreshBudgets = async () => {
    if (!token) return;
    setIsBudgetsLoading(true);
    try {
      const response = await api.get('/api/budgets');
      if (response.data && Array.isArray(response.data)) {
        const loadedBudgets: Record<string, ProjectBudget> = {};
        response.data.forEach((item: any) => {
          // Soporte para estructura anidada: [ { "NombreProyecto": { projectId: "...", ... } } ]
          if (!item.projectId) {
            Object.values(item).forEach((b: any) => {
              if (b && b.projectId) loadedBudgets[b.projectId] = b;
            });
          } else {
            // Soporte para estructura plana: [ { projectId: "...", ... } ]
            loadedBudgets[item.projectId] = item;
          }
        });
        setBudgets(loadedBudgets);
      } else {
        setBudgets({});
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setIsBudgetsLoading(false);
    }
  };

  // --- REAL-TIME: WebSockets & AppState ---
  useEffect(() => {
    if (!token) return;

    // 1. Función para recargar todo (usada al conectar o volver de background)
    const fetchAllData = () => {
      refreshProjects();
      refreshBudgets();
      Object.keys(checklistsRef.current).forEach(projectId => {
        if (projectId.length > 2) fetchProjectChecklist(projectId);
      });
    };

    // 1.1 Carga Inicial Inmediata (Persistencia primero)
    fetchAllData();

    // 2. Inicializar Socket
    const socket = initSocket(token);

    // 3. Escuchar Eventos del Servidor
    // Registramos listeners ANTES de conectar para asegurar que capturamos eventos iniciales
    socket.on('connect', () => {
      console.log('✅ Socket Conectado Exitosamente!');
      console.log('🆔 Session ID:', socket.id);
      fetchAllData(); // Re-sincronizar al conectar por si hubo cambios offline
    });

    socket.on('connect_error', (err: { message: any; }) => {
      console.error('Socket connection error:', err.message);
      if (Platform.OS === 'web') {
        console.warn('⚠️ En Web, esto suele ser un problema de CORS. Asegúrate de que tu servidor Backend permita el origen de tu app (ej. http://localhost:8082).');
      }
    });

    socket.on('disconnect', (reason: string) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'parse error') {
        console.warn('⚠️ Error de Parseo: Posible incompatibilidad de versiones. Si tu backend usa netty-socketio (v2), necesitas socket.io-client v2 en el frontend o actualizar el backend.');
      }
    });

    // --- EVENTOS DE PROYECTOS ---
    // Escuchamos creación, actualización y eliminación para refrescar la lista
    const handleProjectChange = (data: any) => {
      console.log('Real-time: Project change detected', data);
      refreshProjects();
    };
    socket.on('project_updated', handleProjectChange);
    socket.on('project_deleted', handleProjectChange); // Cubre eliminación

    // --- EVENTOS DE PRESUPUESTOS ---
    const handleBudgetChange = () => {
      console.log('Real-time: Budget updated');
      refreshBudgets();
    };
    socket.on('budget_updated', handleBudgetChange);
    socket.on('budgets_deleted', handleBudgetChange); // Compatibilidad

    // --- EVENTOS DE CHECKLIST ---
    const handleChecklistChange = (data: { projectId: string }) => {
      console.log('Real-time: Checklist updated for', data?.projectId);
      if (data?.projectId && checklistsRef.current[data.projectId]) {
        fetchProjectChecklist(data.projectId);
      }
    };
    socket.on('checklist_updated', handleChecklistChange);
    socket.on('checklist:update', handleChecklistChange); // Compatibilidad

    // Escuchar cambios de conexión a Internet (WiFi/Datos)
    const unsubscribeNet = NetInfo.addEventListener(state => {
      if (state.isConnected && !socket.connected) {
        console.log('Internet restaurado, reconectando socket...');
        socket.connect();
        fetchAllData();
      }
    });

    // Conectar si no está conectado
    if (!socket.connected) socket.connect();

    // Escuchar cambios en el estado de la App (Background/Foreground)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Al volver a la app, reconectamos y forzamos actualización por si perdimos eventos
        if (!socket.connected) socket.connect();
        fetchAllData();
      } else if (nextAppState.match(/inactive|background/)) {
        // Desconectar socket en background para ahorrar batería
        socket.disconnect();
      }
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('project_updated');
      socket.off('project_created');
      socket.off('project_deleted');
      socket.off('budget_updated');
      socket.off('budgets:update');
      socket.off('checklist_updated');
      socket.off('checklist:update');
      unsubscribeNet();
      disconnectSocket();
      subscription.remove();
    };
  }, [token]);

  // Fetch de Checklist por Proyecto
  const fetchProjectChecklist = async (projectId: string) => {
    if (!token) return;
    try {
      // Asumimos GET /api/checklist/{projectId} para obtener la lista
      const response = await api.get(`/api/checklist/project/${projectId}`);
      const data = response.data;
      
      // Mapear respuesta del backend a ChecklistItem local
      const mappedItems: ChecklistItem[] = data.map((item: any) => ({
        id: item.itemId || item.id, // Usamos itemId si existe, sino id
        text: item.text,
        completed: item.completed,
        evidenceUri: item.evidenceUri,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        shape: item.shape || 'rectangle',
        assignedTo: item.assignedTo,
        deadline: item.deadline,
        path: item.path,
        color: item.color,
        stepId: item.stepId,
        categoryId: item.categoryId,
        evidence: (item.evidences || item.evidence || []).map((e: any) => ({
          id: e.id,
          uri: e.uri,
          type: e.type?.toLowerCase() === 'video' ? 'video' : 'image'
        })),
        comments: (item.comments || []).map((c: any) => ({
          id: c.id,
          text: c.text,
          author: c.author,
          role: c.role,
          date: Array.isArray(c.createdAt) 
            ? new Date(c.createdAt[0], c.createdAt[1] - 1, c.createdAt[2], c.createdAt[3], c.createdAt[4], c.createdAt[5]).toISOString()
            : (c.createdAt || c.date || new Date().toISOString())
        }))
      }));

      setChecklists(prev => ({ ...prev, [projectId]: mappedItems }));
      updateProjectProgress(projectId, mappedItems);
    } catch (error) {
      console.error('Error fetching checklist:', error);
    }
  };

  const clearProjectChecklist = (projectId: string) => {
    setChecklists(prev => ({ ...prev, [projectId]: [] }));
  };

  const addProject = async (projectData: { name: string; client: string; architecturalPlanUri?: string; address?: string; startDate?: string; endDate?: string; status?: ProjectStatus; participants?: string[] }) => {
    if (!token) return;

    // Mapeo de estatus para el backend
    const statusMap: Record<string, string> = {
      'In Progress': 'IN_PROGRESS',
      'Delayed': 'DELAYED',
      'Completed': 'COMPLETED',
      'On Time': 'ON_TIME',
      'Not Started': 'NOT_STARTED'
    };

    const payload = {
      name: projectData.name,
      client: projectData.client,
      status: statusMap[projectData.status || 'In Progress'],
      address: projectData.address || 'Pending location',
      progress: 0,
      participants: projectData.participants || [],
      architecturalPlanUri: projectData.architecturalPlanUri, // Aquí va el Base64
      active: true
    };

    // Imprimir el JSON para verificar que participants sean Usernames y la estructura sea correcta
    console.log('Payload enviado a /api/projects/create:', JSON.stringify(payload, null, 2));

    try {
      const response = await api.post('/api/projects/create', payload);

      if (response.data) {
        // Refrescamos la lista completa desde el servidor para asegurar consistencia
        await refreshProjects();
        // Inicializamos el checklist vacío para el nuevo ID
        const newProject = response.data;
        setChecklists(prev => ({ ...prev, [newProject.id]: [] }));
      }
    } catch (error) {
      console.error('Network error creating project:', error);
      throw error; // Re-lanzamos el error para que el Modal lo capture
    }
  };

  const deleteProject = async (id: string) => {
    if (!token) return;

    try {
      await api.delete(`/api/projects/${id}`);

      setProjects(prev => prev.filter(p => p.id !== id));
      setChecklists(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  };

  const startProject = async (id: string) => {
    if (!token) return;

    const project = projects.find(p => p.id === id);
    if (!project) return;

    const today = new Date().toISOString().split('T')[0];

    const payload = {
      name: project.name,
      client: project.client,
      address: project.address,
      status: 'IN_PROGRESS',
      startDate: today,
      endDate: project.endDate,
      progress: project.progress,
      participants: []
    };

    const formData = new FormData();

    if (Platform.OS === 'web') {
      const projectBlob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      formData.append('project', projectBlob as any);
    } else {
      const json = JSON.stringify(payload);
      const b64 = btoa(unescape(encodeURIComponent(json)));
      formData.append('project', {
        uri: `data:application/json;base64,${b64}`,
        name: 'project.json',
        type: 'application/json'
      } as any);
    }

    try {
      await api.put(`/api/projects/${id}`, formData, {
        headers: { 'Content-Type': Platform.OS === 'web' ? undefined : 'multipart/form-data' },
      });

      setProjects(prev => prev.map(p => 
        p.id === id ? { ...p, status: 'In Progress', startDate: today } : p
      ));
    } catch (error: any) {
      console.error('Error starting project:', error);
      if (error.response?.status === 415) {
        console.warn('⚠️ Error 415: El backend rechazó la petición. Verifica que soporte multipart/form-data.');
      }
      throw error;
    }
  };

  const getProjectById = (id: string) => projects.find(p => p.id === id);

  const getChecklistByProjectId = (projectId: string) => checklists[projectId] || [];

  const toggleChecklistItem = async (projectId: string, itemId: string) => {
    if (!token) return;

    const currentList = checklists[projectId] || [];
    const itemToToggle = currentList.find(item => item.id === itemId);

    if (!itemToToggle) return;

    const newStatus = !itemToToggle.completed;

    const updatedList = currentList.map(i =>
      i.id === itemId ? { ...i, completed: newStatus } : i
    );

    setChecklists(prev => ({ ...prev, [projectId]: updatedList }));
    updateProjectProgress(projectId, updatedList);

    try {
      await api.put(`/api/checklist/${itemId}/status`, { completed: newStatus });
    } catch (error) {
      console.error('Error updating checklist status:', error);
      // Revertir cambios si falla la API
      const revertedList = currentList.map(i =>
        i.id === itemId ? { ...i, completed: !newStatus } : i
      );
      setChecklists(prev => ({ ...prev, [projectId]: revertedList }));
      updateProjectProgress(projectId, revertedList);
    }
  };

  const updateChecklistEvidence = (projectId: string, itemId: string, uri: string) => {
    setChecklists(prev => ({
      ...prev,
      [projectId]: prev[projectId].map(item =>
        item.id === itemId ? { ...item, evidenceUri: uri } : item
      ),
    }));
  };

  const addChecklistItem = async (projectId: string, text: string, x?: number, y?: number, width?: number, height?: number, assignedTo?: string, shape?: 'rectangle' | 'circle' | 'pencil' | 'pin', deadline?: string, path?: string, color?: string, stepId?: string, categoryId?: string) => {
    if (!token) return;

    const localId = Date.now().toString();
    
    const payload = {
      projectId,
      itemId: localId,
      text,
      completed: false,
      evidenceUri: "", 
      x: x || 0,
      y: y || 0,
      width: width || 0,
      height: height || 0,
      shape: shape || 'rectangle',
      assignedTo: assignedTo || null,
      deadline: deadline || null,
      path: path || null,
      color: color || null,
      stepId: stepId || null,
      categoryId: categoryId || null
    };

    try {
      const response = await api.post('/api/checklist', payload);
      const data = response.data;

      const newItem: ChecklistItem = {
        id: data.itemId || data.id,
        text: data.text,
        completed: data.completed,
        x: data.x,
        y: data.y,
        evidenceUri: data.evidenceUri,
        // Mantenemos los datos locales que la API básica no devolvió para que la UI no se rompa
        width, height, assignedTo, shape: shape || 'rectangle', path, deadline, color, stepId: data.stepId || stepId, categoryId: data.categoryId || categoryId,
        evidence: [],
        comments: [],
      };

      setChecklists(prev => {
        const currentList = prev[projectId] || [];
        // Evitar duplicados: Si el socket ya trajo este ítem (mismo ID), no lo agregamos de nuevo
        if (currentList.some(item => item.id === newItem.id)) {
          return prev;
        }
        const updatedList = [...currentList, newItem];
        updateProjectProgress(projectId, updatedList); // Actualizamos progreso con la nueva lista
        return { ...prev, [projectId]: updatedList };
      });
    } catch (error) {
      console.error('Error creating checklist item:', error);
      throw error;
    }
  };

  const updateProjectPlan = (projectId: string, uri: string) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, architecturalPlanUri: uri } : p
    ));
  };

  const addChecklistEvidence = async (projectId: string, itemId: string, type: 'image' | 'video', uri: string) => {
    if (!token) return;

    const tempId = Date.now().toString();
    const localEvidence = { id: tempId, type, uri };

    setChecklists(prev => ({
      ...prev,
      [projectId]: prev[projectId].map(item =>
        item.id === itemId ? { ...item, evidence: [...(item.evidence || []), localEvidence] } : item
      ),
    }));

    const formData = new FormData();
    const filename = uri.split('/').pop() || `evidence_${tempId}.${type === 'video' ? 'mp4' : 'jpg'}`;

    if (Platform.OS === 'web') {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
      } catch (e) {
        console.error('Error preparing evidence blob:', e);
        return;
      }
    } else {
      const mimeType = type === 'video' ? 'video/mp4' : 'image/jpeg';
      formData.append('file', {
        uri: uri,
        name: filename,
        type: mimeType,
      } as any);
    }

    try {
      await api.post(`/api/checklist/${itemId}/evidence`, formData, {
        headers: { 'Content-Type': Platform.OS === 'web' ? undefined : 'multipart/form-data' },
      });
    } catch (error) {
      console.error('Error uploading evidence:', error);
      setChecklists(prev => ({
        ...prev,
        [projectId]: prev[projectId].map(item =>
          item.id === itemId ? { ...item, evidence: (item.evidence || []).filter(e => e.id !== tempId) } : item
        ),
      }));
      throw error;
    }
  };

  const deleteChecklistEvidence = async (projectId: string, checklistId: string, evidenceId: string) => {
    if (!token) return;

    const currentList = checklists[projectId] || [];
    const itemIndex = currentList.findIndex(item => item.id === checklistId);
    if (itemIndex === -1) return;

    const originalEvidence = currentList[itemIndex].evidence || [];

    // Actualización optimista
    setChecklists(prev => ({
      ...prev,
      [projectId]: prev[projectId].map(item =>
        item.id === checklistId ? { ...item, evidence: (item.evidence || []).filter(e => e.id !== evidenceId) } : item
      ),
    }));

    try {
      await api.delete(`/api/checklist/${checklistId}/evidence/${evidenceId}`);
    } catch (error) {
      console.error('Error deleting evidence:', error);
      // Revertir si falla
      setChecklists(prev => ({
        ...prev,
        [projectId]: prev[projectId].map(item =>
          item.id === checklistId ? { ...item, evidence: originalEvidence } : item
        ),
      }));
      throw error;
    }
  };

  const addChecklistComment = async (projectId: string, itemId: string, text: string) => {
    if (!token) return;

    const tempId = Date.now().toString();
    const newComment = { 
      id: tempId, 
      text, 
      date: new Date().toISOString(),
      author: user?.username || 'Yo',
      role: user?.role || ''
    };

    setChecklists(prev => ({
      ...prev,
      [projectId]: prev[projectId].map(item =>
        item.id === itemId ? { ...item, comments: [...(item.comments || []), newComment] } : item
      ),
    }));

    try {
      await api.post(`/api/checklist/${itemId}/comment`, { text });
    } catch (error) {
      console.error('Error adding checklist comment:', error);
      setChecklists(prev => ({
        ...prev,
        [projectId]: prev[projectId].map(item =>
          item.id === itemId ? { ...item, comments: (item.comments || []).filter(c => c.id !== tempId) } : item
        ),
      }));
    }
  };

  const deleteChecklistItem = async (projectId: string, itemId: string) => {
    if (!token) return;

    try {
      await api.delete(`/api/checklist/${itemId}`);

      const currentList = checklists[projectId] || [];
      const updatedList = currentList.filter(item => item.id !== itemId);

      setChecklists(prev => ({ ...prev, [projectId]: updatedList }));
      updateProjectProgress(projectId, updatedList);
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      throw error;
    }
  };

  const value = {
    projects, addProject, checklists, budgets,
    getProjectById, getChecklistByProjectId, deleteProject, startProject,
    toggleChecklistItem, updateChecklistEvidence, addChecklistItem, updateProjectPlan, refreshBudgets, isBudgetsLoading, deleteChecklistEvidence,
    addChecklistEvidence, addChecklistComment, deleteChecklistItem, refreshProjects, isLoading, fetchProjectChecklist, clearProjectChecklist
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
      <GlobalAlert />
    </ProjectsContext.Provider>
  );
};

// --- Hook para usar el Contexto ---
export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects debe ser usado dentro de un ProjectsProvider');
  }
  return context;
};

/**
 * Default export to satisfy Expo Router requirements since this file is inside the 'app' directory.
 * Ideally, context files should be outside 'app' or in a folder prefixed with '_' (e.g., '_contexts').
 */
export default function ProjectsContextRoute() {
  return null;
}