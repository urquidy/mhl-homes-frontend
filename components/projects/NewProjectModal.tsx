import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, View, SafeAreaView } from 'react-native';
import ProjectCreationStepper from './stepper/ProjectCreationStepper';

interface NewProjectModalProps {
  onClose?: () => void;
}

export default function NewProjectModal({ onClose }: NewProjectModalProps) {
  const router = useRouter();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  // Use SafeAreaView on mobile to respect status bar and notches
  const ContainerComponent = Platform.OS === 'web' ? View : SafeAreaView;

  return (
    <ContainerComponent style={styles.container}>
      <View style={styles.modalView}>
        {/* The close button is positioned within the full-screen view */}
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Feather name="x" size={24} color="#4A5568" />
        </Pressable>
        
        <ProjectCreationStepper onClose={handleClose} />
      </View>
    </ContainerComponent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Solid white background for all platforms to ensure no transparency
    backgroundColor: '#FFFFFF',
  },
  modalView: {
    flex: 1, // Take up all space of the container
    backgroundColor: '#fff',
    // No platform-specific styles, it's a full screen on web and mobile
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDF2F7', // Light gray background
    justifyContent: 'center',
    alignItems: 'center',
  },
});
