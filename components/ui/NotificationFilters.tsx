import { Fonts } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NotificationFilter } from '../../contexts/NotificationsContext';
import { useTheme } from '../../contexts/ThemeContext';

interface NotificationFiltersProps {
  filter: NotificationFilter;
  setFilter: (filter: NotificationFilter) => void;
}

export default function NotificationFilters({ filter, setFilter }: NotificationFiltersProps) {
  const { theme } = useTheme();
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
      <View style={styles.wrapContent}>
        {filters.map((f) => (
          <Pressable
            key={f.id}
            style={[
              styles.chip,
              filter === f.id && { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }
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
      </View>
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
  wrapContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#718096',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
  },
});