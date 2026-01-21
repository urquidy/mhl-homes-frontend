
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Platform, Image, Alert, Linking, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import i18n from '../../../constants/i18n';
import { ProjectData } from './ProjectCreationStepper';
import MapView from '../MapComponent';


interface Step3Props {
  data: Pick<ProjectData, 'address' | 'selectedFile'>;
  onUpdate: (update: Partial<ProjectData>) => void;
}

const Step3LocationAndPlan = ({ data, onUpdate }: Step3Props) => {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 19.4326, // Default to CDMX
    longitude: -99.1332,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert(i18n.t('common.permissionGallery'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const fileName = asset.fileName || asset.uri.split('/').pop() || 'image.jpg';
      const type = asset.mimeType || 'image/jpeg';
      onUpdate({ selectedFile: { uri: asset.uri, name: fileName, type: type } });
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
      onUpdate({ selectedFile: { uri: asset.uri, name: asset.name, type: 'application/pdf', blob: (asset as any).file } });
    } catch (err) {
      console.log('Error picking document:', err);
    }
  };

  const handleOpenMapPicker = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      try {
        const location = await Location.getCurrentPositionAsync({});
        setMapRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
        setIsMapVisible(true);
      } catch (error) {
        Alert.alert("Error", "Could not get current location.");
        setIsMapVisible(true); // Open with default location
      }
    } else {
        Alert.alert(
            'Permission Denied',
            'Location permission is required. Please enable it in settings.',
            [{ text: 'Cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
        );
    }
  };

  const confirmLocation = async () => {
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
      });

      if (result.length > 0) {
        const item = result[0];
        const newAddress = `${item.street || ''} ${item.streetNumber || ''}, ${item.city || ''}`.trim().replace(/^,/, '').trim();
        if (newAddress) onUpdate({ address: newAddress });
      }
    } catch (error) {
      console.log('Error geocoding:', error);
    }
    setIsMapVisible(false);
  };

  return (
    <View>
      <Text style={styles.label}>{i18n.t('newProject.addressLabel')}</Text>
      <View style={styles.addressRow}>
        <TextInput
          style={[styles.input, styles.addressInput]}
          placeholder={i18n.t('newProject.addressPlaceholder')}
          value={data.address}
          onChangeText={(text) => onUpdate({ address: text })}
        />
        <Pressable style={styles.mapButton} onPress={handleOpenMapPicker}>
          <Feather name="map-pin" size={22} color="#4A5568" />
        </Pressable>
      </View>

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

      {data.selectedFile && (
        <View style={styles.imagePreviewContainer}>
          {data.selectedFile.type === 'application/pdf' ? (
            <View style={styles.pdfPreview}>
              <Feather name="file-text" size={48} color="#E53E3E" />
              <Text style={styles.pdfName}>{data.selectedFile.name}</Text>
            </View>
          ) : (
            <Image source={{ uri: data.selectedFile.uri }} style={styles.imagePreview} resizeMode="cover" />
          )}
          <Pressable style={styles.removeImageButton} onPress={() => onUpdate({ selectedFile: null })}>
            <Feather name="x" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      )}

      {/* Map Modal */}
      <Modal visible={isMapVisible} animationType="slide">
        <View style={styles.mapContainer}>
          <MapView style={styles.map} region={mapRegion} onRegionChangeComplete={setMapRegion} />
          <View style={styles.centerMarkerContainer} pointerEvents="none">
            <Feather name="map-pin" size={40} color="#D4AF37" />
          </View>
          <View style={styles.mapFooter}>
            <Text style={styles.mapInstruction}>{i18n.t('newProject.mapInstruction')}</Text>
            <View style={styles.mapButtonsRow}>
              <Pressable style={[styles.button, styles.cancelButton, { flex: 1, marginRight: 8 }]} onPress={() => setIsMapVisible(false)}>
                <Text style={[styles.buttonText, styles.cancelButtonText]}>{i18n.t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.button, { flex: 1, marginLeft: 8 }]} onPress={confirmLocation}>
                <Text style={styles.buttonText}>{i18n.t('common.confirm')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
    label: { fontSize: 16, color: '#4A5568', marginBottom: 8, fontFamily: 'DMSans-Bold' },
    input: { backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, fontFamily: 'DMSans-Regular', color: '#2D3748' },
    addressRow: { flexDirection: 'row', marginBottom: 16 },
    addressInput: { flex: 1, marginBottom: 0, marginRight: 12 },
    mapButton: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, backgroundColor: '#EDF2F7', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    uploadButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', borderRadius: 8, padding: 20 },
    uploadButtonText: { marginLeft: 8, color: '#4A5568', fontSize: 16, fontFamily: 'DMSans-Regular' },
    imagePreviewContainer: { position: 'relative', marginBottom: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
    imagePreview: { width: '100%', height: 200 },
    pdfPreview: { width: '100%', height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7FAFC' },
    pdfName: { marginTop: 12, fontSize: 16, color: '#2D3748', fontFamily: 'DMSans-Bold' },
    removeImageButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4 },
    mapContainer: { flex: 1 },
    map: { flex: 1 },
    centerMarkerContainer: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -40, zIndex: 10 },
    mapFooter: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E2E8F0', paddingBottom: 30 },
    mapInstruction: { textAlign: 'center', marginBottom: 16, color: '#4A5568', fontSize: 16 },
    mapButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    button: { padding: 16, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'DMSans-Bold' },
    cancelButton: { backgroundColor: '#EDF2F7' },
    cancelButtonText: { color: '#4A5568' },
});

export default Step3LocationAndPlan;
