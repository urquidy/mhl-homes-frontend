
import React from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import i18n from '../../../constants/i18n';
import { ProjectData } from './ProjectCreationStepper';

interface Step1Props {
  data: Pick<ProjectData, 'name' | 'client' | 'status'>;
  onUpdate: (update: Partial<ProjectData>) => void;
}

const Step1ProjectDetails = ({ data, onUpdate }: Step1Props) => {
  return (
    <View>
      <Text style={styles.label}>{i18n.t('newProject.nameLabel')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('newProject.namePlaceholder')}
        value={data.name}
        onChangeText={(text) => onUpdate({ name: text })}
      />

      <Text style={styles.label}>{i18n.t('newProject.clientLabel')}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('newProject.clientPlaceholder')}
        value={data.client}
        onChangeText={(text) => onUpdate({ client: text })}
      />

      <Text style={styles.label}>{i18n.t('newProject.status')}</Text>
      <View style={styles.statusContainer}>
        {(['Not Started', 'In Progress', 'Delayed', 'On Time'] as const).map((s) => (
          <Pressable 
            key={s} 
            style={[styles.statusButton, data.status === s && styles.statusButtonActive]} 
            onPress={() => onUpdate({ status: s })}
          >
            <Text style={[styles.statusButtonText, data.status === s && styles.statusButtonTextActive]}>
              {s === 'Not Started' ? (i18n.t('dashboard.status.notStarted') || 'Not Started') :
               s === 'In Progress' ? i18n.t('dashboard.status.inProgress') : 
               s === 'Delayed' ? i18n.t('dashboard.status.delayed') : 
               i18n.t('dashboard.status.onTime')}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 8,
    fontFamily: 'DMSans-Bold',
  },
  input: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    fontFamily: 'DMSans-Regular',
    color: '#2D3748',
  },
  statusContainer: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 16 
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  statusButtonActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  statusButtonText: { 
    color: '#4A5568', 
    fontFamily: 'DMSans-Bold',
  },
  statusButtonTextActive: { 
    color: '#FFFFFF' 
  },
});

export default Step1ProjectDetails;
