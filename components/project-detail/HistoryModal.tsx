// d:\Codigo Fuente\mhl-homes\mhl-homes\components\project-detail\HistoryModal.tsx

import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import i18n from '../../constants/i18n';

interface AuditLog {
  action: string;
  timestamp: string;
  username?: string;
  description?: string;
  [key: string]: any;
}

interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  isLoading: boolean;
  auditLogs: AuditLog[];
}

export default function HistoryModal({ visible, onClose, isLoading, auditLogs }: HistoryModalProps) {
  const [historyFilter, setHistoryFilter] = useState<string>('ALL');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.inputModalContainer}>
        <View style={styles.inputModalContent}>
          <View style={styles.header}>
            <Text style={styles.inputModalTitle}>{i18n.t('history.title')}</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color="#4A5568" />
            </Pressable>
          </View>

          {/* Filtros de Historial */}
          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { key: 'ALL', label: i18n.t('history.filterAll') },
                { key: 'STATUS_CHANGE', label: i18n.t('history.filterStatus') },
                { key: 'UPDATE', label: i18n.t('history.filterUpdate') },
                { key: 'CREATE', label: i18n.t('history.filterCreate') },
              ].map((filter) => (
                <Pressable 
                  key={filter.key}
                  style={[styles.filterChip, historyFilter === filter.key && styles.filterChipActive]}
                  onPress={() => setHistoryFilter(filter.key)}
                >
                  <Text style={[styles.filterChipText, historyFilter === filter.key && styles.filterChipTextActive]}>{filter.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={styles.listContainer}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#3182CE" style={{ marginVertical: 20 }} />
            ) : auditLogs && auditLogs.length > 0 ? (
              auditLogs
                .filter(item => historyFilter === 'ALL' || item.action === historyFilter)
                .map((item, index) => {
                  let iconName: keyof typeof Feather.glyphMap = 'info';
                  let iconColor = '#718096';
                  let actionLabel = item.action;

                  switch (item.action) {
                    case 'CREATE':
                      iconName = 'plus-circle';
                      iconColor = '#38A169';
                      actionLabel = i18n.t('history.actionCreate');
                      break;
                    case 'UPDATE':
                      iconName = 'edit-2';
                      iconColor = '#3182CE';
                      actionLabel = i18n.t('history.actionUpdate');
                      break;
                    case 'STATUS_CHANGE':
                      iconName = 'refresh-cw';
                      iconColor = '#DD6B20';
                      actionLabel = i18n.t('history.actionStatusChange');
                      break;
                  }

                  return (
                    <View key={index} style={styles.logItem}>
                      <View style={styles.logHeader}>
                        <View style={styles.logAction}>
                          <Feather name={iconName} size={16} color={iconColor} style={{ marginRight: 8 }} />
                          <Text style={styles.logActionText}>{actionLabel}</Text>
                        </View>
                        <Text style={styles.logDate}>{new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}</Text>
                      </View>
                      <Text style={styles.logUser}>{i18n.t('history.by')} {item.username || i18n.t('history.system')}</Text>
                      {item.description && <Text style={styles.logDescription}>&quot;{item.description}&quot;</Text>}
                    </View>
                  );
                })
            ) : (
              <Text style={styles.emptyText}>{i18n.t('history.empty')}</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  inputModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', width: '100%' },
  inputModalContent: { width: '85%', maxWidth: 400, backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  inputModalTitle: { fontSize: 18, fontWeight: 'bold' },
  filterContainer: { marginBottom: 12 },
  listContainer: { maxHeight: 300 },
  
  // Estilos para Chips de Filtro
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#EDF2F7', marginRight: 8 },
  filterChipActive: { backgroundColor: '#3182CE' },
  filterChipText: { fontSize: 12, color: '#4A5568' },
  filterChipTextActive: { color: '#FFF', fontWeight: 'bold' },

  // Estilos para Items de Log
  logItem: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F7', paddingBottom: 8 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logAction: { flexDirection: 'row', alignItems: 'center' },
  logActionText: { fontWeight: 'bold', color: '#2D3748' },
  logDate: { fontSize: 12, color: '#718096' },
  logUser: { fontSize: 14, color: '#4A5568', marginLeft: 24 },
  logDescription: { fontSize: 12, color: '#718096', fontStyle: 'italic', marginTop: 2, marginLeft: 24 },
  emptyText: { color: '#718096', textAlign: 'center', fontStyle: 'italic', padding: 20 },
});
