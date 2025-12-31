import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme'; // Ajusta la ruta si es necesario
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

  const handleSignIn = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }

    // Validación simple de email (opcional, si el usuario ingresó un correo)
    if (username.includes('@') && !/\S+@\S+\.\S+/.test(username)) {
      Alert.alert('Error', 'El formato del correo electrónico no es válido');
      return;
    }

    setIsLoading(true);
    try {
      // Usamos api.post en lugar de fetch para usar la configuración centralizada
      const response = await api.post('/auth/login', { username, password });
      const data = response.data;

      // Estructura actualizada: { token, refreshToken, id, username, email, role, imageUri }
      // Renombramos username a resUsername para evitar conflicto con el estado local
      const { token, refreshToken, id, username: resUsername, email, role, imageUri } = data;
      
      await login({
        id,
        username: resUsername,
        email,
        role,
        imageUri
      }, token, refreshToken);
      router.replace('/(tabs)');

    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || 'Credenciales inválidas';
      Alert.alert('Login Fallido', message);
    } finally {
      setIsLoading(false);
    }
  };

  // Determina si estamos en una pantalla grande (típicamente web en un desktop)
  const isLargeScreen = width > 768;

  // Estilos dinámicos que dependen del tema (claro/oscuro) y del tamaño de la pantalla
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors[colorScheme].background,
      flexDirection: 'column',
      justifyContent: 'center', // Centra todo el contenido verticalmente
    },
    // Contenedor para la imagen del logo
    logoContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingBottom: 40, // Espacio entre el logo y el formulario
    },
    logo: {
      width: isLargeScreen ? 250 : 200,
      height: isLargeScreen ? 250 : 200,
    },
    // Contenedor para el formulario
    formContainer: {
      justifyContent: 'center',
      alignItems: 'center', // Centra el contenido horizontalmente
      padding: 32,
    },
    // Contenedor para limitar el ancho del formulario
    formWrapper: {
      width: '100%',
      maxWidth: 400, // El formulario no será más ancho que 400px
    },
    title: {
      fontFamily:'DMSans-Bold',
      fontSize: 32,
      fontWeight: '700',
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
      fontFamily:'DMSans-Regular',
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
      fontFamily:'DMSans-Bold',
      fontWeight: '700',
      // El texto del botón será negro sobre dorado, y blanco sobre dorado oscuro
      color: colorScheme === 'dark' ? '#080808' : '#FFFFFF',
    },
  });

  return (
    <View style={styles.container}>
      {/* --- Columna del Logo --- */}
      <View style={styles.logoContainer}>
        <Image
          // ¡IMPORTANTE! Asegúrate de que tu imagen 'mhl_homes.jpg'
          // se encuentre en la carpeta 'assets/images'.
          source={require('@/assets/images/mhl_homes.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* --- Columna del Formulario --- */}
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