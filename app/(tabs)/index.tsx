import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, useWindowDimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons'; // Assuming Feather is correctly imported
import { useProjects } from '../../contexts/ProjectsContext'; // Assuming useProjects is correctly imported
import { useEvents, CalendarEvent } from '../../contexts/EventsContext';
import { Project } from '../../types'; // Adjusted path to types.ts
import i18n from '../../constants/i18n';

type ProjectStatus = Project['status'];

const FILTERS = ['All', 'In Progress', 'Delayed'] as const;
type FilterType = typeof FILTERS[number];

// --- Tipos y Datos Simulados para Notificaciones ---
interface Notification {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  text: string;
}

const mockNotifications: Notification[] = [
  { id: '1', icon: 'file-plus', text: 'New budget approved for "Horizon Tower".' },
  { id: '2', icon: 'alert-circle', text: 'Checklist for "Zenith" has 2 delayed items.' },
  { id: '3', icon: 'message-square', text: 'You have a new message from "Garcia Family".' },
];

// --- Componente para un solo ítem de la lista ---
const ProjectListItem: React.FC<{ item: Project }> = ({ item }) => {
  const statusInfo = {
    'Not Started': { color: '#718096', label: i18n.t('dashboard.status.notStarted') || 'Not Started' },
    'In Progress': { color: '#3182CE', label: i18n.t('dashboard.status.inProgress') },
    'Delayed': { color: '#E53E3E', label: i18n.t('dashboard.status.delayed') },
    'Completed': { color: '#38A169', label: i18n.t('dashboard.status.completed') },
    'On Time': { color: '#38A169', label: i18n.t('dashboard.status.onTime') },
  };

  const currentStatus = statusInfo[item.status as keyof typeof statusInfo] || statusInfo['In Progress'];

  return (
    <Pressable>
      <View style={styles.projectCard}>
        {/* Cabecera: Nombre y Tag de Estado */}
        <View style={styles.cardHeader}>
          <Text style={styles.projectName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: currentStatus.color }]}>
            <Text style={styles.statusText}>{currentStatus.label}</Text>
          </View>
        </View>

        {/* Dirección */}
        <Text style={styles.projectAddress}>{item.address || 'No address assigned'}</Text>

        {/* Barra de Progreso */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${item.progress}%`, backgroundColor: currentStatus.color }]} />
          </View>
          <Text style={styles.progressText}>{item.progress}%</Text>
        </View>

        {/* Lista de Participantes */}
        <View style={styles.participantsContainer}>
          {item.participants.map((participant, index) => {
            const participantStr = String(participant || '');
            const isUrl = participantStr.startsWith('http');
            return (
              <View key={index} style={[styles.participantWrapper, { marginLeft: index > 0 ? -12 : 0, zIndex: item.participants.length - index }]}>
                {isUrl ? (
                  <Image 
                    source={{ uri: participantStr }} 
                    style={styles.participantAvatar} 
                  />
                ) : (
                  <View style={[styles.participantAvatar, styles.participantInitials]}>
                    <Text style={styles.initialsText}>{participantStr.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
};

// --- Componente para la sección de Notificaciones ---
const Notifications: React.FC<{ notifications: Notification[] }> = ({ notifications }) => (
  <View style={styles.sidebarSection}>
    <Text style={styles.sectionTitle}>{i18n.t('dashboard.notifications')}</Text>
    {notifications.map(notif => (
      <View key={notif.id} style={styles.notificationItem}>
        <Feather name={notif.icon} size={20} color="#4A5568" style={styles.sidebarIcon} />
        <Text style={styles.sidebarText}>{notif.text}</Text>
      </View>
    ))}
  </View>
);

// --- Componente para la sección de Próximos Hitos ---
const UpcomingMilestones: React.FC<{ milestones: CalendarEvent[] }> = ({ milestones }) => {
  const router = useRouter();

  return (
    <View style={styles.sidebarSection}>
      <Text style={styles.sectionTitle}>{i18n.t('dashboard.upcomingMilestones')}</Text>
      {milestones.map(milestone => {
        // Convertir string YYYY-MM-DD a objeto Date para mostrar día y mes
        const [y, m, d] = milestone.date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);

        return (
          <Pressable 
            key={milestone.id} 
            style={styles.milestoneItem}
            onPress={() => router.push({ pathname: '/(tabs)/agenda', params: { date: milestone.date } })}
          >
            <View style={styles.calendarIcon}>
              <Text style={styles.calendarMonth}>{dateObj.toLocaleString('es-ES', { month: 'short' }).toUpperCase()}</Text>
              <Text style={styles.calendarDay}>{d}</Text>
            </View>
            <View style={styles.milestoneDetails}>
              <Text style={styles.milestoneTitle}>{milestone.title}</Text>
              <Text style={styles.milestoneProjectName}>{milestone.time} - {milestone.type}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

// --- Componente Principal del Dashboard ---
export default function DashboardScreen() {
  const { projects, getChecklistByProjectId } = useProjects(); // Usamos los proyectos del contexto
  const { events } = useEvents(); // Usamos los eventos del contexto
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 1024; // Breakpoint para mostrar columnas

  // Filtrar próximos hitos (eventos futuros)
  const upcomingMilestones = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return events
      .filter(e => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5); // Mostrar solo los 5 más próximos
  }, [events]);

  // useMemo optimiza el rendimiento, recalculando la lista solo si los proyectos o el filtro cambian.
  const filteredProjects = useMemo(() => {
    if (activeFilter === 'All') {
      // Mostramos todos excepto los completados, ya que la sección es de "Proyectos Activos".
      return projects.filter(p => p.status !== 'Completed');
    }
    return projects.filter(p => p.status === activeFilter);
  }, [activeFilter, projects]);

  // Calcular tareas vencidas dinámicamente
  const overdueTasksCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let count = 0;
    projects.forEach(p => {
      const tasks = getChecklistByProjectId(p.id);
      // Contamos tareas no completadas con fecha límite estricta menor a hoy
      count += tasks.filter(t => !t.completed && t.deadline && t.deadline < today).length;
    });
    return count;
  }, [projects, getChecklistByProjectId]);

  // Combinar notificaciones estáticas con la alerta dinámica
  const displayNotifications = useMemo(() => {
    const notifs = [...mockNotifications];
    if (overdueTasksCount > 0) {
      notifs.unshift({
        id: 'alert-overdue',
        icon: 'alert-triangle',
        text: `¡Atención! Tienes ${overdueTasksCount} tarea(s) vencida(s).`
      });
    }
    return notifs;
  }, [overdueTasksCount]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['right', 'bottom', 'left']}>
      <ScrollView style={styles.scrollView}>
        <View style={[styles.container, !isLargeScreen && { flexDirection: 'column' }]}>
          {/* --- Columna Principal (Proyectos) --- */}
          <View style={isLargeScreen ? styles.mainContent : styles.fullWidthContent}>
            <Text style={styles.title}>{i18n.t('dashboard.activeProjects')}</Text>

            {/* Pestañas de Filtro */}
            <View style={styles.filterContainer}>
              {FILTERS.map(filter => (
                <Pressable
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[styles.filterButton, activeFilter === filter && styles.filterButtonActive]}
                >
                  <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                    {filter === 'All' ? i18n.t('dashboard.filters.all') : 
                     filter === 'In Progress' ? i18n.t('dashboard.filters.inProgress') :
                     i18n.t('dashboard.filters.delayed')}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Lista de Proyectos */}
            <FlatList
              data={filteredProjects}
              renderItem={({ item }) => (
                <Link
                  href={{ 
                    pathname: '/(tabs)/[id]' as any,
                    params: { id: item.id },
                  }}
                  asChild>
                  <ProjectListItem item={item} />
                </Link>
              )}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContentContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{i18n.t('dashboard.empty')}</Text>
                </View>
              }
              // Deshabilitar el scroll de la FlatList para que el ScrollView principal controle todo
              scrollEnabled={false} 
            />
          </View>

          {/* --- Barra Lateral (Notificaciones y Hitos) --- */}
          <View style={isLargeScreen ? styles.sidebar : styles.fullWidthContent}>
            <Notifications notifications={displayNotifications} />
            <UpcomingMilestones milestones={upcomingMilestones} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    flexDirection: 'row',
    gap: 24,
  },
  mainContent: {
    flex: 2, // Ocupa 2/3 del espacio
  },
  fullWidthContent: {
    flex: 1, // Ocupa todo el ancho en pantallas pequeñas
  },
  sidebar: {
    flex: 1, // Ocupa 1/3 del espacio
    gap: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 24,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F2F5',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  filterTextActive: {
    color: '#1A202C',
  },
  listContentContainer: {
    paddingBottom: 24,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    // Sombra suave
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  projectAddress: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32, // Altura fija para evitar saltos
  },
  participantWrapper: {
    // Contenedor para manejar el zIndex y margen negativo
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  participantInitials: {
    backgroundColor: '#4A5568',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    marginTop: 50,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
  },
  // Estilos para los nuevos componentes
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 16,
  },
  sidebarSection: {
    width: '100%',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sidebarIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  sidebarText: {
    flex: 1,
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  calendarMonth: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#718096',
  },
  calendarDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  milestoneDetails: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  milestoneProjectName: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
});