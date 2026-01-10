import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { EventsProvider } from '../contexts/EventsContext';
import { ProjectsProvider } from '../contexts/ProjectsContext';
import { TenantProvider } from '../contexts/TenantContext';

function InitialLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [isSplashVisible, setSplashVisible] = useState(true);

  const [fontsLoaded] = useFonts({
    'DMSans-Regular': require('@/assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('@/assets/fonts/DMSans-Medium.ttf'),
    'DMSans-Bold': require('@/assets/fonts/DMSans-Bold.ttf'),
  });

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Si no hay usuario y no estamos en el grupo de auth, redirigir al login
      router.replace('/(auth)');
    } else if (user && inAuthGroup) {
      // Si hay usuario y estamos en login, redirigir a la app principal (tabs)
      router.replace('/(tabs)');
    }

    // Iniciar animación de desvanecimiento cuando termina de cargar
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500, // Duración de 500ms
      useNativeDriver: true,
    }).start(() => {
      setSplashVisible(false); // Desmontar componente al terminar
    });
  }, [user, isLoading, segments, fontsLoaded]);

  return (
    <View style={{ flex: 1 }}>
      {/* Renderizamos la App (Slot) pero oculta detrás del Splash hasta que cargue */}
      {!isLoading && fontsLoaded && <Slot />}
      
      {isSplashVisible && (
        <Animated.View
          style={[
            styles.loadingContainer,
            { opacity: fadeAnim, ...StyleSheet.absoluteFillObject, zIndex: 999 },
          ]}>
          <Image
            source={require('@/assets/images/mhl_homes.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <ActivityIndicator size="large" color="#D4AF37" />
        </Animated.View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
     <TenantProvider>
      <AuthProvider>
        <ProjectsProvider>
          <EventsProvider>
            <InitialLayout />
          </EventsProvider>
        </ProjectsProvider>
      </AuthProvider>
    </TenantProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212', // Fondo oscuro para coincidir con el tema
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 24,
  },
});