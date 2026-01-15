import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { registerGlobalAlert } from '../services/api';

export default function GlobalAlert() {
  const [visible, setVisible] = useState(false);
  const [alertData, setAlertData] = useState({ title: '', message: '' });
  const { theme } = useTheme();

  useEffect(() => {
    // Nos suscribimos a las alertas globales de la API
    const unsubscribe = registerGlobalAlert((title, message) => {
      setAlertData({ title, message });
      setVisible(true);
    });
    // Limpiamos la suscripción al desmontar
    return unsubscribe;
  }, []);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{alertData.title}</Text>
          <Text style={styles.message}>{alertData.message}</Text>
          <View style={styles.buttonContainer}>
            <Pressable style={[styles.button, { backgroundColor: theme.primaryColor }]} onPress={() => setVisible(false)}>
              <Text style={styles.buttonText}>Entendido</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});