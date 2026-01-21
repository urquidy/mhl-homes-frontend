
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import i18n from '../../../constants/i18n';
import { ProjectData } from './ProjectCreationStepper';

// The DatePickerModal was originally inside NewProjectModal.tsx
// For now, we redefine a simplified version here.
// In a full refactor, this should be a shared component.
const DatePickerModal = ({ visible, onClose, onSelect, initialDate }: { visible: boolean, onClose: () => void, onSelect: (date: string) => void, initialDate?: string }) => {
  const [currentDate, setCurrentDate] = useState(initialDate ? new Date(initialDate.replace(/-/g, '/')) : new Date());
  
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const days = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)));

  const changeMonth = (increment: number) => setCurrentDate(new Date(year, month + increment, 1));
  const handleDayPress = (date: Date) => {
    onSelect(date.toISOString().split('T')[0]);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerContent}>
          <View style={styles.dpHeader}>
            <Pressable onPress={() => changeMonth(-1)}><Feather name="chevron-left" size={24} color="#4A5568" /></Pressable>
            <Text style={styles.dpTitle}>{monthNames[month]} {year}</Text>
            <Pressable onPress={() => changeMonth(1)}><Feather name="chevron-right" size={24} color="#4A5568" /></Pressable>
          </View>
          <View style={styles.dpWeekRow}>{daysOfWeek.map(d => <Text key={d} style={styles.dpWeekDay}>{d}</Text>)}</View>
          <View style={styles.dpGrid}>
            {days.map((date, i) => (
              <Pressable key={i} style={styles.dpDay} onPress={() => date && handleDayPress(date)} disabled={!date}>
                {date && <Text style={styles.dpDayText}>{date.getDate()}</Text>}
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.dpCloseButton} onPress={onClose}><Text style={styles.dpCloseText}>{i18n.t('common.cancel')}</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
};


interface Step2Props {
  data: Pick<ProjectData, 'startDate' | 'endDate' | 'participants'>;
  onUpdate: (update: Partial<ProjectData>) => void;
  availableUsers: any[];
}

const Step2DatesAndParticipants = ({ data, onUpdate, availableUsers }: Step2Props) => {
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [activeDateInput, setActiveDateInput] = useState<'start' | 'end'>('start');
  const [isParticipantModalVisible, setIsParticipantModalVisible] = useState(false);

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year}`;
  };

  const openDatePicker = (type: 'start' | 'end') => {
    setActiveDateInput(type);
    setIsDatePickerVisible(true);
  };

  const handleDateSelect = (date: string) => {
    if (activeDateInput === 'start') onUpdate({ startDate: date });
    else onUpdate({ endDate: date });
  };

  const toggleParticipant = (userId: string) => {
    const newParticipants = data.participants.includes(userId)
      ? data.participants.filter(p => p !== userId)
      : [...data.participants, userId];
    onUpdate({ participants: newParticipants });
  };

  return (
    <View>
      {/* Date Inputs */}
      <View style={styles.row}>
        <View style={styles.halfColumn}>
          <Text style={styles.label}>{i18n.t('newProject.startDate')}</Text>
          <Pressable onPress={() => openDatePicker('start')}>
            <View pointerEvents="none">
              <TextInput 
                style={styles.input} 
                placeholder="MM/DD/YYYY" 
                value={formatDateForDisplay(data.startDate)}
                editable={false}
              />
            </View>
            <Feather name="calendar" size={20} color="#718096" style={styles.inputIcon} />
          </Pressable>
        </View>
        <View style={styles.halfColumn}>
          <Text style={styles.label}>{i18n.t('newProject.endDate')}</Text>
          <Pressable onPress={() => openDatePicker('end')}>
            <View pointerEvents="none">
              <TextInput 
                style={styles.input} 
                placeholder="MM/DD/YYYY" 
                value={formatDateForDisplay(data.endDate)}
                editable={false}
              />
            </View>
            <Feather name="calendar" size={20} color="#718096" style={styles.inputIcon} />
          </Pressable>
        </View>
      </View>

      {/* Participants Input */}
      <Text style={styles.label}>Participantes</Text>
      <View style={styles.participantsContainer}>
        {data.participants.map((pId) => {
          const user = availableUsers.find(u => u.id === pId);
          return (
            <View key={pId} style={styles.participantChip}>
              <Text style={styles.participantChipText}>{user?.username || pId}</Text>
              <Pressable onPress={() => toggleParticipant(pId)}>
                <Feather name="x" size={14} color="#FFF" style={{ marginLeft: 4 }} />
              </Pressable>
            </View>
          );
        })}
        <Pressable style={styles.addParticipantButton} onPress={() => setIsParticipantModalVisible(true)}>
          <Feather name="plus" size={20} color="#4A5568" />
          <Text style={styles.addParticipantText}>Agregar</Text>
        </Pressable>
      </View>

      {/* Modals */}
      <DatePickerModal 
        visible={isDatePickerVisible} 
        onClose={() => setIsDatePickerVisible(false)} 
        onSelect={handleDateSelect}
        initialDate={activeDateInput === 'start' ? data.startDate : data.endDate}
      />

      <Modal visible={isParticipantModalVisible} transparent animationType="fade" onRequestClose={() => setIsParticipantModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Participantes</Text>
              <Pressable onPress={() => setIsParticipantModalVisible(false)}><Feather name="x" size={24} color="#4A5568" /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {availableUsers.map(user => {
                const isSelected = data.participants.includes(user.id);
                return (
                  <Pressable key={user.id} style={styles.userItem} onPress={() => toggleParticipant(user.id)}>
                    <Feather name={isSelected ? "check-square" : "square"} size={24} color={isSelected ? "#3182CE" : "#A0AEC0"} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.userName}>{user.username}</Text>
                      <Text style={styles.userRole}>{user.role}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.button} onPress={() => setIsParticipantModalVisible(false)}>
              <Text style={styles.buttonText}>Listo</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
    label: { fontSize: 16, color: '#4A5568', marginBottom: 8, fontFamily: 'DMSans-Bold' },
    input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, fontFamily: 'DMSans-Regular', color: '#2D3748' },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    halfColumn: { flex: 1 },
    inputIcon: { position: 'absolute', right: 12, top: 12 },
    participantsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' },
    participantChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3182CE', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
    participantChipText: { color: '#FFF', fontSize: 14, fontFamily: 'DMSans-Bold' },
    addParticipantButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E0', borderStyle: 'dashed' },
    addParticipantText: { marginLeft: 6, color: '#4A5568', fontSize: 14, fontFamily: 'DMSans-Bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 12, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontFamily: 'DMSans-Bold', color: '#1A202C' },
    userItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
    userName: { fontSize: 16, fontFamily: 'DMSans-Bold', color: '#2D3748' },
    userRole: { fontSize: 14, fontFamily: 'DMSans-Regular', color: '#718096' },
    button: { backgroundColor: '#D4AF37', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans-Bold' },
    // DatePicker Styles (simplified, should be in a separate file)
    datePickerContent: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, width: '90%', maxWidth: 350 },
    dpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    dpTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748' },
    dpWeekRow: { flexDirection: 'row', marginBottom: 8 },
    dpWeekDay: { flex: 1, textAlign: 'center', fontSize: 12, color: '#718096', fontWeight: '600' },
    dpGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dpDay: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
    dpDayText: { fontSize: 14, color: '#2D3748' },
    dpCloseButton: { marginTop: 16, padding: 12, alignItems: 'center', backgroundColor: '#EDF2F7', borderRadius: 8 },
    dpCloseText: { color: '#4A5568', fontWeight: 'bold' },
});

export default Step2DatesAndParticipants;
