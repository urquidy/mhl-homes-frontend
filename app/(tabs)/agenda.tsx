import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCustomAlert } from '../../components/ui/CustomAlert';
import i18n from '../../constants/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { CalendarEvent, useEvents } from '../../contexts/EventsContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import api from '../../services/api';
import { HeaderActionContext } from './_layout';

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
  const { token } = useAuth();
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const { addNotification } = useNotifications();
  const [agendaTypes, setAgendaTypes] = useState<any[]>([]);
  
  // Estado para nuevo evento
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventType, setNewEventType] = useState<CalendarEvent['type']>('Meeting');

  const { showAlert, AlertComponent } = useCustomAlert();
  const { setCustomAddAction } = useContext(HeaderActionContext);

  // Configurar el botón "+" del Header para abrir el modal de evento
  useFocusEffect(
    useCallback(() => {
      setCustomAddAction(() => () => {
        // Pre-llenar fecha con la seleccionada
        setEditingEventId(null);
        setNewEventTitle('');
        setNewEventDesc('');
        setNewEventType(agendaTypes.length > 0 ? agendaTypes[0].name : 'Meeting');
        setNewEventTime('09:00');
        setIsModalVisible(true);
        setInvitedUserIds([]);
        setUserSearch('');
        setShowUserSuggestions(false);
      });
      return () => setCustomAddAction(null);
    }, [agendaTypes])
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

  // Cargar usuarios disponibles
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/api/users');
        setAvailableUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    if (token) fetchUsers();
  }, [token]);

  // Cargar tipos de agenda desde la API
  useEffect(() => {
    if (token) {
      console.log('Fetching agenda types from API...');
      api.get('/api/catalogs/type/AGENDA_TYPE')
        .then(res => {
          console.log('Agenda types loaded:', res.data);
          if (Array.isArray(res.data)) {
            setAgendaTypes(res.data);
          }
        })
        .catch(err => console.error('Error fetching agenda types:', err));
    }
  }, [token]);

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

  // Función simulada para enviar Push Notification
  const sendPushNotification = async (userId: string, title: string, body: string) => {
    // Aquí iría la lógica real con Expo Notifications o Firebase
    // Ejemplo:
    // await fetch('https://exp.host/--/api/v2/push/send', {
    //   body: JSON.stringify({ to: userPushToken, title, body })
    // });
    
    // Por ahora, simulamos con un log
    const user = availableUsers.find(u => u.id === userId);
    console.log(`[PUSH SIMULADO] Para: ${user?.username} | Título: ${title} | Mensaje: ${body}`);
  };

  const handleSaveEvent = async () => {
    if (!newEventTitle) {
      showAlert(i18n.t('common.error'), i18n.t('agenda.titleRequired'));
      return;
    }
    const eventData = {
      title: newEventTitle,
      description: newEventDesc,
      date: formatDateKey(selectedDate),
      time: newEventTime || '00:00',
      type: newEventType,
      invitedUserIds, // Enviamos la lista de usuarios invitados
    };
    
    try {
      if (editingEventId) {
        await updateEvent({ ...eventData, id: editingEventId } as CalendarEvent);
      } else {
        await addEvent(eventData);
      }

      // --- Lógica de Notificaciones ---
      if (invitedUserIds.length > 0) {
        // 1. Agregar notificación al Dashboard (Historial)
        addNotification(i18n.t('agenda.invitedUsers', { count: invitedUserIds.length, event: newEventTitle }), 'user-plus');

        // 2. Enviar Push Notification a cada usuario invitado
        invitedUserIds.forEach(uid => sendPushNotification(uid, i18n.t('agenda.newInvitation'), `${i18n.t('agenda.invitedTo')} ${newEventTitle}`));
      }
    } catch (error) {
      showAlert(i18n.t('common.error'), i18n.t('agenda.saveError'));
    }

    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setNewEventTitle('');
    setNewEventDesc('');
    setNewEventTime('');
    setEditingEventId(null);
    setNewEventType(agendaTypes.length > 0 ? agendaTypes[0].name : 'Meeting');
    setInvitedUserIds([]);
    setUserSearch('');
    setShowUserSuggestions(false);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setNewEventTitle(event.title);
    setNewEventDesc(event.description);
    setNewEventTime(event.time);
    setNewEventType(event.type);
    // Asumimos que el evento tiene la propiedad invitedUserIds, si no, array vacío
    setInvitedUserIds((event as any).invitedUserIds || []);
    setEditingEventId(event.id);

    // Establecer la fecha seleccionada a la fecha del evento para que no se pierda al editar
    if (event.date) {
      const [y, m, d] = event.date.split('-').map(Number);
      setSelectedDate(new Date(y, m - 1, d));
    }

    setIsModalVisible(true);
  };

  const handleDeleteEvent = (id: string) => {
    showAlert(i18n.t('common.delete'), i18n.t('projectDetail.deleteConfirmation'), [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      { text: i18n.t('common.delete'), style: 'destructive', onPress: () => deleteEvent(id) }
    ]);
  };

  // Obtener colores por tipo
  const getTypeColor = (type: string) => {
    const typeObj = agendaTypes.find(t => t.name === type);
    if (typeObj?.metadata?.primaryColor) {
      return typeObj.metadata.primaryColor;
    }
    if (typeObj?.color) {
      return typeObj.color;
    }
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
              <Text style={styles.modalTitle}>{editingEventId ? i18n.t('agenda.editEvent') : i18n.t('agenda.newEvent')}</Text>
              <Pressable onPress={handleCloseModal}>
                <Feather name="x" size={24} color="#4A5568" />
              </Pressable>
            </View>

            <Text style={styles.label}>{i18n.t('common.title')}</Text>
            <TextInput 
              style={styles.input} 
              placeholder={i18n.t('agenda.titlePlaceholder')}
              value={newEventTitle}
              onChangeText={setNewEventTitle}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{i18n.t('common.time')}</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="00:00" 
                  value={newEventTime}
                  onChangeText={setNewEventTime}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{i18n.t('common.date')}</Text>
                <View style={[styles.input, { justifyContent: 'center', backgroundColor: '#EDF2F7' }]}>
                  <Text style={{ color: '#4A5568' }}>{formatDateKey(selectedDate)}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.label}>{i18n.t('common.type')}</Text>
            <View style={styles.typeSelector}>
              {agendaTypes.length > 0 ? (
                agendaTypes.map((typeItem) => {
                  const color = typeItem.metadata?.primaryColor || '#718096';
                  const isSelected = newEventType === typeItem.name;
                  return (
                    <Pressable 
                      key={typeItem.name} 
                      style={[
                        styles.typeOption, 
                        isSelected && styles.typeOptionSelected, 
                        { borderColor: color, backgroundColor: isSelected ? color : '#FFF' }
                      ]}
                      onPress={() => setNewEventType(typeItem.name)}
                    >
                      <Text style={[styles.typeOptionText, isSelected && { color: '#FFF', fontWeight: 'bold' }, { color: isSelected ? '#FFF' : color }]}>
                        {typeItem.name}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                (['Meeting', 'Inspection', 'Delivery', 'Other'] as const).map(type => (
                  <Pressable 
                    key={type} 
                    style={[styles.typeOption, newEventType === type && styles.typeOptionSelected, { borderColor: getTypeColor(type) }]}
                    onPress={() => setNewEventType(type)}
                  >
                    <Text style={[styles.typeOptionText, newEventType === type && { color: '#FFF', fontWeight: 'bold' }, { color: getTypeColor(type) }]}>
                      {type === 'Meeting' ? i18n.t('agenda.typeMeeting') : type === 'Inspection' ? i18n.t('agenda.typeInspection') : type === 'Delivery' ? i18n.t('agenda.typeDelivery') : i18n.t('agenda.typeOther')}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>

            <Text style={styles.label}>{i18n.t('common.description')}</Text>
            <TextInput 
              style={[styles.input, { height: 80 }]} 
              placeholder={i18n.t('agenda.descriptionPlaceholder')}
              multiline
              value={newEventDesc}
              onChangeText={setNewEventDesc}
            />

            <Text style={styles.label}>{i18n.t('agenda.inviteUsers')}</Text>
            
            {/* Chips de usuarios seleccionados */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {invitedUserIds.map(id => {
                const user = availableUsers.find(u => u.id === id);
                if (!user) return null;
                return (
                  <View key={id} style={styles.userChip}>
                    <Text style={styles.userChipText}>{user.username}</Text>
                    <Pressable onPress={() => setInvitedUserIds(prev => prev.filter(uid => uid !== id))}>
                      <Feather name="x" size={14} color="#FFF" />
                    </Pressable>
                  </View>
                );
              })}
            </View>

            {/* Input de Búsqueda */}
            <View style={{ zIndex: 10 }}>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('common.searchUser')}
                value={userSearch}
                onChangeText={(text) => {
                  setUserSearch(text);
                  setShowUserSuggestions(text.length > 0);
                }}
                onFocus={() => setShowUserSuggestions(userSearch.length > 0)}
              />
              {showUserSuggestions && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView style={{ maxHeight: 150 }} keyboardShouldPersistTaps="handled">
                    {availableUsers
                      .filter(u => !invitedUserIds.includes(u.id) && (u.username || '').toLowerCase().includes(userSearch.toLowerCase()))
                      .map(user => (
                        <Pressable
                          key={user.id}
                          style={styles.suggestionItem}
                          onPress={() => {
                            setInvitedUserIds(prev => [...prev, user.id]);
                            setUserSearch('');
                            setShowUserSuggestions(false);
                          }}
                        >
                          <Text style={styles.suggestionText}>{user.username}</Text>
                          <Text style={styles.suggestionRole}>{user.role}</Text>
                        </Pressable>
                      ))}
                    {availableUsers.filter(u => !invitedUserIds.includes(u.id) && (u.username || '').toLowerCase().includes(userSearch.toLowerCase())).length === 0 && (
                      <View style={styles.suggestionItem}>
                        <Text style={{ color: '#A0AEC0', fontStyle: 'italic' }}>{i18n.t('common.noUsersFound')}</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            <Pressable style={styles.saveButton} onPress={handleSaveEvent}>
              <Text style={styles.saveButtonText}>{editingEventId ? i18n.t('agenda.updateEvent') : i18n.t('agenda.saveEvent')}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <AlertComponent />
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

  // Estilos lista de usuarios
  userChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3182CE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  userChipText: { color: '#FFF', fontSize: 12, marginRight: 4 },
  suggestionsContainer: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, maxHeight: 150, zIndex: 20 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  suggestionText: { fontSize: 14, color: '#2D3748' },
  suggestionRole: { fontSize: 12, color: '#718096' },
});