import React, { useState, useMemo, useContext, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Modal, TextInput, ScrollView, Platform, KeyboardAvoidingView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { HeaderActionContext } from './_layout';
import i18n from '../../constants/i18n';
import { useEvents, CalendarEvent } from '../../contexts/EventsContext';

// --- Utilidades de Fecha ---
const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

export default function AgendaScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { date } = useLocalSearchParams<{ date: string }>(); // Recibir parámetro de fecha
  const { events, addEvent, updateEvent, deleteEvent } = useEvents(); // Usamos el contexto global
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Estado para nuevo evento
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventType, setNewEventType] = useState<CalendarEvent['type']>('Meeting');

  const { setCustomAddAction } = useContext(HeaderActionContext);

  // Configurar el botón "+" del Header para abrir el modal de evento
  useFocusEffect(
    useCallback(() => {
      setCustomAddAction(() => () => {
        // Pre-llenar fecha con la seleccionada
        setEditingEventId(null);
        setNewEventTitle('');
        setNewEventDesc('');
        setNewEventType('Meeting');
        setNewEventTime('09:00');
        setIsModalVisible(true);
      });
      return () => setCustomAddAction(null);
    }, [])
  );

  // Efecto para manejar la navegación desde el Dashboard
  useEffect(() => {
    if (date) {
      // Parsear YYYY-MM-DD asegurando zona horaria local
      const [y, m, d] = date.split('-').map(Number);
      const targetDate = new Date(y, m - 1, d);
      setCurrentDate(targetDate); // Mover calendario al mes correcto
      setSelectedDate(targetDate); // Seleccionar el día
    }
  }, [date]);

  // --- Lógica del Calendario ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);

  const calendarDays = useMemo(() => {
    const days = [];
    // Relleno días vacíos antes del primer día del mes
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    // Relleno final para completar la cuadrícula (asegurar filas completas)
    while (days.length % 7 !== 0) {
      days.push(null);
    }
    return days;
  }, [month, year]);

  const numWeeks = calendarDays.length / 7;

  const changeMonth = (increment: number) => {
    setCurrentDate(new Date(year, month + increment, 1));
  };

  const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSaveEvent = async () => {
    if (!newEventTitle) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }
    const eventData = {
      title: newEventTitle,
      description: newEventDesc,
      date: formatDateKey(selectedDate),
      time: newEventTime || '00:00',
      type: newEventType,
    };
    
    try {
      if (editingEventId) {
        await updateEvent({ ...eventData, id: editingEventId });
      } else {
        await addEvent(eventData);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el evento.');
    }

    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setNewEventTitle('');
    setNewEventDesc('');
    setNewEventTime('');
    setEditingEventId(null);
    setNewEventType('Meeting');
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setNewEventTitle(event.title);
    setNewEventDesc(event.description);
    setNewEventTime(event.time);
    setNewEventType(event.type);
    setEditingEventId(event.id);
    setIsModalVisible(true);
  };

  const handleDeleteEvent = (id: string) => {
    Alert.alert(i18n.t('common.delete'), i18n.t('projectDetail.deleteConfirmation'), [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      { text: i18n.t('common.delete'), style: 'destructive', onPress: () => deleteEvent(id) }
    ]);
  };

  // Obtener colores por tipo
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Meeting': return '#3182CE'; // Azul
      case 'Inspection': return '#E53E3E'; // Rojo
      case 'Delivery': return '#38A169'; // Verde
      case 'Deadline': return '#D69E2E'; // Amarillo
      default: return '#718096'; // Gris
    }
  };

  return (
    <View style={styles.container}>
      {/* --- Cabecera del Calendario --- */}
      <View style={styles.calendarHeader}>
        <Pressable onPress={() => changeMonth(-1)} style={styles.navButton}>
          <Feather name="chevron-left" size={24} color="#4A5568" />
        </Pressable>
        <Text style={styles.monthTitle}>{monthNames[month]} {year}</Text>
        <Pressable onPress={() => changeMonth(1)} style={styles.navButton}>
          <Feather name="chevron-right" size={24} color="#4A5568" />
        </Pressable>
      </View>

      {/* --- Grid de Días de la Semana --- */}
      <View style={styles.weekDaysRow}>
        {daysOfWeek.map(day => (
          <Text key={day} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>

      {/* --- Cuerpo del Calendario (Grid) --- */}
      <View style={styles.calendarBody}>
        <View style={styles.calendarGrid}>
        {calendarDays.map((date, index) => {
          const cellHeight = { height: `${100 / numWeeks}%` as `${number}%` };
          
          if (!date) return <View key={`empty-${index}`} style={[styles.dayCell, styles.emptyCell, cellHeight]} />;
          
          const dateKey = formatDateKey(date);
          const isSelected = dateKey === formatDateKey(selectedDate);
          const isToday = dateKey === formatDateKey(new Date());
          const hasEvents = events.some(e => e.date === dateKey);

          return (
            <Pressable 
              key={dateKey} 
              style={[
                styles.dayCell,
                cellHeight,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday
              ]} 
              onPress={() => handleDayPress(date)}
            >
              <View style={[styles.dayNumberContainer, isSelected && styles.dayNumberSelected]}>
                <Text style={[
                  styles.dayText, 
                  isSelected && styles.dayTextSelected,
                  isToday && !isSelected && styles.dayTextToday
                ]}>
                  {date.getDate()}
                </Text>
              </View>
              
              <View style={styles.cellEventsContainer}>
                {events.filter(e => e.date === dateKey).slice(0, 3).map((ev, i) => (
                  <Pressable 
                    key={i} 
                    style={[styles.eventBar, { backgroundColor: getTypeColor(ev.type) }]}
                    onPress={() => handleEditEvent(ev)}
                  >
                    <Text numberOfLines={1} style={styles.eventBarText}>{ev.title}</Text>
                  </Pressable>
                ))}
                {events.filter(e => e.date === dateKey).length > 3 && (
                  <Text style={styles.moreEventsText}>+{events.filter(e => e.date === dateKey).length - 3}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
        </View>
      </View>

      {/* --- Modal para Agregar Evento --- */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingEventId ? 'Editar Evento' : 'Nuevo Evento'}</Text>
              <Pressable onPress={handleCloseModal}>
                <Feather name="x" size={24} color="#4A5568" />
              </Pressable>
            </View>

            <Text style={styles.label}>Título</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ej. Reunión de Avance" 
              value={newEventTitle}
              onChangeText={setNewEventTitle}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Hora</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="00:00" 
                  value={newEventTime}
                  onChangeText={setNewEventTime}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Fecha</Text>
                <View style={[styles.input, { justifyContent: 'center', backgroundColor: '#EDF2F7' }]}>
                  <Text style={{ color: '#4A5568' }}>{formatDateKey(selectedDate)}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.label}>Tipo</Text>
            <View style={styles.typeSelector}>
              {(['Meeting', 'Inspection', 'Delivery', 'Other'] as const).map(type => (
                <Pressable 
                  key={type} 
                  style={[styles.typeOption, newEventType === type && styles.typeOptionSelected, { borderColor: getTypeColor(type) }]}
                  onPress={() => setNewEventType(type)}
                >
                  <Text style={[styles.typeOptionText, newEventType === type && { color: '#FFF', fontWeight: 'bold' }, { color: getTypeColor(type) }]}>
                    {type === 'Meeting' ? 'Junta' : type === 'Inspection' ? 'Insp.' : type === 'Delivery' ? 'Entrega' : 'Otro'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Descripción</Text>
            <TextInput 
              style={[styles.input, { height: 80 }]} 
              placeholder="Detalles adicionales..." 
              multiline
              value={newEventDesc}
              onChangeText={setNewEventDesc}
            />

            <Pressable style={styles.saveButton} onPress={handleSaveEvent}>
              <Text style={styles.saveButtonText}>{editingEventId ? 'Actualizar Evento' : 'Guardar Evento'}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
  // Calendario
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  monthTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748' },
  navButton: { padding: 8 },
  
  weekDaysRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  weekDayText: { flex: 1, textAlign: 'center', color: '#718096', fontSize: 12, fontWeight: '600' },
  
  calendarBody: { flex: 1 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', height: '100%' },
  dayCell: { width: '14.28%', padding: 2, borderBottomWidth: 1, borderBottomColor: '#EDF2F7', borderRightWidth: 1, borderRightColor: '#EDF2F7' },
  emptyCell: { backgroundColor: '#FAFAFA' },
  dayCellSelected: { backgroundColor: '#F7FAFC' },
  dayNumberContainer: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 2 },
  dayNumberSelected: { backgroundColor: '#3182CE' },
  dayCellToday: { },
  dayText: { fontSize: 12, color: '#2D3748' },
  dayTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },
  dayTextToday: { color: '#3182CE', fontWeight: 'bold' },
  
  cellEventsContainer: { flex: 1, gap: 2 },
  eventBar: { borderRadius: 2, paddingHorizontal: 2, paddingVertical: 1, justifyContent: 'center' },
  eventBarText: { fontSize: 8, color: '#FFFFFF', fontWeight: 'bold' },
  moreEventsText: { fontSize: 8, color: '#718096', textAlign: 'center', marginTop: 1 },

  // Agenda Lista
  agendaContainer: { flex: 1, padding: 16, backgroundColor: '#F7FAFC' },
  agendaTitle: { fontSize: 16, fontWeight: 'bold', color: '#4A5568', marginBottom: 12 },
  emptyText: { textAlign: 'center', color: '#A0AEC0', marginTop: 20, fontStyle: 'italic' },
  
  eventCard: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  eventTime: { fontSize: 12, fontWeight: 'bold', color: '#718096' },
  eventTypeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  eventTypeText: { fontSize: 10, fontWeight: 'bold' },
  eventTitle: { fontSize: 16, fontWeight: 'bold', color: '#2D3748' },
  eventDesc: { fontSize: 14, color: '#718096', marginTop: 4 },
  eventActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 12 },
  actionButton: { padding: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 12, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A202C' },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, color: '#2D3748' },
  
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: '#FFF' },
  typeOptionSelected: { backgroundColor: '#2D3748', borderColor: '#2D3748' }, // Fallback color, overridden inline
  typeOptionText: { fontSize: 12, fontWeight: '600' },

  saveButton: { backgroundColor: '#3182CE', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});