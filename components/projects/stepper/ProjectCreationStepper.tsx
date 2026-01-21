
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, Alert } from 'react-native';
import api from '../../../services/api';
import { useProjects } from '../../../contexts/ProjectsContext';
import i18n from '../../../constants/i18n';

// Import individual step components
import Step1ProjectDetails from './Step1_ProjectDetails';
import Step2DatesAndParticipants from './Step2_DatesAndParticipants';
import Step3LocationAndPlan from './Step3_LocationAndPlan';

const TOTAL_STEPS = 3;

// This type will hold all the data for the new project
export interface ProjectData {
  name: string;
  client: string;
  address: string;
  startDate: string;
  endDate: string;
  status: 'Not Started' | 'In Progress' | 'Delayed' | 'On Time';
  participants: string[];
  progress: number;
  selectedFile: { uri: string; name: string; type: string; blob?: any } | null;
}

const createProject = async (projectData: any, imageFile: { uri: string, name: string, type: string, blob?: Blob } | null) => {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const projectBlob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    formData.append('project', projectBlob as any);
  } else {
    const json = JSON.stringify(projectData);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    formData.append('project', {
      uri: `data:application/json;base64,${b64}`,
      name: 'project.json',
      type: 'application/json'
    } as any);
  }

  if (imageFile) {
    if (Platform.OS === 'web' && imageFile.blob) {
      formData.append('file', imageFile.blob, imageFile.name);
    } else {
      formData.append('file', {
        uri: imageFile.uri,
        name: imageFile.name,
        type: imageFile.type,
      } as any);
    }
  }
  
  return await api.post('/api/projects/create', formData, {
    headers: { 'Content-Type': Platform.OS === 'web' ? undefined : 'multipart/form-data' }
  });
};


const ProjectCreationStepper = ({ onClose }: { onClose: () => void }) => {
  const { refreshProjects } = useProjects();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [projectData, setProjectData] = useState<ProjectData>({
    name: '',
    client: '',
    address: '',
    startDate: '',
    endDate: '',
    status: 'Not Started',
    participants: [],
    progress: 0,
    selectedFile: null,
  });

  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/api/users');
        setAvailableUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
        setErrorMessage('Could not load user list.');
      }
    };
    fetchUsers();
  }, []);

  const handleUpdate = (data: Partial<ProjectData>) => {
    setProjectData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!projectData.name || !projectData.client) {
        Alert.alert('Campos incompletos', i18n.t('newProject.validationError'));
        return;
    }
    
    setIsLoading(true);
    setErrorMessage('');

    try {
        const participantUsernames = projectData.participants.map(pId => {
            const user = availableUsers.find(u => u.id === pId);
            return user ? user.username : null;
        }).filter(u => u !== null) as string[];

        const statusMap: Record<string, string> = {
          'Not Started': 'NOT_STARTED',
          'In Progress': 'IN_PROGRESS',
          'Delayed': 'DELAYED',
          'On Time': 'ON_TIME'
        };

        const apiProjectData = {
          name: projectData.name,
          client: projectData.client,
          address: projectData.address,
          startDate: projectData.startDate,
          endDate: projectData.endDate,
          status: statusMap[projectData.status] || projectData.status,
          participants: participantUsernames,
          progress: 0,
        };

        let imageFile = null;
        if (projectData.selectedFile) {
          if (Platform.OS === 'web') {
            if (projectData.selectedFile.blob) {
               imageFile = { ...projectData.selectedFile };
            } else {
               const response = await fetch(projectData.selectedFile.uri);
               const blob = await response.blob();
               imageFile = { ...projectData.selectedFile, blob };
            }
          } else {
            imageFile = { ...projectData.selectedFile };
          }
        }
        
        await createProject(apiProjectData, imageFile);
        await refreshProjects();
        onClose();

    } catch (error) {
        console.error(error);
        setErrorMessage(error instanceof Error ? error.message : 'No se pudo guardar el proyecto.');
    } finally {
        setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1ProjectDetails data={projectData} onUpdate={handleUpdate} />;
      case 2:
        return <Step2DatesAndParticipants data={projectData} onUpdate={handleUpdate} availableUsers={availableUsers} />;
      case 3:
        return <Step3LocationAndPlan data={projectData} onUpdate={handleUpdate} />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{i18n.t('newProject.headerTitle')}</Text>
        <Text style={styles.stepCounter}>Paso {currentStep} de {TOTAL_STEPS}</Text>
      </View>

      <View style={styles.stepContainer}>
        {renderStep()}
      </View>
      
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.navigation}>
        {currentStep > 1 ? (
          <Pressable style={[styles.navButton, styles.backButton]} onPress={handleBack} disabled={isLoading}>
            <Text style={[styles.navButtonText, styles.backButtonText]}>Atrás</Text>
          </Pressable>
        ) : (
          // This empty view is a spacer to make the 'Next' button align to the right
          <View style={{flex: 1}} />
        )}
        
        <View style={styles.separator} />

        {currentStep < TOTAL_STEPS ? (
          <Pressable style={styles.navButton} onPress={handleNext}>
            <Text style={styles.navButtonText}>Siguiente</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.navButton, styles.submitButton]} onPress={handleSubmit} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.navButtonText}>Finalizar</Text>}
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    height: '100%' // Ensure it takes full height in modal
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'DMSans-Bold',
    color: '#1A202C',
  },
  stepCounter: {
    fontSize: 16,
    color: '#718096',
    fontFamily: 'DMSans-Regular',
    marginTop: 4,
  },
  stepContainer: {
    flex: 1,
    paddingBottom: 16,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  navButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#D4AF37',
  },
  backButton: {
    backgroundColor: '#EDF2F7',
  },
  submitButton: {
    backgroundColor: '#38A169', 
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'DMSans-Bold',
  },
  backButtonText: {
    color: '#4A5568',
  },
  separator: {
    width: 16,
  },
  errorText: {
    color: '#E53E3E',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'DMSans-Regular',
  }
});

export default ProjectCreationStepper;
