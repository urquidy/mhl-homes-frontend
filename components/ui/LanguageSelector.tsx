import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import i18n from '../../constants/i18n';
import { useLanguage } from '../../contexts/LanguageContext';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export default function LanguageSelector({ visible, onClose }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'eu', label: 'Euskara', flag: '🏴' }, // Using black flag as placeholder or Basque flag if available on platform
  ];

  const handleSelect = async (code: string) => {
    await setLanguage(code as any);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{i18n.t('common.search') === 'Buscar' ? 'Seleccionar Idioma' : 'Select Language'}</Text>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color="#4A5568" />
            </Pressable>
          </View>

          {languages.map((lang) => (
            <Pressable
              key={lang.code}
              style={[
                styles.languageOption,
                language === lang.code && styles.languageOptionSelected
              ]}
              onPress={() => handleSelect(lang.code)}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text style={[
                styles.languageLabel,
                language === lang.code && styles.languageLabelSelected
              ]}>
                {lang.label}
              </Text>
              {language === lang.code && (
                <Feather name="check" size={20} color="#3182CE" />
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 350,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  languageOptionSelected: {
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageLabel: {
    flex: 1,
    fontSize: 16,
    color: '#4A5568',
  },
  languageLabelSelected: {
    color: '#3182CE',
    fontWeight: 'bold',
  },
});
