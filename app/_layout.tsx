import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, LogBox, StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { EventsProvider } from '../contexts/EventsContext';
import { ProjectsProvider } from '../contexts/ProjectsContext';
import { ThemeProvider } from '../contexts/ThemeContext';

// Filtrar errores de consola de Axios para evitar ruido en dispositivos
const originalConsoleError = console.error;
console.error = (...args) => {
  const isAxiosError = args.some(arg => 
    (typeof arg === 'object' && arg !== null && (arg.isAxiosError || arg.name === 'AxiosError')) ||
    (typeof arg === 'string' && (arg.includes('AxiosError') || arg.includes('Network Error') || arg.includes('Request failed')))
  );

  if (!isAxiosError) {
    originalConsoleError(...args);
  }
};

// Ignorar advertencias específicas en la UI (YellowBox)
LogBox.ignoreLogs(['AxiosError', 'Network Error']);

function InitialLayout() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isSplashVisible, setSplashVisible] = useState(true);

  const [fontsLoaded] = useFonts({
    'DMSans-Regular': require('@/assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('@/assets/fonts/DMSans-Medium.ttf'),
    'DMSans-Bold': require('@/assets/fonts/DMSans-Bold.ttf'),
  });

  useEffect(() => {
    // Start the pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }

    // Start fade-out animation when loading is complete
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setSplashVisible(false); // Unmount component when animation is done
    });
  }, [user, isLoading, segments, fontsLoaded, fadeAnim, router]);

  return (
    <View style={{ flex: 1 }}>
      {!isLoading && fontsLoaded && <Slot />}
      
      {isSplashVisible && (
        <Animated.View
          style={[
            styles.loadingContainer,
            { opacity: fadeAnim, ...StyleSheet.absoluteFillObject, zIndex: 999 },
          ]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Image
              source={require('@/assets/images/edbuild.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
          <ActivityIndicator size="large" color="#ffffff" style={styles.spinner} />
          <Text style={styles.loadingText}>Loading...</Text>
        </Animated.View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
      <ThemeProvider>
        <AuthProvider>
          <ProjectsProvider>
            <EventsProvider>
              <InitialLayout />
            </EventsProvider>
          </ProjectsProvider>
        </AuthProvider>
      </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  logo: {
    width: 180,
    height: 180,
  },
  spinner: {
    marginTop: 24,
    marginBottom: 12,
  },
  loadingText: {
    color: '#A9A9A9',
    fontSize: 16,
    fontFamily: 'DMSans-Regular',
  },
});