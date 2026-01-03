import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { initSocket } from '../services/socket';

export interface AppNotification {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  text: string;
  date: string;
  read: boolean;
  title?: string;
  type?: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  category?: 'PROJECT' | 'AGENDA' | 'CHECKLIST' | 'BUDGET';
  referenceId?: string;
}

export type NotificationFilter = 'ALL' | 'UNREAD' | 'READ' | 'PROJECT' | 'AGENDA' | 'CHECKLIST' | 'BUDGET';

interface NotificationsContextType {
  notifications: AppNotification[]; // Lista completa (raw)
  displayedNotifications: AppNotification[]; // Lista procesada para mostrar (filtrada y paginada)
  unreadCount: number;
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  addNotification: (text: string, icon?: keyof typeof Feather.glyphMap) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>('ALL');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const ITEMS_PER_PAGE = 5;

  const refreshNotifications = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await api.get('/api/notifications');
      // Mapeamos la respuesta del backend a nuestra estructura local
      const mappedNotifications: AppNotification[] = response.data.map((n: any) => ({
        id: n.id,
        // Asignamos icono según los tipos definidos: INFO, WARNING, ERROR, SUCCESS
        icon: (() => {
          switch (n.type) {
            case 'WARNING': return 'alert-triangle';
            case 'ERROR': return 'alert-circle';
            case 'SUCCESS': return 'check-circle';
            case 'INFO': return 'info';
            default: return 'bell';
          }
        })(),
        text: n.message || n.text || n.body, // Priorizamos 'message' del JSON
        date: n.createdAt || n.date,
        read: n.read || n.isRead || false,
        title: n.title,
        type: n.type,
        category: n.category,
        referenceId: n.referenceId
      }));
      
      // Fusión inteligente: Mantenemos el historial de la API y agregamos cualquier 
      // notificación nueva que haya llegado por socket mientras se hacía la petición.
      setNotifications(prev => {
        const historyIds = new Set(mappedNotifications.map(n => n.id));
        const newFromSocket = prev.filter(n => !historyIds.has(n.id));
        // Guardamos la lista completa. El ordenamiento visual lo haremos en el useMemo 'processedNotifications'
        return [...newFromSocket, ...mappedNotifications];
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Cargar notificaciones al iniciar o cambiar de usuario
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // Conexión al Socket para notificaciones en tiempo real
  useEffect(() => {
    if (!token) return;

    const socket = initSocket(token);

    // Asegurar que el socket esté conectado (por si otros contextos no lo hicieron)
    if (!socket.connected) {
      console.log('🔌 Conectando socket desde NotificationsContext...');
      socket.connect();
    }

    socket.on('connect', () => {
      console.log('✅ Socket Conectado para Notificaciones!');
      refreshNotifications(); // Re-sincronizar al conectar (asegura consistencia)
    });

    socket.on('disconnect', (reason: any) => {
      console.log('❌ Socket Desconectado (Notifications):', reason);
    });

    const handleNotification = (data: any) => {
      console.log("🔔 EVENTO RECIBIDO:", data);
      const currentUserId = user?.id;
      console.log("Mi ID:", currentUserId);
      console.log("Destinatario:", data.recipientId);
      
      const processNotification = () => {
        const newNotif: AppNotification = {
          id: data.id || Date.now().toString(),
          icon: (() => {
            switch (data.type) {
              case 'WARNING': return 'alert-triangle';
              case 'ERROR': return 'alert-circle';
              case 'SUCCESS': return 'check-circle';
              case 'INFO': return 'info';
              default: return 'bell';
            }
          })(),
          text: data.message || data.text || data.body,
          date: data.createdAt || data.date || new Date().toISOString(),
          read: false,
          title: data.title,
          type: data.type,
          category: data.category,
          referenceId: data.referenceId
        };
        setNotifications(prev => [newNotif, ...prev]);
      };

      // Usamos == para comparar por si vienen tipos distintos (string vs number)
      if (data.recipientId == currentUserId) {
        processNotification();
      } else if (data.recipientId === null) {
        processNotification();
      } else {
        console.log('Notificación ignorada: No es para este usuario.');
      }
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('notification', handleNotification);
    };
  }, [token, user, refreshNotifications]);

  const addNotification = (text: string, icon: keyof typeof Feather.glyphMap = 'bell') => {
    const newNotif: AppNotification = {
      id: Date.now().toString(),
      icon,
      text,
      date: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markAsRead = async (id: string) => {
     // Actualización optimista en UI
     setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
     try {
       await api.put(`/api/notifications/${id}/read`);
     } catch (error) {
       console.error('Error marking notification as read:', error);
     }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await api.put('/api/notifications/read-all');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // --- LÓGICA DE ORDENAMIENTO Y FILTRADO ---
  const processedNotifications = useMemo(() => {
    let result = [...notifications];

    // 1. Ordenar: Primero las NO LEÍDAS, luego por fecha descendente
    result.sort((a, b) => {
      if (a.read === b.read) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return a.read ? 1 : -1; // false (no leída) va antes que true (leída)
    });

    // 2. Filtrar según selección
    if (filter === 'UNREAD') {
      result = result.filter(n => !n.read);
    } else if (filter === 'READ') {
      result = result.filter(n => n.read);
    } else if (['PROJECT', 'AGENDA', 'CHECKLIST', 'BUDGET'].includes(filter)) {
      result = result.filter(n => n.category === filter);
    }

    return result;
  }, [notifications, filter]);

  // --- LÓGICA DE PAGINACIÓN ---
  const displayedNotifications = useMemo(() => {
    return processedNotifications.slice(0, page * ITEMS_PER_PAGE);
  }, [processedNotifications, page]);

  const hasMore = displayedNotifications.length < processedNotifications.length;

  const loadMore = useCallback(() => {
    if (hasMore) setPage(p => p + 1);
  }, [hasMore]);

  // Resetear a la página 1 cuando cambia el filtro
  useEffect(() => { setPage(1); }, [filter]);

  return (
    <NotificationsContext.Provider value={{ notifications, displayedNotifications, unreadCount, filter, setFilter, loadMore, hasMore, isLoading, addNotification, markAsRead, markAllAsRead, refreshNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationsProvider');
  return context;
};