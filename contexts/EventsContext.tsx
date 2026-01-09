import NetInfo from '@react-native-community/netinfo';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import api from '../services/api';
import { disconnectSocket, initSocket } from '../services/socket';
import { useAuth } from './AuthContext';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string;
  type: 'Meeting' | 'Inspection' | 'Delivery' | 'Deadline' | 'Other';
}

interface EventsContextType {
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  updateEvent: (event: CalendarEvent) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};

export const EventsProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { token } = useAuth();
  
  // Ref para acceder al estado actual de eventos dentro de los listeners del socket
  const eventsRef = useRef(events);
  useEffect(() => { eventsRef.current = events; }, [events]);

  const fetchEvents = async () => {
    if (!token) return;
    try {
      const response = await api.get('/api/agenda');
      setEvents(response.data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  useEffect(() => {
    if (!token) return;

    // 1. Carga inicial
    fetchEvents();

    // 2. Inicializar Socket
    const socket = initSocket(token);

    // 3. Escuchar Eventos del Servidor
    socket.on('connect', () => {
      console.log('✅ Socket Conectado para Agenda!');
      fetchEvents(); // Re-sincronizar al conectar (asegura consistencia)
    });

    const handleAgendaChange = () => {
      console.log('Real-time: Agenda change detected');
      fetchEvents();
    };
    socket.on('agenda_updated', handleAgendaChange);

    // 4. Manejo de estado de la App y Red
    const unsubscribeNet = NetInfo.addEventListener(state => {
      if (state.isConnected && !socket.connected) {
        socket.connect();
      }
    });

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !socket.connected) {
        socket.connect();
      } else if (nextAppState.match(/inactive|background/)) {
        socket.disconnect();
      }
    });

    return () => {
      socket.off('connect');
      socket.off('agenda_updated', handleAgendaChange);
      unsubscribeNet();
      subscription.remove();
      disconnectSocket();
    };
  }, [token]);

  const addEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    try {
      const response = await api.post('/api/agenda', event);
      setEvents((prev) => [...prev, response.data]);
    } catch (error) {
      console.error("Error adding event:", error);
      throw error;
    }
  };

  const updateEvent = async (updatedEvent: CalendarEvent) => {
    try {
      await api.put(`/api/agenda/${updatedEvent.id}`, updatedEvent);
      setEvents((prev) => prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)));
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await api.delete(`/api/agenda/${id}`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    }
  };

  return (
    <EventsContext.Provider value={{ events, addEvent, updateEvent, deleteEvent, refreshEvents: fetchEvents }}>
      {children}
    </EventsContext.Provider>
  );
};