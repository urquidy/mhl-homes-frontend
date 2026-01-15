import { Fonts } from '@/constants/theme';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface AlertButton {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: 'default' | 'cancel' | 'destructive';
  color?: string;
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

export const useCustomAlert = () => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });
  const { theme } = useTheme();

  const showAlert = useCallback((title: string, message?: string, buttons?: AlertButton[]) => {
    setAlertState({
      visible: true,
      title,
      message,
      buttons: buttons || [{ text: 'OK', onPress: () => {}, style: 'default' }],
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  const AlertComponent = useCallback(() => (
    <Modal
      visible={alertState.visible}
      transparent={true}
      animationType="fade"
      onRequestClose={closeAlert}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{alertState.title}</Text>
          {alertState.message ? <Text style={styles.message}>{alertState.message}</Text> : null}
          
          <ScrollView style={{ maxHeight: 300, width: '100%' }} showsVerticalScrollIndicator={false}>
            <View style={styles.buttonContainer}>
              {alertState.buttons.map((btn, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.button,
                    btn.style === 'cancel' ? styles.cancelButton : { backgroundColor: theme.primaryColor },
                    btn.style === 'destructive' ? styles.destructiveButton : {},
                    index < alertState.buttons.length - 1 ? { marginBottom: 8 } : {}
                  ]}
                  onPress={async () => {
                    closeAlert();
                    if (btn.onPress) await btn.onPress();
                  }}
                >
                  <Text style={[
                    styles.buttonText,
                    btn.style === 'cancel' ? styles.cancelText : styles.defaultText,
                    btn.style === 'destructive' ? styles.destructiveText : {},
                    btn.color ? { color: btn.color } : {}
                  ]}>
                    {btn.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  ), [alertState, closeAlert]);

  return { showAlert, closeAlert, AlertComponent };
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { width: '100%', maxWidth: 350, backgroundColor: '#FFF', borderRadius: 20, padding: 24, elevation: 5, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  title: { fontSize: 20, fontFamily: Fonts.title, color: '#1A202C', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 16, fontFamily: Fonts.regular, color: '#4A5568', marginBottom: 24, textAlign: 'center' },
  buttonContainer: { flexDirection: 'column', width: '100%' },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: '100%' },
  cancelButton: { backgroundColor: '#EDF2F7' },
  destructiveButton: { backgroundColor: '#E53E3E' },
  buttonText: { fontFamily: Fonts.bold, fontSize: 16 },
  defaultText: { color: '#FFF' },
  cancelText: { color: '#4A5568' },
  destructiveText: { color: '#FFF' },
});