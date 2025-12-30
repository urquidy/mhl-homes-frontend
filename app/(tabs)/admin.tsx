import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function AdminScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Administrator</Text>
      <Text style={styles.subtitle}>Manage catalogs and users</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Catalogs</Text>
        
        <Pressable style={styles.card} onPress={() => console.log('Manage Categories')}>
            <View style={styles.cardIcon}>
                <Feather name="list" size={24} color="#3182CE" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Budget Categories</Text>
                <Text style={styles.cardDescription}>Manage expense categories (Partidas)</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#CBD5E0" />
        </Pressable>

        {/* Aquí puedes agregar más catálogos en el futuro */}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Users</Text>
        <Pressable style={styles.card} onPress={() => console.log('Manage Users')}>
            <View style={styles.cardIcon}>
                <Feather name="users" size={24} color="#38A169" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>User Management</Text>
                <Text style={styles.cardDescription}>Add, remove or edit users</Text>
            </View>
            <Feather name="chevron-right" size={24} color="#CBD5E0" />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1A202C', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#718096', marginBottom: 32 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3748', marginBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  cardDescription: { fontSize: 14, color: '#718096', marginTop: 2 },
});