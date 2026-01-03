import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { NotificationFilter } from '../../contexts/NotificationsContext';

interface NotificationFiltersProps {
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
}

export default function NotificationFilters({ filter, setFilter }: NotificationFiltersProps) {
  const filters: { id: NotificationFilter; label: string }[] = [
    { id: 'ALL', label: 'Todas' },
    { id: 'UNREAD', label: 'No leídas' },
    { id: 'READ', label: 'Leídas' },
    { id: 'PROJECT', label: 'Proyectos' },
    { id: 'AGENDA', label: 'Agenda' },
    { id: 'CHECKLIST', label: 'Checklist' },
    { id: 'BUDGET', label: 'Presupuesto' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((f) => (
          <Pressable
            key={f.id}
            style={[
              styles.chip,
              filter === f.id && styles.chipSelected
            ]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[
              styles.chipText,
              filter === f.id && styles.chipTextSelected
            ]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipSelected: {
    backgroundColor: '#3182CE',
    borderColor: '#3182CE',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    color: '#718096',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});