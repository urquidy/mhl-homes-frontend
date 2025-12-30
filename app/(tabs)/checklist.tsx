import React, { useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useProjects } from '../../contexts/ProjectsContext';
import { Feather } from '@expo/vector-icons';
import { Link, useNavigation } from 'expo-router';
import i18n from '../../constants/i18n';

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
                <Feather name="square" size={18} color="#A0AEC0" />
                <Text style={styles.checklistItemText}>{item.text}</Text>
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
  const { projects, getChecklistByProjectId } = useProjects();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => console.log('Nueva Tarea')} style={{ marginRight: 15 }}>
          <Feather name="plus" size={24} color="#3182CE" />
        </Pressable>
      ),
    });
  }, [navigation]);

  // Filtramos solo los proyectos que están "En Progreso" o "Retrasado"
  const activeProjects = projects.filter(p => p.status !== 'Completed');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{i18n.t('checklist.title')}</Text>
      <Text style={styles.subtitle}>{i18n.t('checklist.subtitle')}</Text>

      {activeProjects.map(project => {
        const projectChecklist = getChecklistByProjectId(project.id);
        const pendingItems = projectChecklist.filter(item => !item.completed);

        // Si no hay tareas pendientes para este proyecto, no lo mostramos.
        if (pendingItems.length === 0) {
          return null;
        }

        return <ProjectGroup key={project.id} project={project} items={pendingItems} />;
      })}
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
});