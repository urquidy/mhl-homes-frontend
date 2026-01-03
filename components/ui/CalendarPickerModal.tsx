import React, { useState, useMemo } from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import i18n from '../../constants/i18n';

const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

interface CalendarPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
}

export default function CalendarPickerModal({ visible, onClose, onSelect }: CalendarPickerModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [month, year]);

  const changeMonth = (increment: number) => {
    setCurrentDate(new Date(year, month + increment, 1));
  };

  const handleDayPress = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelect(dateStr);
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.inputModalContent, { padding: 0, overflow: 'hidden' }]}>
          <View style={styles.header}>
            <Pressable onPress={() => changeMonth(-1)} style={{ padding: 4 }}><Feather name="chevron-left" size={24} color="#4A5568" /></Pressable>
            <Text style={styles.title}>{monthNames[month]} {year}</Text>
            <Pressable onPress={() => changeMonth(1)} style={{ padding: 4 }}><Feather name="chevron-right" size={24} color="#4A5568" /></Pressable>
          </View>
          
          <View style={styles.weekRow}>
            {daysOfWeek.map(d => <Text key={d} style={styles.weekDay}>{d}</Text>)}
          </View>

          <View style={styles.daysGrid}>
            {calendarDays.map((day, i) => (
              <View key={i} style={styles.dayCell}>
                {day && (
                  <Pressable 
                    onPress={() => handleDayPress(day)}
                    style={({pressed}) => [styles.dayButton, pressed && styles.dayButtonPressed]}
                  >
                    <Text style={{ color: '#2D3748' }}>{day}</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>{i18n.t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  inputModalContent: { width: '85%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 12, elevation: 5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F7FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  weekRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 12, color: '#718096', fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  dayCell: { width: '14.28%', aspectRatio: 1, padding: 2 },
  dayButton: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  dayButtonPressed: { backgroundColor: '#EBF8FF', borderColor: '#3182CE' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  cancelButton: { backgroundColor: '#EDF2F7', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  cancelText: { fontWeight: 'bold', color: '#4A5568' }
});