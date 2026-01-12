import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import i18n from '../../constants/i18n';

interface DocumentUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (data: { name: string; category: string; file: any }) => Promise<void>;
  categories: { id: string; name: string }[];
}

export default function DocumentUploadModal({ visible, onClose, onUpload, categories }: DocumentUploadModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      
      const asset = result.assets[0];
      setFile(asset);
      // Autocompletar nombre si está vacío
      if (!name) {
        const fileName = asset.name.split('.').slice(0, -1).join('.');
        setName(fileName);
      }
    } catch (err) {
      console.log('Error picking document:', err);
    }
  };

  const handleUpload = async () => {
    if (!name || !category || !file) return;
    
    setIsUploading(true);
    try {
      await onUpload({ name, category, file });
      handleClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setCategory('');
    setFile(null);
    setIsUploading(false);
    setShowCategories(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{i18n.t('documents.uploadTitle')}</Text>
            <Pressable onPress={handleClose}><Feather name="x" size={24} color="#4A5568" /></Pressable>
          </View>

          <Text style={styles.label}>{i18n.t('common.name')}</Text>
          <TextInput 
            style={styles.input} 
            value={name} 
            onChangeText={setName} 
            placeholder="Nombre del documento"
          />

          <Text style={styles.label}>{i18n.t('budgets.category')}</Text>
          <View style={{ zIndex: 10 }}>
            <Pressable style={[styles.input, styles.selectButton]} onPress={() => setShowCategories(!showCategories)}>
              <Text style={{ color: category ? '#2D3748' : '#A0AEC0' }}>
                {categories.find(c => c.id === category)?.name || i18n.t('projectDetail.searchCategory')}
              </Text>
              <Feather name="chevron-down" size={20} color="#A0AEC0" />
            </Pressable>
            {showCategories && (
              <View style={styles.dropdown}>
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                  {categories.map(cat => (
                    <Pressable 
                      key={cat.id} 
                      style={styles.dropdownItem} 
                      onPress={() => { setCategory(cat.id); setShowCategories(false); }}
                    >
                      <Text style={styles.dropdownText}>{cat.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <Text style={styles.label}>{i18n.t('projectDetail.selectFile')}</Text>
          {file ? (
            <View style={styles.filePreview}>
              <Feather name="file-text" size={20} color="#3182CE" />
              <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
              <Pressable onPress={() => setFile(null)}><Feather name="x" size={20} color="#E53E3E" /></Pressable>
            </View>
          ) : (
            <Pressable style={styles.uploadButton} onPress={handlePickFile}>
              <Feather name="upload" size={20} color="#4A5568" />
              <Text style={styles.uploadText}>{i18n.t('common.upload')}</Text>
            </Pressable>
          )}

          <View style={styles.footer}>
            <Pressable style={[styles.btn, styles.btnCancel]} onPress={handleClose}>
              <Text style={styles.btnTextCancel}>{i18n.t('common.cancel')}</Text>
            </Pressable>
            <Pressable 
              style={[styles.btn, styles.btnSave, (!name || !category || !file || isUploading) && styles.btnDisabled]} 
              onPress={handleUpload}
              disabled={!name || !category || !file || isUploading}
            >
              {isUploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnTextSave}>{i18n.t('common.save')}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  content: { width: '90%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 12, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1A202C' },
  label: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 16, backgroundColor: '#F7FAFC' },
  selectButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdown: { position: 'absolute', top: 80, left: 0, right: 0, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, elevation: 5, zIndex: 20 },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  dropdownText: { color: '#2D3748' },
  uploadButton: { borderWidth: 1, borderColor: '#CBD5E0', borderStyle: 'dashed', borderRadius: 8, padding: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: '#F7FAFC' },
  uploadText: { marginTop: 8, color: '#4A5568' },
  filePreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EBF8FF', padding: 12, borderRadius: 8, marginBottom: 20 },
  fileName: { flex: 1, marginHorizontal: 10, color: '#2C5282' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  btn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  btnCancel: { backgroundColor: '#EDF2F7' },
  btnSave: { backgroundColor: '#3182CE' },
  btnDisabled: { opacity: 0.5 },
  btnTextCancel: { color: '#4A5568', fontWeight: '600' },
  btnTextSave: { color: '#FFF', fontWeight: '600' },
});
