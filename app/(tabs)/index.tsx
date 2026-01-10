import { Feather } from '@expo/vector-icons'; // Assuming Feather is correctly imported
import { Link, useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Image, LayoutAnimation, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, UIManager, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationFilters from '../../components/ui/NotificationFilters';
import i18n from '../../constants/i18n';
import { CalendarEvent, useEvents } from '../../contexts/EventsContext';
import { AppNotification, NotificationFilter, useNotifications } from '../../contexts/NotificationsContext';
import { useProjects } from '../../contexts/ProjectsContext'; // Assuming useProjects is correctly imported
import api from '../../services/api';
import { Project } from '../../types'; // Adjusted path to types.ts
import { MenuContext } from './_layout';

type ProjectStatus = Project['status'];

const FILTERS = ['All', 'In Progress', 'Delayed', 'Completed'] as const;
type FilterType = typeof FILTERS[number];

// Habilitar animaciones de layout en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
            let imageUri = null;
            let nameForAvatar = '?';

            if (typeof participant === 'string') {
              if (participant.startsWith('http')) imageUri = participant;
              else nameForAvatar = participant;
            } else if (participant && typeof participant === 'object') {
              if (participant.imageUri) {
                 const baseURL = api.defaults.baseURL || process.env.EXPO_PUBLIC_API_URL || '';
                 imageUri = participant.imageUri.startsWith('http') ? participant.imageUri : `${baseURL}${participant.imageUri.startsWith('/') ? '' : '/'}${participant.imageUri}`;
              }
              if (participant.username) nameForAvatar = participant.username;
              else if (participant.name) nameForAvatar = participant.name; // Fallback si no hay username
            }

            // Usar UI Avatars como fallback si no hay imagen
            const finalUri = imageUri || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=random&color=fff&size=128&bold=true&format=png`;

            return (
              <View key={index} style={[styles.participantWrapper, { marginLeft: index > 0 ? -12 : 0, zIndex: item.participants.length - index }]}>
                <Image source={{ uri: finalUri }} style={[styles.participantAvatar, { backgroundColor: '#CBD5E0' }]} />
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
};

// --- Componente Animado para Ítem de Notificación ---
const AnimatedNotificationItem: React.FC<{ 
  notif: AppNotification; 
  onPress: (n: AppNotification) => void;
  index: number;
}> = ({ notif, onPress, index }) => {
  // Valores iniciales: Opacidad 0 y desplazado -20px hacia arriba
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    // Retraso escalonado basado en el índice (módulo 5 para que funcione bien con la paginación)
    const delay = (index % 5) * 100;

    // Ejecutar animación paralela al montar el componente
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true })
      ])
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Pressable style={styles.notificationItem} onPress={() => onPress(notif)}>
        <Feather 
          name={notif.icon} 
          size={20} 
          color={notif.read ? "#A0AEC0" : "#3182CE"} 
          style={styles.sidebarIcon} 
        />
        <View style={{ flex: 1 }}>
          {notif.title ? <Text style={[styles.sidebarText, { fontWeight: 'bold', marginBottom: 2, flex: 0 }]}>{notif.title}</Text> : null}
          <Text style={[styles.sidebarText, !notif.read && { fontWeight: '600', color: '#2D3748' }, { flex: 0 }]}>{notif.text}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

// --- Componente para la sección de Notificaciones ---
const Notifications: React.FC<{ 
  notifications: AppNotification[], 
  onMarkAsRead: (id: string) => void, 
  onMarkAllRead: () => void,
  filter: NotificationFilter,
  setFilter: (f: NotificationFilter) => void,
  loadMore: () => void,
  hasMore: boolean,
  isLoading: boolean
}> = ({ notifications, onMarkAsRead, onMarkAllRead, filter, setFilter, loadMore, hasMore, isLoading }) => {
  const router = useRouter();

  // Animar cambios en la lista (ej. al cargar más)
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [notifications]);

  const handlePress = (notif: AppNotification) => {
    if (!notif.read) onMarkAsRead(notif.id);

    if (notif.category && notif.referenceId) {
      switch (notif.category) {
        case 'PROJECT':
        case 'CHECKLIST': // Asumimos que referenceId es el ID del proyecto para checklist también
          router.push({ pathname: '/(tabs)/[id]', params: { id: notif.referenceId } });
          break;
        case 'AGENDA':
          // Si referenceId es una fecha YYYY-MM-DD, la pasamos como parámetro
          if (/^\d{4}-\d{2}-\d{2}$/.test(notif.referenceId)) {
            router.push({ pathname: '/(tabs)/agenda', params: { date: notif.referenceId } });
          } else {
            router.push('/(tabs)/agenda');
          }
          break;
        case 'BUDGET':
          router.push('/(tabs)/budgets');
          break;
        default:
          break;
      }
    }
  };

  return (
    <View style={styles.sidebarSection}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{i18n.t('dashboard.notifications')}</Text>
        {notifications.some(n => !n.read) && (
          <Pressable onPress={onMarkAllRead}>
            <Text style={{ fontSize: 12, color: '#3182CE', fontWeight: '600' }}>Marcar leídas</Text>
          </Pressable>
        )}
      </View>

      {/* Filtros de Notificaciones */}
      <View style={{ marginBottom: 12 }}>
        <NotificationFilters filter={filter} setFilter={setFilter} />
      </View>

      {notifications.map((notif, index) => (
        <AnimatedNotificationItem key={notif.id} notif={notif} onPress={handlePress} index={index} />
      ))}
      
      {isLoading && <ActivityIndicator size="small" color="#3182CE" style={{ marginVertical: 10 }} />}

      {hasMore && !isLoading && (
        <Pressable onPress={loadMore} style={{ padding: 12, alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 8, marginTop: 8 }}>
          <Text style={{ color: '#3182CE', fontWeight: '600', fontSize: 14 }}>Cargar más notificaciones</Text>
        </Pressable>
      )}

      {notifications.length === 0 && !isLoading && (
        <Text style={{ color: '#A0AEC0', fontStyle: 'italic', fontSize: 14, textAlign: 'center', marginTop: 10 }}>No hay notificaciones.</Text>
      )}
    </View>
  );
};

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

const DashboardSkeleton = () => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 1024;

  return (
    <SafeAreaView style={styles.safeArea} edges={['right', 'bottom', 'left']}>
      <View style={[styles.container, !isLargeScreen && { flexDirection: 'column' }]}>
        {/* Main Content Skeleton */}
        <View style={isLargeScreen ? styles.mainContent : styles.fullWidthContent}>
          <SkeletonItem style={{ width: 200, height: 32, marginBottom: 24 }} />
          <SkeletonItem style={{ width: '100%', height: 40, marginBottom: 24, borderRadius: 10 }} />
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.projectCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <SkeletonItem style={{ width: 150, height: 24 }} />
                <SkeletonItem style={{ width: 80, height: 24, borderRadius: 12 }} />
              </View>
              <SkeletonItem style={{ width: 200, height: 16, marginBottom: 16 }} />
              <SkeletonItem style={{ width: '100%', height: 8, marginBottom: 16 }} />
              <View style={{ flexDirection: 'row' }}>
                <SkeletonItem style={{ width: 32, height: 32, borderRadius: 16, marginRight: -10 }} />
                <SkeletonItem style={{ width: 32, height: 32, borderRadius: 16, marginRight: -10 }} />
                <SkeletonItem style={{ width: 32, height: 32, borderRadius: 16 }} />
              </View>
            </View>
          ))}
        </View>

        {/* Sidebar Skeleton */}
        <View style={isLargeScreen ? styles.sidebar : styles.fullWidthContent}>
          <View style={styles.sidebarSection}>
            <SkeletonItem style={{ width: 150, height: 24, marginBottom: 16 }} />
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 16 }}>
                <SkeletonItem style={{ width: 20, height: 20, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <SkeletonItem style={{ width: '80%', height: 16, marginBottom: 4 }} />
                  <SkeletonItem style={{ width: '60%', height: 16 }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

// --- Componente Principal del Dashboard ---
export default function DashboardScreen() {
  const { projects, getChecklistByProjectId, refreshProjects, isLoading: isProjectsLoading } = useProjects(); // Usamos los proyectos del contexto
  const { events, refreshEvents } = useEvents(); // Usamos los eventos del contexto
  const { displayedNotifications, filter, setFilter, loadMore, hasMore, isLoading, markAsRead, markAllAsRead, refreshNotifications } = useNotifications(); // Usamos las notificaciones del contexto
  const { reloadMenu } = useContext(MenuContext);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 1024; // Breakpoint para mostrar columnas
  const [refreshing, setRefreshing] = useState(false);

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
      return projects;
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
    // Clonamos las notificaciones del contexto
    const notifs = [...displayedNotifications];
    // Solo mostramos la alerta de tareas vencidas si el filtro es 'ALL' o 'UNREAD'
    if (overdueTasksCount > 0 && (filter === 'ALL' || filter === 'UNREAD')) {
      notifs.unshift({
        id: 'alert-overdue',
        icon: 'alert-triangle',
        text: `¡Atención! Tienes ${overdueTasksCount} tarea(s) vencida(s).`,
        date: new Date().toISOString(),
        read: false,
      });
    }
    return notifs;
  }, [overdueTasksCount, displayedNotifications, filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        reloadMenu(),
        refreshProjects(),
        refreshNotifications(),
        refreshEvents()
      ]);
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    } finally {
      setRefreshing(false);
    }
  }, [reloadMenu, refreshProjects, refreshNotifications, refreshEvents]);

  // Mostrar Skeleton solo en carga inicial (si no hay proyectos y no estamos refrescando manualmente)
  if (isProjectsLoading && !refreshing && projects.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['right', 'bottom', 'left']}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3182CE']} />
        }
      >
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
                     filter === 'Delayed' ? i18n.t('dashboard.filters.delayed') :
                     i18n.t('dashboard.status.completed')}
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
            <Notifications 
              notifications={displayNotifications} 
              onMarkAsRead={markAsRead}
              onMarkAllRead={markAllAsRead}
              filter={filter}
              setFilter={setFilter}
              loadMore={loadMore}
              hasMore={hasMore}
              isLoading={isLoading}
            />
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
    width: '100%', // Ocupa todo el ancho en pantallas pequeñas
  },
  sidebar: {
    flex: 1, // Ocupa 1/3 del espacio
    gap: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-Bold',
  },
  projectAddress: {
    fontSize: 14,
    color: '#718096',
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Bold',
  },
  emptyContainer: {
    marginTop: 50,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    fontFamily: 'Inter-Regular',
  },
  // Estilos para los nuevos componentes
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Bold',
    color: '#718096',
  },
  calendarDay: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
    color: '#1A202C',
  },
  milestoneDetails: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
  },
  milestoneProjectName: {
    fontSize: 12,
    color: '#718096',
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
});