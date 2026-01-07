import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

interface EvidenceUploadModalProps {
  visible: boolean;
}

export default function EvidenceUploadModal({ visible }: EvidenceUploadModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Subiendo Evidencia</Text>
          <View style={styles.body}>
            <ActivityIndicator size="large" color="#3182CE" />
            <Text style={styles.text}>Procesando archivo...</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', width: '100%' },
  content: { width: '85%', maxWidth: 400, backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 5 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  body: { alignItems: 'center', paddingVertical: 20 },
  text: { marginTop: 16, color: '#718096' }
});