import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface PlanUploadModalProps {
  visible: boolean;
  progress: number;
  onCancel: () => void;
}

export default function PlanUploadModal({ visible, progress, onCancel }: PlanUploadModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Subiendo Plano</Text>
          <Text style={styles.progressText}>
            Por favor espere... {progress}%
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Pressable style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancelar Subida</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', width: '100%' },
  content: { width: '85%', maxWidth: 400, backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 5 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  progressText: { fontSize: 16, color: '#4A5568', marginBottom: 16, textAlign: 'center' },
  progressBarContainer: { height: 10, backgroundColor: '#EDF2F7', borderRadius: 5, width: '100%', overflow: 'hidden', marginBottom: 20 },
  progressBarFill: { height: '100%', backgroundColor: '#3182CE' },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#EDF2F7', width: '100%', alignItems: 'center' },
  cancelButtonText: { fontWeight: 'bold', color: '#E53E3E', textAlign: 'center' }
});