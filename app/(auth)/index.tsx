import { useCustomAlert } from '@/components/ui/CustomAlert';
import { Colors, Fonts } from '@/constants/theme';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const colorScheme = 'dark';
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { login } = useAuth();
  const { showAlert, AlertComponent } = useCustomAlert();
  const { i18n } = useLanguage();

  const handleSignIn = async () => {
    if (!username || !password) {
      showAlert(i18n.t('common.error'), i18n.t('login.enterCredentials'));
      return;
    }

    if (username.includes('@') && !/\S+@\S+\.\S+/.test(username)) {
      showAlert(i18n.t('common.error'), i18n.t('login.invalidEmailFormat'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      const data = response.data;
      const { token, refreshToken, id, username: resUsername, email, role, imageUri, permissions, companyName } = data;
      
      await login({
        id,
        username: resUsername,
        email,
        role,
        permissions,
        companyName: companyName || 'MHL Homes',
        imageUri
      }, token, refreshToken);
      router.replace('/(tabs)');

    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || i18n.t('login.invalidCredentials');
      showAlert(i18n.t('login.loginFailed'), message);
    } finally {
      setIsLoading(false);
    }
  };

  const isLargeScreen = width > 768;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors[colorScheme].background,
      flexDirection: 'column',
      justifyContent: 'center',
    },
    logoContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 40,
    },
    logo: {
      width: isLargeScreen ? 250 : 200,
      height: isLargeScreen ? 250 : 200,
    },
    formContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    formWrapper: {
      width: '100%',
      maxWidth: 400,
    },
    title: {
      fontFamily: Fonts.title,
      fontSize: 32,
      color: Colors[colorScheme].tint,
      marginBottom: 24,
      textAlign: 'center',
    },
    input: {
      height: 50,
      backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
      borderRadius: 10,
      paddingHorizontal: 15,
      marginBottom: 16,
      fontSize: 16,
      fontFamily: Fonts.regular,
      color: Colors[colorScheme].text,
      borderWidth: 1,
      borderColor: colorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA',
    },
    button: {
      height: 50,
      backgroundColor: Colors[colorScheme].tint,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    buttonText: {
      fontSize: 18,
      fontFamily: Fonts.bold,
      color: colorScheme === 'dark' ? '#080808' : '#FFFFFF',
    },
  });

  return (
    <View style={styles.container}>
      <AlertComponent />
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/mhl_homes.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.formContainer}>
        <View style={styles.formWrapper}>
          <Text style={styles.title}>Welcome</Text>

          <TextInput
            style={styles.input}
            placeholder="Username or email"
            placeholderTextColor={Colors[colorScheme].icon}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors[colorScheme].icon}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { opacity: pressed || isLoading ? 0.8 : 1 },
            ]}
            onPress={handleSignIn}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={colorScheme === 'dark' ? '#080808' : '#FFFFFF'} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}