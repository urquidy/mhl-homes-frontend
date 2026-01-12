import { Feather } from '@expo/vector-icons';
import { Link, useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, UIManager, View } from 'react-native';
import i18n from '../../constants/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { useProjects } from '../../contexts/ProjectsContext';
import api from '../../services/api';

// Habilitar animaciones de layout en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Componente para el grupo de proyecto (Rama del árbol)
const ProjectGroup = ({ project, items }: { project: any, items: any[] }) => {
  const [expanded, setExpanded] = useState(true);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.projectGroup}>
      <Pressable onPress={toggleExpand} style={styles.groupHeader}>
        <Feather name={expanded ? "chevron-down" : "chevron-right"} size={20} color="#4A5568" />
        <Text style={styles.groupTitle}>{project.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{items.length}</Text>
        </View>
      </Pressable>
      
      {expanded && (
        <View style={styles.groupContent}>
          {items.map((item: any) => (
            <Link key={item.id} href={{ pathname: '/(tabs)/[id]' as any, params: { id: project.id } }} asChild>
              <Pressable style={styles.checklistItem}>
                <Feather 
                  name={item.completed ? "check-square" : "square"} 
                  size={18} 
                  color={item.completed ? "#38A169" : "#A0AEC0"} 
                />
                <Text style={[styles.checklistItemText, item.completed && styles.checklistItemTextCompleted]}>{item.text}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </View>
  );
};

export default function ChecklistScreen() {
  const navigation = useNavigation();
  const { projects } = useProjects();
  const { token } = useAuth();
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => console.log('Nueva Tarea')} style={{ marginRight: 15 }}>
          <Feather name="plus" size={24} color="#3182CE" />
        </Pressable>
      ),
    });
  }, [navigation]);

  // Consumir endpoint GET /api/checklist/my-tasks al entrar a la pantalla
  useFocusEffect(
    useCallback(() => {
      const fetchMyTasks = async () => {
        if (!token) return;
        setLoading(true);
        try {
          const response = await api.get('/api/checklist/my-tasks');
          setMyTasks(response.data || []);
        } catch (error) {
          console.error('Error fetching my tasks:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchMyTasks();
    }, [token])
  );

  // Agrupar tareas por Proyecto
  const tasksByProject = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    myTasks.forEach(task => {
      const pId = task.projectId;
      if (!grouped[pId]) grouped[pId] = [];
      grouped[pId].push(task);
    });
    return grouped;
  }, [myTasks]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{i18n.t('checklist.title')}</Text>
      <Text style={styles.subtitle}>{i18n.t('checklist.subtitle')}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3182CE" style={{ marginTop: 20 }} />
      ) : (
        Object.keys(tasksByProject).map(projectId => {
          // Buscamos la info del proyecto en el contexto para obtener el nombre
          const project = projects.find(p => p.id === projectId);
          // Si no encontramos el proyecto (quizás archivado o sin acceso), usamos un placeholder o saltamos
          if (!project) return null;
          
          return <ProjectGroup key={projectId} project={project} items={tasksByProject[projectId]} />;
        })
      )}
      
      {!loading && myTasks.length === 0 && (
        <Text style={{ textAlign: 'center', color: '#718096', marginTop: 20, fontStyle: 'italic' }}>
          {i18n.t('checklist.myTasksEmpty')}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A202C', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#718096', marginBottom: 32 },
  
  // Estilos del Árbol (Accordion)
  projectGroup: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F7FAFC',
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginLeft: 12,
    flex: 1,
  },
  badge: {
    backgroundColor: '#3182CE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  groupContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  checklistItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginLeft: 16, // Indentación para efecto de árbol
  },
  checklistItemText: { fontSize: 16, color: '#4A5568', marginLeft: 12, flex: 1 },
  checklistItemTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#A0AEC0',
  },
});