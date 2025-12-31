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

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (text: string, icon?: keyof typeof Feather.glyphMap) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refreshNotifications = useCallback(async () => {
    if (!token) return;
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
        return [...newFromSocket, ...mappedNotifications].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
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

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, refreshNotifications }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationsProvider');
  return context;
};