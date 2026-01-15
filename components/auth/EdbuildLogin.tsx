import i18n from '@/constants/i18n';
import { Colors, Fonts } from '@/constants/theme';
import { Feather, FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

interface EdbuildLoginProps {
  onSignIn: () => void;
  onRegister: () => void;
  isLoading: boolean;
  username: string;
  setUsername: (text: string) => void;
  password: string;
  setPassword: (text: string) => void;
}

const EdbuildLogin = ({
  onSignIn,
  onRegister,
  isLoading,
  username,
  setUsername,
  password,
  setPassword,
}: EdbuildLoginProps) => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  // Forzamos el modo claro para evitar el fondo negro en dispositivos con tema oscuro
  const colorScheme = 'light';
  const styles = getThemedStyles(colorScheme);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, isLargeScreen && styles.containerLarge]}>
      {isLargeScreen && (
        <View style={styles.brandingContainer}>
          <Image
            source={require('@/assets/images/edbuild.png')}
            style={styles.brandingLogo}
          />
          <Text style={styles.brandingTitle}>{i18n.t('login.branding.title')}</Text>
          <Text style={styles.brandingSubtitle}>
            {i18n.t('login.branding.subtitle')}
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.formScrollView}>
        <View style={styles.formContainer}>
          <View style={styles.formWrapper}>
            {!isLargeScreen && (
              <Image
                source={require('@/assets/images/edbuild.png')}
                style={styles.formLogo}
              />
            )}
            <Text style={styles.formTitle}>{i18n.t('login.title')}</Text>
            <Text style={styles.formSubtitle}>
              {i18n.t('login.subtitle')}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t('login.email')}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('login.emailPlaceholder')}
                placeholderTextColor={Colors[colorScheme || 'light'].icon}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{i18n.t('login.password')}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={i18n.t('login.passwordPlaceholder')}
                  placeholderTextColor={Colors[colorScheme || 'light'].icon}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={Colors[colorScheme || 'light'].icon} />
                </Pressable>
              </View>
            </View>

            <View style={styles.forgotPasswordContainer}>
              <Pressable>
                <Text style={styles.forgotPasswordText}>{i18n.t('login.forgotPassword')}</Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.signInButton,
                (isLoading || pressed) && styles.disabledButton,
              ]}
              onPress={onSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.dark.text} />
              ) : (
                <Text style={styles.signInButtonText}>{i18n.t('login.signIn')}</Text>
              )}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.registerButton,
                (isLoading || pressed) && styles.disabledButton,
              ]}
              onPress={onRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>{i18n.t('login.register')}</Text>
            </Pressable>

            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>{i18n.t('login.continueWith')}</Text>
              <View style={styles.separatorLine} />
            </View>

            <Pressable style={styles.socialButton}>
              <FontAwesome name="google" size={20} color="#DB4437" />
              <Text style={styles.socialButtonText}>{i18n.t('login.google')}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const getThemedStyles = (scheme: 'light' | 'dark' | null | undefined) => {
  const theme = Colors[scheme || 'light'];

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    containerLarge: {
      flexDirection: 'row',
    },
    brandingContainer: {
      flex: 1,
      backgroundColor: scheme === 'dark' ? Colors.dark.card : '#1A202C',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 48,
    },
    brandingLogo: {
      width: 150,
      height: 150,
      marginBottom: 24,
      borderRadius: 20,
    },
    brandingTitle: {
      fontFamily: Fonts.title,
      fontSize: 42,
      color: Colors.dark.text,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 16,
    },
    brandingSubtitle: {
      fontFamily: Fonts.regular,
      fontSize: 18,
      color: Colors.dark.icon,
      textAlign: 'center',
      lineHeight: 28,
    },
    formScrollView: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    formContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    formWrapper: {
      width: '100%',
      maxWidth: 400,
    },
    formLogo: {
      width: 100,
      height: 100,
      marginBottom: 24,
      alignSelf: 'center',
      borderRadius: 20,
    },
    formTitle: {
      fontFamily: Fonts.title,
      fontSize: 28,
      color: theme.text,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 8,
    },
    formSubtitle: {
      fontFamily: Fonts.regular,
      fontSize: 16,
      color: theme.icon,
      textAlign: 'center',
      marginBottom: 32,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontFamily: Fonts.medium,
      fontSize: 14,
      color: theme.text,
      marginBottom: 8,
    },
    input: {
      height: 50,
      backgroundColor: theme.card,
      borderRadius: 8,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: Fonts.regular,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 50,
      backgroundColor: theme.card,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 16,
    },
    passwordInput: {
      flex: 1,
      height: '100%',
      fontSize: 16,
      fontFamily: Fonts.regular,
      color: theme.text,
    },
    eyeIcon: {
      marginLeft: 8,
    },
    forgotPasswordContainer: {
      alignItems: 'flex-end',
      marginBottom: 24,
    },
    forgotPasswordText: {
      fontFamily: Fonts.medium,
      fontSize: 14,
      color: theme.tint,
    },
    signInButton: {
      height: 50,
      backgroundColor: scheme === 'dark' ? theme.tint : '#2D3748',
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    signInButtonText: {
      fontFamily: Fonts.bold,
      fontSize: 16,
      color: scheme === 'dark' ? Colors.dark.background : Colors.light.background,
    },
    registerButton: {
      height: 50,
      backgroundColor: scheme === 'light' ? '#3182CE' : theme.tint,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    registerButtonText: {
      fontFamily: Fonts.bold,
      fontSize: 16,
      color: Colors.dark.text,
    },
    separator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    separatorLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    separatorText: {
      marginHorizontal: 16,
      fontFamily: Fonts.regular,
      fontSize: 14,
      color: theme.icon,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 50,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 16,
      backgroundColor: theme.card,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    socialButtonText: {
      fontFamily: Fonts.medium,
      fontSize: 16,
      color: theme.text,
      marginLeft: 12,
    },
    disabledButton: {
      opacity: 0.6,
    },
  });
};

export default EdbuildLogin;
