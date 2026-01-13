import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import i18n from '../../constants/i18n';

interface AspectRatioModalProps {
  visible: boolean;
  onClose: () => void;
  currentAspectRatio: number | null;
  onAspectRatioChange: (ratio: number) => void;
}

export default function AspectRatioModal({ visible, onClose, currentAspectRatio, onAspectRatioChange }: AspectRatioModalProps) {
  const [customAspectRatio, setCustomAspectRatio] = useState('1.5');

  useEffect(() => {
    if (currentAspectRatio !== null) {
      setCustomAspectRatio(currentAspectRatio.toFixed(2));
    }
  }, [currentAspectRatio]);

  const handleApplyCustom = () => {
    const val = parseFloat(customAspectRatio);
    if (!isNaN(val) && val > 0) {
      onAspectRatioChange(val);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.inputModalContainer}>
        <View style={styles.inputModalContent}>
          <Text style={styles.inputModalTitle}>{i18n.t('aspectRatio.title')}</Text>
          <Text style={{ marginBottom: 16, color: '#718096' }}>{i18n.t('aspectRatio.instruction')}</Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {[
              { label: '1:1', value: 1 },
              { label: '4:3', value: 4/3 },
              { label: '3:2', value: 1.5 },
              { label: '16:9', value: 16/9 },
              { label: '3:4', value: 3/4 },
              { label: '2:3', value: 2/3 },
            ].map(opt => (
              <Pressable 
                key={opt.label} 
                style={[styles.shapeOption, Math.abs((currentAspectRatio || 1) - opt.value) < 0.01 && styles.shapeOptionSelected]}
                onPress={() => onAspectRatioChange(opt.value)}
              >
                <Text style={[styles.shapeOptionText, Math.abs((currentAspectRatio || 1) - opt.value) < 0.01 && styles.shapeOptionTextSelected]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ marginBottom: 8, fontWeight: '600', color: '#4A5568' }}>{i18n.t('aspectRatio.custom')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
             <TextInput 
                style={[styles.input, { marginBottom: 0, flex: 1 }]} 
                keyboardType="numeric"
                placeholder="Ej. 1.5"
                value={customAspectRatio}
                onChangeText={setCustomAspectRatio}
                onEndEditing={handleApplyCustom}
             />
             <Pressable 
               style={[styles.modalButton, { backgroundColor: '#3182CE', marginLeft: 8 }]}
               onPress={handleApplyCustom}
             >
               <Text style={{ color: '#FFF' }}>{i18n.t('aspectRatio.apply')}</Text>
             </Pressable>
          </View>

          <Pressable style={[styles.modalButton, styles.cancelButton, { width: '100%', marginLeft: 0 }]} onPress={onClose}>
            <Text style={{ fontWeight: 'bold', color: '#4A5568', textAlign: 'center' }}>{i18n.t('aspectRatio.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  inputModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', width: '100%' },
  inputModalContent: { width: '85%', maxWidth: 400, backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 5 },
  inputModalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  shapeOption: { flexDirection: 'row', alignItems: 'center', padding: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, backgroundColor: '#F7FAFC' },
  shapeOptionSelected: { borderColor: '#3182CE', backgroundColor: '#EBF8FF' },
  shapeOptionText: { marginLeft: 6, fontSize: 14, color: '#718096' },
  shapeOptionTextSelected: { color: '#3182CE', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 8 },
  cancelButton: { backgroundColor: '#EDF2F7' },
});