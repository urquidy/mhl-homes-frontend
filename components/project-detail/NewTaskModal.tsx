import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import i18n from '../../constants/i18n';
import CalendarPickerModal from '../ui/CalendarPickerModal';

interface NewTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: NewTaskData) => void;
  isSaving: boolean;
  catalogGroups: any[];
  availableUsers: any[];
  initialData: {
    text?: string;
    stepId?: string | null;
    categoryId?: string | null;
    shape?: 'rectangle' | 'circle' | 'pencil' | 'pin';
  };
}

export interface NewTaskData {
  text: string;
  assignedTo: string;
  deadline: string;
  stepId: string | null;
  categoryId: string | null;
  shape: 'rectangle' | 'circle' | 'pencil' | 'pin';
}

export default function NewTaskModal({ visible, onClose, onSave, isSaving, catalogGroups, availableUsers, initialData }: NewTaskModalProps) {
  const [text, setText] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [stepId, setStepId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [shape, setShape] = useState<'rectangle' | 'circle' | 'pencil' | 'pin'>('rectangle');
  
  const [showStepSelector, setShowStepSelector] = useState(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (visible) {
      setText(initialData.text || '');
      setStepId(initialData.stepId || null);
      setCategoryId(initialData.categoryId || null);
      setShape(initialData.shape || 'rectangle');
      setAssignedTo('');
      setDeadline('');
      setShowStepSelector(false);
      setShowUserSuggestions(false);
    }
  }, [visible, initialData]);

  const handleSave = () => {
    onSave({
      text,
      assignedTo,
      deadline,
      stepId,
      categoryId,
      shape
    });
  };

  const getSelectedStepName = () => {
    if (!stepId) return i18n.t('newTask.selectStep');
    for (const group of catalogGroups) {
      const step = group.items.find((i: any) => i.id === stepId);
      if (step) return `${group.name} > ${step.name}`;
    }
    return i18n.t('newTask.stepSelected');
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputModalContainer}
      >
        <View style={styles.inputModalContent}>
          <Text style={styles.inputModalTitle}>{i18n.t('projectDetail.newTaskTitle')}</Text>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('projectDetail.taskDescPlaceholder')}
            value={text}
            onChangeText={setText}
            autoFocus
          />
          
          {/* Shape Selector */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Tipo de Marcador</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => setShape('pin')} style={[styles.shapeOption, shape === 'pin' && styles.shapeOptionSelected]}>
                <Feather name="map-pin" size={20} color={shape === 'pin' ? '#3182CE' : '#A0AEC0'} />
                <Text style={[styles.shapeOptionText, shape === 'pin' && styles.shapeOptionTextSelected]}>Pin</Text>
              </Pressable>
              <Pressable onPress={() => setShape('rectangle')} style={[styles.shapeOption, shape === 'rectangle' && styles.shapeOptionSelected]}>
                <Feather name="square" size={20} color={shape === 'rectangle' ? '#3182CE' : '#A0AEC0'} />
                <Text style={[styles.shapeOptionText, shape === 'rectangle' && styles.shapeOptionTextSelected]}>Área</Text>
              </Pressable>
              <Pressable onPress={() => setShape('circle')} style={[styles.shapeOption, shape === 'circle' && styles.shapeOptionSelected]}>
                <Feather name="circle" size={20} color={shape === 'circle' ? '#3182CE' : '#A0AEC0'} />
                <Text style={[styles.shapeOptionText, shape === 'circle' && styles.shapeOptionTextSelected]}>Círculo</Text>
              </Pressable>
            </View>
          </View>

          {/* Catalog Selector */}
          <View style={{ marginBottom: 16, zIndex: 20 }}>
            <Text style={styles.label}>Asociar a Catálogo (Opcional)</Text>
            <Pressable 
              style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }]}
              onPress={() => setShowStepSelector(!showStepSelector)}
            >
              <Text style={{ color: stepId ? '#2D3748' : '#A0AEC0', flex: 1 }} numberOfLines={1}>
                {getSelectedStepName()}
              </Text>
              <Feather name={showStepSelector ? "chevron-up" : "chevron-down"} size={20} color="#718096" />
            </Pressable>
            
            {showStepSelector && (
              <View style={styles.suggestionsContainer}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                  {catalogGroups.map((group: any) => (
                    <View key={group.id}>
                      <Text style={styles.groupHeader}>{group.name}</Text>
                      {group.items.map((step: any) => (
                        <Pressable 
                          key={step.id}
                          style={styles.suggestionItem}
                          onPress={() => {
                            setStepId(step.id);
                            setCategoryId(group.id);
                            setText(step.name);
                            setShowStepSelector(false);
                          }}
                        >
                          <Text style={styles.suggestionText}>{step.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* User Selector */}
          <View style={{ zIndex: 10, marginBottom: 16 }}>
            <TextInput
              style={[styles.input, { marginBottom: 0 }]}
              placeholder={i18n.t('projectDetail.assignToPlaceholder')}
              value={assignedTo}
              onChangeText={(text) => {
                setAssignedTo(text);
                setShowUserSuggestions(text.length > 0);
              }}
              onFocus={() => setShowUserSuggestions(assignedTo.length > 0)}
            />
            {showUserSuggestions && (
              <View style={styles.suggestionsContainer}>
                <ScrollView style={{ maxHeight: 150 }} keyboardShouldPersistTaps="handled">
                  {availableUsers.filter((u: any) => (u.username || '').toLowerCase().includes(assignedTo.toLowerCase())).map((user: any) => (
                    <Pressable 
                      key={user.id} 
                      style={styles.suggestionItem}
                      onPress={() => {
                        setAssignedTo(user.username);
                        setShowUserSuggestions(false);
                      }}
                    >
                      <Text style={styles.suggestionText}>{user.username}</Text>
                      <Text style={styles.suggestionRole}>{user.role}</Text>
                    </Pressable>
                  ))}
                  {availableUsers.filter((u: any) => (u.username || '').toLowerCase().includes(assignedTo.toLowerCase())).length === 0 && (
                    <View style={styles.suggestionItem}>
                      <Text style={[styles.suggestionText, { color: '#A0AEC0', fontStyle: 'italic' }]}>{i18n.t('common.noUsersFound')}</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Deadline Selector */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>{i18n.t('newTask.deadline')}</Text>
            <Pressable 
              style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }]}
              onPress={() => setShowCalendar(true)}
            >
              <Text style={{ color: deadline ? '#2D3748' : '#A0AEC0' }}>{deadline || i18n.t('newTask.selectDate')}</Text>
              <Feather name="calendar" size={20} color="#718096" />
            </Pressable>
          </View>

          <View style={styles.modalButtons}>
            <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={onClose}><Text>{i18n.t('common.cancel')}</Text></Pressable>
            <Pressable 
              style={[styles.modalButton, styles.saveButton, isSaving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveButtonText}>{i18n.t('common.save')}</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      <CalendarPickerModal 
        visible={showCalendar} 
        onClose={() => setShowCalendar(false)} 
        onSelect={setDeadline} 
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  inputModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', width: '100%' },
  inputModalContent: { width: '85%', maxWidth: 400, backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 5 },
  inputModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, backgroundColor: '#FFF' },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  
  shapeOption: { flexDirection: 'row', alignItems: 'center', padding: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#F7FAFC' },
  shapeOptionSelected: { borderColor: '#3182CE', backgroundColor: '#EBF8FF' },
  shapeOptionText: { marginLeft: 6, fontSize: 14, color: '#718096' },
  shapeOptionTextSelected: { color: '#3182CE', fontWeight: '600' },
  
  suggestionsContainer: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, maxHeight: 150 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  suggestionText: { fontSize: 14, color: '#2D3748' },
  suggestionRole: { fontSize: 12, color: '#718096' },
  groupHeader: { padding: 8, backgroundColor: '#F7FAFC', fontWeight: 'bold', color: '#718096', fontSize: 12 },
  
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 8 },
  cancelButton: { backgroundColor: '#EDF2F7' },
  saveButton: { backgroundColor: '#3182CE' },
  saveButtonText: { color: '#FFF', fontWeight: 'bold' },
});