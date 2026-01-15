import EdbuildLogin from '@/components/auth/EdbuildLogin';
import { useCustomAlert } from '@/components/ui/CustomAlert';
import i18n from '@/constants/i18n';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const { showAlert, AlertComponent } = useCustomAlert();

  const handleSignIn = async () => {
    if (!username || !password) {
      showAlert(i18n.t('login.error'), i18n.t('common.fillAllFields'));
      return;
    }

    if (username.includes('@') && !/\S+@\S+\.\S+/.test(username)) {
      showAlert(i18n.t('login.error'), i18n.t('login.invalidEmail'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, refreshToken, id, username: resUsername, email, role, imageUri, permissions, companyName } = response.data;
      
      await login({
        id,
        username: resUsername,
        email,
        role,
        permissions,
        companyName: companyName || 'EdBuild',
        imageUri
      }, token, refreshToken);
      router.replace('/(tabs)');

    } catch (error: any) {
      const message = error.response?.data?.message || i18n.t('login.invalidCredentials');
      showAlert(i18n.t('login.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    router.push('/(auth)/select-plan');
  };

  return (
    <>
      <EdbuildLogin
        onSignIn={handleSignIn}
        onRegister={handleRegister}
        isLoading={isLoading}
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
      />
      <AlertComponent />
    </>
  );
}