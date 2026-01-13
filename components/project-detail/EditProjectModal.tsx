import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (project) {
      //console.log('DEBUG - Project Data:', JSON.stringify(project, null, 2));
      //console.log('DEBUG - Available Users:', JSON.stringify(availableUsers, null, 2));

      setName(project.name || '');
      
      // Normalizar participantes: Manejar tanto array de strings como array de objetos
      const rawParticipants = project.participants || [];
      const normalizedParticipants = rawParticipants.map((p: any) => {
        // 1. Extraer valor base (puede ser objeto con username/id, o un string directo)
        let val = (typeof p === 'object' && p !== null) ? (p.username || p.id) : p;
        
        // 2. Si el valor es un ID que existe en availableUsers, lo convertimos al username correcto
        const userById = availableUsers.find(u => u.id === val);
        return userById ? userById.username : val;
      }).filter(Boolean);

      setParticipants(normalizedParticipants);
      setSearchText('');
    }
  }, [project, visible, availableUsers]);

  const toggleParticipant = (username: string) => {
    if (participants.includes(username)) {
      setParticipants(participants.filter(p => p !== username));
    } else {
      setParticipants([...participants, username]);
    }
  };

  const filteredUsers = availableUsers.filter(u => 
    u.username.toLowerCase().includes(searchText.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(searchText.toLowerCase()))
  );

  const handleSelectAll = () => {
    const newSet = new Set(participants);
    filteredUsers.forEach(u => newSet.add(u.username));
    setParticipants(Array.from(newSet));
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
            <Text style={styles.title}>{i18n.t('editProject.title')}</Text>
            <Pressable onPress={onClose}><Feather name="x" size={24} color="#4A5568" /></Pressable>
          </View>

          <Text style={styles.label}>{i18n.t('newProject.nameLabel')}</Text>
          <TextInput 
            style={styles.input} 
            value={name}
            onChangeText={setName}
            placeholder={i18n.t('newProject.namePlaceholder')}
          />

          <Text style={styles.label}>{i18n.t('editProject.participants')}</Text>
          
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#A0AEC0" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={i18n.t('common.searchUser')}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {filteredUsers.length > 0 && (
            <Pressable onPress={handleSelectAll} style={{ alignSelf: 'flex-end', marginBottom: 8, padding: 4 }}>
              <Text style={{ color: '#3182CE', fontSize: 12, fontWeight: '600' }}>{i18n.t('editProject.selectAll')}</Text>
            </Pressable>
          )}

          <View style={styles.listContainer}>
            <ScrollView nestedScrollEnabled>
              {filteredUsers.map(user => {
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
              {filteredUsers.length === 0 && (
                <Text style={styles.emptyText}>{i18n.t('editProject.noUsers')}</Text>
              )}
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, marginBottom: 8, backgroundColor: '#F7FAFC' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#2D3748' },
  listContainer: { maxHeight: 200, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginBottom: 20 },
  userItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F7FAFC' },
  userName: { fontSize: 14, fontWeight: '600', color: '#2D3748' },
  userRole: { fontSize: 12, color: '#718096' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#EDF2F7' },
  cancelText: { color: '#4A5568', fontWeight: 'bold' },
  saveButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#3182CE', minWidth: 80, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: 'bold' },
  emptyText: { padding: 12, color: '#A0AEC0', textAlign: 'center', fontStyle: 'italic' },
});
