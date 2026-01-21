
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import i18n from '../../constants/i18n';
import CalendarPickerModal from '../ui/CalendarPickerModal';

interface TaskDateModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { startDate: string | null, endDate: string | null, completed: boolean }) => void;
  task: {
    id?: string;
    text: string;
    startDate?: string | null;
    endDate?: string | null;
    completed?: boolean;
  } | null;
  showAlert: (title: string, message?: string) => void;
}

export default function TaskDateModal({ visible, onClose, onSave, task, showAlert }: TaskDateModalProps) {
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [pickingFor, setPickingFor] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (task) {
      setStartDate(task.startDate || null);
      setEndDate(task.endDate || null);
      setIsCompleted(task.completed || false);
    }
  }, [task]);

  const handleOpenCalendar = (type: 'start' | 'end') => {
    setPickingFor(type);
    setIsCalendarVisible(true);
  };

  const handleDateSelect = (date: string) => {
    if (pickingFor === 'start') {
      setStartDate(date);
      // If end date is before new start date, clear it
      if (endDate && new Date(endDate) < new Date(date)) {
        setEndDate(null);
      }
    } else {
      // If end date is before start date, show an alert
      if (startDate && new Date(date) < new Date(startDate)) {
        showAlert(i18n.t('common.error'), i18n.t('errors.endDateBeforeStartDate'));
      } else {
        setEndDate(date);
      }
    }
    setIsCalendarVisible(false);
    setPickingFor(null);
  };

  const handleSave = () => {
    onSave({ startDate, endDate, completed: isCompleted });
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return i18n.t('common.notSet');
    // Reformat from YYYY-MM-DD to MM/DD/YYYY for US style
    try {
      const [year, month, day] = dateString.split('-');
      if (!year || !month || !day) return dateString;
      return `${month}/${day}/${year}`;
    } catch(e) {
      return dateString; // if format is different, show original
    }
  }

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>{task?.text}</Text>
          <Text style={styles.subtitle}>{i18n.t('projectDetail.selectDates')}</Text>

          <View style={styles.datePickerContainer}>
            <View style={styles.datePicker}>
              <Text style={styles.dateLabel}>{i18n.t('projectDetail.startDate')}</Text>
              <Pressable style={styles.dateButton} onPress={() => handleOpenCalendar('start')}>
                <Feather name="calendar" size={18} color="#4A5568" />
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
              </Pressable>
            </View>
            <View style={styles.datePicker}>
              <Text style={styles.dateLabel}>{i18n.t('projectDetail.endDate')}</Text>
              <Pressable style={styles.dateButton} onPress={() => handleOpenCalendar('end')}>
                <Feather name="calendar" size={18} color="#4A5568" />
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
              </Pressable>
            </View>
          </View>
          
          <View style={styles.completedContainer}>
            <Text style={styles.completedLabel}>{i18n.t('projectDetail.markAsCompleted')}</Text>
            <Switch
              trackColor={{ false: "#E2E8F0", true: "#68D391" }}
              thumbColor={isCompleted ? "#38A169" : "#F7FAFC"}
              ios_backgroundColor="#E2E8F0"
              onValueChange={setIsCompleted}
              value={isCompleted}
            />
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>{i18n.t('common.cancel')}</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>{i18n.t('common.save')}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {isCalendarVisible && (
        <CalendarPickerModal
          visible={isCalendarVisible}
          onClose={() => setIsCalendarVisible(false)}
          onSelect={handleDateSelect}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 12, elevation: 5, padding: 20 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1A202C', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#4A5568', marginBottom: 20 },
  datePickerContainer: {
    marginBottom: 12,
  },
  datePicker: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2D3748',
  },
  completedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
  },
  completedLabel: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '500'
  },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EDF2F7' },
  cancelButton: { backgroundColor: '#EDF2F7', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', marginRight: 12 },
  cancelText: { fontWeight: 'bold', color: '#4A5568' },
  saveButton: { backgroundColor: '#3182CE', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  saveText: { fontWeight: 'bold', color: '#FFFFFF' }
});
