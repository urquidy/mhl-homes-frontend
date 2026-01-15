
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../../constants/i18n';
import { Fonts } from '../../constants/theme';
import { useProjects } from '../../contexts/ProjectsContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';
import MapView from './MapComponent';

// --- Utilidades para el Calendario ---
const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();


const DatePickerModal = ({ visible, onClose, onSelect, initialDate }: { visible: boolean, onClose: () => void, onSelect: (date: string) => void, initialDate?: string }) => {
  const [currentDate, setCurrentDate] = useState(initialDate ? new Date(initialDate.replace(/-/g, '/')) : new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(month, year);
  const firstDay = getFirstDayOfMonth(month, year);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

  const changeMonth = (increment: number) => {
    setCurrentDate(new Date(year, month + increment, 1));
  };

  const handleDayPress = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    onSelect(dateStr);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.datePickerOverlay}>
        <View style={styles.datePickerContent}>
          <View style={styles.dpHeader}>
            <Pressable onPress={() => changeMonth(-1)} style={styles.dpNavButton}><Feather name="chevron-left" size={24} color="#4A5568" /></Pressable>
            <Text style={styles.dpTitle}>{monthNames[month]} {year}</Text>
            <Pressable onPress={() => changeMonth(1)} style={styles.dpNavButton}><Feather name="chevron-right" size={24} color="#4A5568" /></Pressable>
          </View>
          <View style={styles.dpWeekRow}>
            {daysOfWeek.map(d => <Text key={d} style={styles.dpWeekDay}>{d}</Text>)}
          </View>
          <View style={styles.dpGrid}>
            {days.map((date, i) => (
              <Pressable 
                key={i} 
                style={styles.dpDay} 
                onPress={() => date && handleDayPress(date)}
                disabled={!date}
              >
                {date && <Text style={styles.dpDayText}>{date.getDate()}</Text>}
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.dpCloseButton} onPress={onClose}>
            <Text style={styles.dpCloseText}>{i18n.t('common.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

interface NewProjectModalProps {
  onClose?: () => void;
}

// Función de servicio reutilizable para crear el proyecto
const createProject = async (projectData: any, imageFile: { uri: string, name: string, type: string, blob?: Blob } | null) => {
  const formData = new FormData();

  // 1. Project Data: Usar Blob para asegurar Content-Type: application/json
  // Esto es necesario para que Spring Boot (@RequestPart) procese el JSON correctamente
  if (Platform.OS === 'web') {
    const projectBlob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    formData.append('project', projectBlob as any);
  } else {
    // Solución para error 415 en Backend:
    // Simulamos un archivo usando Data URI para forzar el Content-Type: application/json
    const json = JSON.stringify(projectData);
    // Codificamos a Base64 (btoa maneja caracteres ASCII, unescape+encodeURIComponent maneja Unicode/tildes)
    const b64 = btoa(unescape(encodeURIComponent(json)));
    formData.append('project', {
      uri: `data:application/json;base64,${b64}`,
      name: 'project.json',
      type: 'application/json'
    } as any);
  }

  // 2. File (Imagen)
  if (imageFile) {
    if (Platform.OS === 'web' && imageFile.blob) {
      // En Web usamos el Blob directamente
      formData.append('file', imageFile.blob, imageFile.name);
    } else {
      // En React Native usamos el objeto { uri, name, type }
      formData.append('file', {
        uri: imageFile.uri,
        name: imageFile.name,
        type: imageFile.type,
      } as any);
    }
  }

  // 3. Headers
  // Sobrescribimos el Content-Type para evitar que se envíe application/json (default de axios)
  // En Web usamos undefined para que el navegador genere el boundary.
  // En RN usamos multipart/form-data.
  return await api.post('/api/projects/create', formData, {
    headers: { 'Content-Type': Platform.OS === 'web' ? undefined : 'multipart/form-data' }
  });
};

export default function NewProjectModal({ onClose }: NewProjectModalProps) {
  const router = useRouter();
  const { refreshProjects } = useProjects();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(0);

  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [address, setAddress] = useState('');
  const [planUri, setPlanUri] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{uri: string, name: string, type: string, blob?: any} | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'Not Started' | 'In Progress' | 'Delayed' | 'On Time'>('Not Started');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [isParticipantModalVisible, setIsParticipantModalVisible] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 19.4326, // Coordenada por defecto (ej. CDMX)
    longitude: -99.1332,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Estados para el selector de fecha
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [activeDateInput, setActiveDateInput] = useState<'start' | 'end'>('start');

  // --- Estado para el Wizard (Pasos) ---
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;

  // Validación en tiempo real del paso actual
  const isStepValid = useMemo(() => {
    if (currentStep === 0) {
      return name.trim().length > 0 && client.trim().length > 0;
    }
    return true;
  }, [currentStep, name, client]);

  // Scroll al inicio al cambiar de paso
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [currentStep]);

  // Animación de deslizamiento al cambiar de paso
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: -currentStep * contentWidth,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentStep, contentWidth]);

  const handleNext = () => {
    if (isStepValid) setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
  };

  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/api/users');
        setAvailableUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  const toggleParticipant = (userId: string) => {
    if (participants.includes(userId)) {
      setParticipants(participants.filter(p => p !== userId));
    } else {
      setParticipants([...participants, userId]);
    }
  };

  const openDatePicker = (type: 'start' | 'end') => {
    setActiveDateInput(type);
    setIsDatePickerVisible(true);
  };

  const handleDateSelect = (date: string) => {
    if (activeDateInput === 'start') setStartDate(date);
    else setEndDate(date);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert(i18n.t('common.permissionGallery'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: false, // No necesitamos base64 si usamos URI/Blob
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const MAX_SIZE_BYTES = 50 * 1024 * 1024; // Límite de 50MB

      if (asset.fileSize && asset.fileSize > MAX_SIZE_BYTES) {
        alert('La imagen seleccionada es demasiado grande. El límite es de 50MB.');
        return;
      }

      setPlanUri(asset.uri);
      
      const fileName = asset.fileName || asset.uri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(fileName);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      setSelectedFile({
        uri: asset.uri,
        name: fileName,
        type: type,
      });
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const MAX_SIZE_BYTES = 50 * 1024 * 1024; // Límite de 50MB

      if (asset.size && asset.size > MAX_SIZE_BYTES) {
        alert('El archivo es demasiado grande. El límite es de 50MB.');
        return;
      }

      setPlanUri(asset.uri);
      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        type: 'application/pdf',
        blob: (asset as any).file 
      });
    } catch (err) {
      console.log('Error picking document:', err);
    }
  };

  const openMap = () => {
    const query = encodeURIComponent(address);
    // Definimos la URL según la plataforma
    const url = Platform.select({
      ios: query ? `http://maps.apple.com/?q=${query}` : 'http://maps.apple.com/',
      android: query ? `geo:0,0?q=${query}` : 'geo:0,0',
      web: `https://www.google.com/maps${query ? '/search/?api=1&query=' + query : ''}`,
    });

    if (url) {
      Linking.openURL(url).catch(err => console.error('Error al abrir el mapa:', err));
    }
  };

  const handleOpenMapPicker = async () => {
    setIsMapVisible(true);
    
    // Obtener ubicación actual para centrar el mapa al abrirlo
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const location = await Location.getCurrentPositionAsync({});
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  };

  const confirmLocation = async () => {
    try {
      // Convertir coordenadas a dirección (Reverse Geocoding)
      const result = await Location.reverseGeocodeAsync({
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
      });

      if (result.length > 0) {
        const item = result[0];
        // Construir string de dirección legible
        const newAddress = `${item.street || ''} ${item.streetNumber || ''}, ${item.city || ''}`.trim().replace(/^,/, '').trim();
        if (newAddress) setAddress(newAddress);
      }
    } catch (error) {
      console.log('Error geocoding:', error);
    }
    setIsMapVisible(false);
  };

  const handleClose = () => {
    // Limpiar formulario al cerrar
    setName('');
    setClient('');
    setAddress('');
    setPlanUri(null);
    setSelectedFile(null);
    setStartDate('');
    setEndDate('');
    setStatus('Not Started');
    setParticipants([]);
    setCurrentStep(0);
    if (onClose) onClose();
    else router.back();
  };

  const handleCreateProject = async () => {
      setIsLoading(true);
      try {
        // Convertimos los IDs seleccionados a Usernames para enviar a la API
        const participantUsernames = participants.map(pId => {
          const user = availableUsers.find(u => u.id === pId);
          return user ? user.username : null;
        }).filter(u => u !== null) as string[];

        const formData = new FormData();

        const statusMap: Record<string, string> = {
          'Not Started': 'NOT_STARTED',
          'In Progress': 'IN_PROGRESS',
          'Delayed': 'DELAYED',
          'On Time': 'ON_TIME'
        };

        const projectData = {
          name,
          client,
          address,
          startDate,
          endDate,
          status: statusMap[status] || status,
          participants: participantUsernames,
          progress: 0,
        };

        let imageFile = null;
        if (selectedFile) {
          if (Platform.OS === 'web') {
            if (selectedFile.blob) {
               imageFile = { uri: selectedFile.uri, name: selectedFile.name, type: selectedFile.type, blob: selectedFile.blob };
            } else {
               const response = await fetch(selectedFile.uri);
               const blob = await response.blob();
               imageFile = { uri: selectedFile.uri, name: selectedFile.name, type: selectedFile.type, blob };
            }
          } else {
            imageFile = { uri: selectedFile.uri, name: selectedFile.name, type: selectedFile.type };
          }
        } else if (planUri) {
          // Fallback por si acaso, aunque selectedFile debería estar seteado
          const filename = planUri.split('/').pop() || 'plan.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          imageFile = { uri: planUri, name: filename, type };
        }

        await createProject(projectData, imageFile);

        // Refrescar la lista de proyectos globalmente
        await refreshProjects();

        handleClose();
      } catch (error: any) {
        console.error(error);
        if (error.response && error.response.data && error.response.data.message) {
          if (error.response.data.message.includes('límite de proyectos')) {
            setErrorMessage(i18n.t('projects.limitReached')); // Corrected key to plural 'projects'
          } else {
            setErrorMessage(error.response.data.message);
          }
        } else {
          setErrorMessage(error.message || i18n.t('projects.createError'));
        }
        setErrorModalVisible(true);
      } finally {
        setIsLoading(false);
      }
  };

  // Títulos de los pasos
  const stepTitles = [
    i18n.t('newProject.headerTitle'), // Información General
    'Cronograma y Estado',
    'Equipo de Trabajo',
    'Documentación'
  ];

  return (
    <View style={[styles.container, { paddingTop: Platform.OS !== 'web' ? insets.top : 0 }]}>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>{stepTitles[currentStep]}</Text>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Feather name="x" size={24} color="#4A5568" />
          </Pressable>
        </View>
        
        {/* Indicador de Pasos */}
        <View style={styles.stepIndicator}>
          {[0, 1, 2, 3].map((step) => (
            <View 
              key={step} 
              style={[
                styles.stepDot, 
                step <= currentStep && { backgroundColor: theme.primaryColor, width: 24 } // El paso actual/completado es más largo o coloreado
              ]} 
            />
          ))}
        </View>

        {/* Contenedor Deslizable de Pasos */}
        <View 
          style={{ overflow: 'hidden' }} 
          onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View style={{ 
            flexDirection: 'row', 
            width: contentWidth * totalSteps, 
            transform: [{ translateX: slideAnim }],
            opacity: contentWidth === 0 ? 0 : 1 // Evitar parpadeo inicial
          }}>
            {/* --- PASO 1: Información General --- */}
            <View style={{ width: contentWidth }}>
            <Text style={styles.label}>{i18n.t('newProject.nameLabel')} *</Text>
            <TextInput 
              style={styles.input} 
              placeholder={i18n.t('newProject.namePlaceholder')}
              value={name}
              onChangeText={setName}
            />
            
            <Text style={styles.label}>{i18n.t('newProject.clientLabel')} *</Text>
            <TextInput 
              style={styles.input} 
              placeholder={i18n.t('newProject.clientPlaceholder')}
              value={client}
              onChangeText={setClient}
            />

            <Text style={styles.label}>{i18n.t('newProject.addressLabel')}</Text>
            <View style={styles.addressRow}>
              <TextInput 
                style={[styles.input, styles.addressInput]} 
                placeholder={i18n.t('newProject.addressPlaceholder')}
                value={address}
                onChangeText={setAddress}
              />
              <Pressable style={styles.mapButton} onPress={handleOpenMapPicker}>
                <Feather name="map-pin" size={22} color="#4A5568" />
              </Pressable>
            </View>
            </View>

            {/* --- PASO 2: Fechas y Estado --- */}
            <View style={{ width: contentWidth }}>
            <View style={styles.row}>
              <View style={styles.halfColumn}>
                <Text style={styles.label}>{i18n.t('newProject.startDate')}</Text>
                <Pressable onPress={() => openDatePicker('start')}>
                  <View pointerEvents="none">
                    <TextInput 
                      style={styles.input} 
                      placeholder="YYYY-MM-DD" 
                      value={startDate}
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
                      placeholder="YYYY-MM-DD" 
                      value={endDate}
                      editable={false}
                    />
                  </View>
                  <Feather name="calendar" size={20} color="#718096" style={styles.inputIcon} />
                </Pressable>
              </View>
            </View>

            <Text style={styles.label}>{i18n.t('newProject.status')}</Text>
            <View style={styles.statusContainer}>
              {(['Not Started', 'In Progress', 'Delayed', 'On Time'] as const).map((s) => (
                <Pressable key={s} style={[styles.statusButton, status === s && styles.statusButtonActive]} onPress={() => setStatus(s)}>
                  <Text style={[styles.statusButtonText, status === s && styles.statusButtonTextActive]}>
                    {s === 'Not Started' ? (i18n.t('dashboard.status.notStarted') || 'Not Started') :
                    s === 'In Progress' ? i18n.t('dashboard.status.inProgress') : 
                    s === 'Delayed' ? i18n.t('dashboard.status.delayed') : 
                    i18n.t('dashboard.status.onTime')}
                  </Text>
                </Pressable>
              ))}
            </View>
            </View>

            {/* --- PASO 3: Participantes --- */}
            <View style={{ width: contentWidth }}>
            <Text style={styles.label}>Participantes</Text>
            <View style={styles.participantsContainer}>
              {participants.map((pId, index) => {
                const user = availableUsers.find(u => u.id === pId);
                return (
                  <View key={index} style={styles.participantChip}>
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
            </View>

            {/* --- PASO 4: Documentación --- */}
            <View style={{ width: contentWidth }}>
            <Text style={styles.label}>{i18n.t('newProject.planLabel')}</Text>
            <View style={styles.uploadButtonsRow}>
              <Pressable style={[styles.uploadButton, { flex: 1, marginRight: 8 }]} onPress={pickImage}>
                <Feather name="image" size={20} color="#4A5568" />
                <Text style={styles.uploadButtonText}>Imagen</Text>
              </Pressable>
              <Pressable style={[styles.uploadButton, { flex: 1, marginLeft: 8 }]} onPress={pickDocument}>
                <Feather name="file-text" size={20} color="#4A5568" />
                <Text style={styles.uploadButtonText}>PDF</Text>
              </Pressable>
            </View>

            {planUri && (
              <View style={styles.imagePreviewContainer}>
                {selectedFile?.type === 'application/pdf' ? (
                  <View style={styles.pdfPreview}>
                    <Feather name="file-text" size={48} color="#E53E3E" />
                    <Text style={styles.pdfName}>{selectedFile.name}</Text>
                  </View>
                ) : (
                  <Image source={{ uri: planUri }} style={styles.imagePreview} resizeMode="cover" />
                )}
                <Pressable style={styles.removeImageButton} onPress={() => { setPlanUri(null); setSelectedFile(null); }}>
                  <Feather name="x" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            )}
            </View>
          </Animated.View>
        </View>

        {/* --- Botones de Navegación --- */}
        <View style={styles.navigationButtons}>
          {currentStep > 0 ? (
            <Pressable style={[styles.button, styles.navButton, styles.cancelButton]} onPress={handleBack}>
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Atrás</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.button, styles.navButton, styles.cancelButton]} onPress={handleClose}>
              <Text style={[styles.buttonText, styles.cancelButtonText]}>{i18n.t('common.cancel')}</Text>
            </Pressable>
          )}

          {currentStep < totalSteps - 1 ? (
            <Pressable 
              style={[
                styles.button, 
                styles.navButton, 
                { backgroundColor: isStepValid ? theme.primaryColor : '#CBD5E0' }
              ]} 
              onPress={handleNext}
              disabled={!isStepValid}
            >
              <Text style={styles.buttonText}>Siguiente</Text>
            </Pressable>
          ) : (
            <Pressable 
              style={[styles.button, styles.navButton, { backgroundColor: theme.primaryColor }, (isLoading || !isStepValid) && { opacity: 0.7, backgroundColor: '#CBD5E0' }]} 
              onPress={handleCreateProject} 
              disabled={isLoading || !isStepValid}
            >
              {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{planUri ? i18n.t('newProject.createButton') : i18n.t('common.skip')}</Text>}
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* Modal del Mapa (Solo visible en móviles si se activa) */}
      <Modal visible={isMapVisible} animationType="slide">
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
          >
            {/* El mapa se mueve debajo del marcador fijo */}
          </MapView>
          
          {/* Marcador central fijo (UI Overlay) */}
          <View style={styles.centerMarkerContainer} pointerEvents="none">
            <Feather name="map-pin" size={40} color={theme.primaryColor} />
          </View>

          <View style={styles.mapFooter}>
            <Text style={styles.mapInstruction}>{i18n.t('newProject.mapInstruction')}</Text>
            <View style={styles.mapButtonsRow}>
              <Pressable style={[styles.button, styles.cancelButton, { flex: 1, marginRight: 8, marginTop: 0 }]} onPress={() => setIsMapVisible(false)}>
                <Text style={[styles.buttonText, styles.cancelButtonText]}>{i18n.t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.button, { backgroundColor: theme.primaryColor, flex: 1, marginLeft: 8, marginTop: 0 }]} onPress={confirmLocation}>
                <Text style={styles.buttonText}>{i18n.t('common.confirm')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Calendario */}
      <DatePickerModal 
        visible={isDatePickerVisible} 
        onClose={() => setIsDatePickerVisible(false)} 
        onSelect={handleDateSelect}
        initialDate={activeDateInput === 'start' ? startDate : endDate}
      />

      {/* Modal de Selección de Participantes */}
      <Modal visible={isParticipantModalVisible} transparent animationType="fade" onRequestClose={() => setIsParticipantModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Participantes</Text>
              <Pressable onPress={() => setIsParticipantModalVisible(false)}>
                <Feather name="x" size={24} color="#4A5568" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {availableUsers.map(user => {
                const isSelected = participants.includes(user.id);
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
            <Pressable style={[styles.button, { backgroundColor: theme.primaryColor }]} onPress={() => setIsParticipantModalVisible(false)}>
              <Text style={styles.buttonText}>Listo</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de Error */}
      <Modal
        visible={errorModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setErrorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 350 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#E53E3E' }]}>Error</Text>
              <Pressable onPress={() => setErrorModalVisible(false)}>
                <Feather name="x" size={24} color="#4A5568" />
              </Pressable>
            </View>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <Pressable style={[styles.button, { marginTop: 0 }]} onPress={() => setErrorModalVisible(false)}>
              <Text style={styles.buttonText}>Entendido</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.6)' : '#FFFFFF', // Fondo oscuro transparente en web
    justifyContent: Platform.OS === 'web' ? 'center' : undefined,
    alignItems: Platform.OS === 'web' ? 'center' : undefined,
  },
  scrollView: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 600 : undefined,
    maxHeight: Platform.OS === 'web' ? '90%' : undefined,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 16 : 0,
    // Sombra para dar efecto de elevación en el modal web (si se usa standalone)
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      }
    })
  },
  scrollContent: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.title,
    color: '#1A202C',
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 8,
    fontFamily: Fonts.bold,
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    fontFamily: Fonts.regular,
    color: '#2D3748',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  navButton: {
    flex: 1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  cancelButton: {
    backgroundColor: '#EDF2F7',
  },
  cancelButtonText: {
    color: '#4A5568',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    minWidth: 100,
  },
  uploadButtonText: {
    marginLeft: 8,
    color: '#4A5568',
    fontSize: 16,
    fontFamily: Fonts.regular,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imagePreview: {
    width: '100%',
    height: 200,
  },
  pdfPreview: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  pdfName: {
    marginTop: 12,
    fontSize: 16,
    color: '#2D3748',
    fontFamily: 'DMSans-Bold',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  addressRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  addressInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 12,
  },
  mapButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  centerMarkerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20, // Mitad del ancho del icono (40/2)
    marginTop: -40, // Altura del icono para que la punta quede en el centro
    zIndex: 10,
  },
  mapFooter: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapInstruction: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#4A5568',
    fontSize: 16,
  },
  mapButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  halfColumn: { flex: 1, minWidth: '45%' },
  statusContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  statusButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  statusButtonActive: {
    backgroundColor: '#2D3748', // Color oscuro para estado activo por defecto, o usar theme.primaryColor si se prefiere
    borderColor: '#2D3748',
  },
  statusButtonText: { 
    color: '#4A5568', 
    fontFamily: Fonts.bold,
  },
  statusButtonTextActive: { color: '#FFFFFF' },
  
  // Estilos para el DatePicker
  inputIcon: { position: 'absolute', right: 12, top: 12 },
  datePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  datePickerContent: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, width: '90%', maxWidth: 350, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  dpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dpTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3748' },
  dpNavButton: { padding: 8 },
  dpWeekRow: { flexDirection: 'row', marginBottom: 8 },
  dpWeekDay: { flex: 1, textAlign: 'center', fontSize: 12, color: '#718096', fontWeight: '600' },
  dpGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dpDay: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  dpDayText: { fontSize: 14, color: '#2D3748' },
  dpCloseButton: { marginTop: 16, padding: 12, alignItems: 'center', backgroundColor: '#EDF2F7', borderRadius: 8 },
  dpCloseText: { color: '#4A5568', fontWeight: 'bold' },

  // Estilos para Participantes
  participantsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3748',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  participantChipText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  addParticipantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderStyle: 'dashed',
  },
  addParticipantText: {
    marginLeft: 6,
    color: '#4A5568',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  // Estilos Modal Genérico
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 12, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontFamily: Fonts.title, color: '#1A202C' },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  userName: { fontSize: 16, fontFamily: Fonts.bold, color: '#2D3748' },
  userRole: { fontSize: 14, fontFamily: Fonts.regular, color: '#718096' },
  modalMessage: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 24,
    fontFamily: Fonts.regular,
  },
});
