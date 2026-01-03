import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import i18n from '../../constants/i18n';

interface EditProjectModalProps {
  visible: boolean;
  onClose: () => void;
  project: any;
  availableUsers: any[];
  onUpdate: (data: { name: string, participants: string[] }) => Promise<void>;
}

export default function EditProjectModal({ visible, onClose, project, availableUsers, onUpdate }: EditProjectModalProps) {
  const [name, setName] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      // Asumimos que project.participants es un array de usernames o IDs
      setParticipants(project.participants || []);
    }
  }, [project, visible]);

  const toggleParticipant = (username: string) => {
    if (participants.includes(username)) {
      setParticipants(participants.filter(p => p !== username));
    } else {
      setParticipants([...participants, username]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      await onUpdate({ name, participants });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Editar Proyecto</Text>
            <Pressable onPress={onClose}><Feather name="x" size={24} color="#4A5568" /></Pressable>
          </View>

          <Text style={styles.label}>{i18n.t('newProject.nameLabel')}</Text>
          <TextInput 
            style={styles.input} 
            value={name}
            onChangeText={setName}
            placeholder="Nombre del proyecto"
          />

          <Text style={styles.label}>Participantes</Text>
          <View style={styles.listContainer}>
            <ScrollView nestedScrollEnabled>
              {availableUsers.map(user => {
                const isSelected = participants.includes(user.username);
                return (
                  <Pressable key={user.id} style={styles.userItem} onPress={() => toggleParticipant(user.username)}>
                    <Feather name={isSelected ? "check-square" : "square"} size={20} color={isSelected ? "#3182CE" : "#A0AEC0"} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.userName}>{user.username}</Text>
                      <Text style={styles.userRole}>{user.role}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>{i18n.t('common.cancel')}</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{i18n.t('common.save')}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 12, padding: 20, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1A202C' },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, color: '#2D3748' },
  listContainer: { maxHeight: 200, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginBottom: 20 },
  userItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
  userName: { fontSize: 14, fontWeight: '600', color: '#2D3748' },
  userRole: { fontSize: 12, color: '#718096' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#EDF2F7' },
  cancelText: { color: '#4A5568', fontWeight: 'bold' },
  saveButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#3182CE', minWidth: 80, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold' },
});
