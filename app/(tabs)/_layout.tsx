import Header from '@/components/Header';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../../constants/i18n';
import { Fonts } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { EventsProvider } from '../../contexts/EventsContext';
import { LanguageProvider, useLanguage } from '../../contexts/LanguageContext';
import { NotificationsProvider } from '../../contexts/NotificationsContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';

// --- Datos y tipos movidos desde SideMenu.tsx ---
interface MenuItem {
  link: string;
  title: string;
  icon: string;
  permission?: string;
  order?: number;
}

// Contexto para permitir recargar el menú desde otras pantallas (ej. Dashboard)
export const MenuContext = React.createContext<{
  reloadMenu: () => Promise<void>;
}>({ reloadMenu: async () => {} });

// Componente interno que consume el contexto de idioma
function AppLayoutContent() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const { theme, isLoading: isThemeLoading } = useTheme();
  
  const [dynamicMenuItems, setDynamicMenuItems] = useState<MenuItem[]>([]);
  const [roleName, setRoleName] = useState('');
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  // Función para cargar el menú desde la API
  const fetchMenu = useCallback(async () => {
    if (!token) return;
    try {
      const response = await api.get('/api/menu', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const menuData = response.data || [];
      setDynamicMenuItems(menuData);
      await AsyncStorage.setItem('menu_cache', JSON.stringify(menuData));
    } catch (err) {
      console.error("Error fetching menu:", err);
    }
  }, [token]);

  // Cargar menú desde la API al iniciar o cambiar token
  useEffect(() => {
    const loadInitialMenu = async () => {
      if (!token) {
        setIsLoadingMenu(false);
        return;
      }

      // 1. Estrategia Stale-while-revalidate: Cargar caché primero
      try {
        const cached = await AsyncStorage.getItem('menu_cache');
        if (cached) {
          setDynamicMenuItems(JSON.parse(cached));
          setIsLoadingMenu(false); // Mostrar inmediatamente si hay caché
        }
      } catch (e) { /* Ignorar error de lectura */ }

      // 2. Actualizar desde la API en segundo plano
      await fetchMenu();
      setIsLoadingMenu(false);
    };

    loadInitialMenu();
  }, [token, fetchMenu]);

  // Resolver nombre del rol (igual que en profile.tsx)
  useEffect(() => {
    const resolveRoleName = async () => {
      if (!user?.role) {
        setRoleName(user?.permissions?.includes('ROLE_ADMIN') ? 'Admin' : 'User');
        return;
      }
      try {
        const response = await api.get('/api/roles');
        const roles = response.data || [];
        const match = roles.find((r: any) => r.id === user.role);
        setRoleName(match ? match.name : user.role);
      } catch (error) {
        setRoleName(user.role);
      }
    };

    if (token) resolveRoleName();
  }, [user?.role, token]);

  // Validar acceso a rutas según permisos del menú (Protección de Rutas)
  useEffect(() => {
    if (isLoadingMenu || !token || dynamicMenuItems.length === 0) return;

    const allowedRoutes = dynamicMenuItems.map(item => item.link);
    // Normalizar ruta actual (Expo Router usa '/' para index, API usa '/dashboard')
    let currentRoute = pathname;
    if (currentRoute === '/') currentRoute = '/dashboard';

    // Rutas siempre permitidas
    if (currentRoute.includes('/profile')) return;

    // Lista de rutas estáticas conocidas en el sistema
    const staticRoutes = ['/dashboard', '/projects', '/budgets', '/checklist', '/agenda', '/reports', '/admin'];
    const isStatic = staticRoutes.includes(currentRoute);

    // 1. Validación de rutas estáticas (Menú principal)
    if (isStatic) {
      if (!allowedRoutes.includes(currentRoute)) {
        // Usuario no tiene permiso -> Redirigir a la primera ruta permitida
        const firstAllowed = allowedRoutes[0];
        if (firstAllowed) {
          const target = firstAllowed === '/dashboard' ? '/' : firstAllowed;
          router.replace(target as any);
        }
      }
    } else {
      // 2. Validación de rutas dinámicas (Detalle de Proyecto [id])
      // Si la ruta no es estática (ej. /123), asumimos que es un detalle de proyecto.
      // Requerimos que el usuario tenga acceso a '/projects' para ver detalles.
      const hasProjectAccess = allowedRoutes.includes('/projects');
      if (!hasProjectAccess) {
        const firstAllowed = allowedRoutes[0];
        if (firstAllowed) {
          const target = firstAllowed === '/dashboard' ? '/' : firstAllowed;
          router.replace(target as any);
        }
      }
    }
  }, [pathname, dynamicMenuItems, isLoadingMenu, token]);

  if (isLoadingMenu || isThemeLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A202C' }}>
        <ActivityIndicator size="large" color="#3182CE" />
      </View>
    );
  }

  return (
      <MenuContext.Provider value={{ reloadMenu: fetchMenu }}>
      <EventsProvider>
      <NotificationsProvider>
      <Drawer
        key={language} // Forzar re-render al cambiar idioma
        // Establece el estado inicial del menú.
        // Abierto en pantallas grandes, cerrado en las demás.
        defaultStatus={isLargeScreen ? 'open' : 'closed'}
        drawerContent={(props) => {
          return (
            // --- Contenido del SideMenu integrado directamente ---
            <View style={[styles.container, { paddingTop: 15 + insets.top, paddingBottom: 15 + insets.bottom, backgroundColor: theme.menuColor || '#1A202C' }]}>
              <View style={styles.header}>
                {user && user.imageUri ? (
                  <Image 
                    source={{ uri: user.imageUri }} 
                    style={styles.drawerLogo} 
                    resizeMode="contain" 
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoText}>{user?.companyName?.charAt(0) || 'M'}</Text>
                  </View>
                )}
                <View style={styles.headerTextContainer}>
                  <Text style={[styles.companyName, { color: theme.primaryColor }]}>{user?.companyName || 'EdBuild'}</Text>
                  <Text style={[styles.userRole, { color: theme.primaryColor }]}>{roleName}</Text>
                </View>
              </View>

              <View style={styles.navContainer}>
                {dynamicMenuItems.map((item) => {                
                  // Determina si el ítem actual es el activo.
                  // Mapeo de rutas del backend a nombres de pantalla de Expo Router
                  let screenName = item.link.replace(/^\//, ''); // Quitar slash inicial
                  if (screenName === 'dashboard') screenName = 'index'; // Dashboard mapea a index
                  
                  const isActive = (screenName === 'index' && pathname === '/') || (screenName !== 'index' && pathname === `/${screenName}`);

                  
                  return (
                    <Pressable 
                      key={item.title} 
                      onPress={() => {
                        props.navigation.navigate(screenName); // Navegación programática
                        props.navigation.closeDrawer();
                      }}
                    >
                      {({ pressed }) => (
                        <View style={[ styles.navItem, isActive && styles.navItemActive, pressed && styles.navItemPressed ]}>
                          <Feather name={item.icon as keyof typeof Feather.glyphMap} size={22} color={theme.primaryColor} />
                          <Text style={[styles.navText, { color: theme.primaryColor }, isActive && styles.navTextActive]}>{i18n.t(item.title)}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        }}
        screenOptions={({ navigation }) => ({
            // Aseguramos que el Header personalizado se muestre en todas las pantallas
            header: () => (
              <Header
                onMenuPress={isLargeScreen ? undefined : () => navigation.toggleDrawer()}
                userImageUri={user?.imageUri}
                token={token}
                onProfilePress={() => router.push('/(tabs)/profile' as any)}
              />
            ),
            drawerType: isLargeScreen ? 'permanent' : 'slide',
            headerShown: true,
            swipeEnabled: !isLargeScreen,
            // Elimina el fondo oscuro (overlay) cuando el menú está abierto.
            overlayColor: 'transparent',
            sceneContainerStyle: { backgroundColor: theme.backgroundColor }
        })}
      >
        {/* Definimos aquí todas las pantallas que usará el Drawer y el menú */}
        <Drawer.Screen name="index" options={{ title: i18n.t('nav.dashboard') }} />
        <Drawer.Screen name="projects" options={{ title: i18n.t('nav.projects') }} />
        <Drawer.Screen name="budgets" options={{ title: i18n.t('nav.budgets') }} />
        <Drawer.Screen name="checklist" options={{ title: i18n.t('nav.checklist') }} />
        <Drawer.Screen name="agenda" options={{ title: 'Agenda' }} />
        <Drawer.Screen name="reports" options={{ title: i18n.t('nav.reports') }} />
        <Drawer.Screen name="admin" options={{ title: 'nav.administrator' }} />
        <Drawer.Screen name="profile" options={{ title: 'Perfil', drawerItemStyle: { display: 'none' } }} />
      </Drawer>

      </NotificationsProvider>
      </EventsProvider>
      </MenuContext.Provider>
  );
}

/**
 * Este es el layout principal de la aplicación autenticada.
 * Define un Drawer que contiene el SideMenu y el Header.
 */
export default function AppLayout() {
  return (
    <LanguageProvider>
      <AppLayoutContent />
    </LanguageProvider>
  );
}

// --- Estilos del Menú ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A5568',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  drawerLogo: {
    width: 50,
    height: 50,
    marginRight: 16,
    borderRadius: 10,
  },
  headerTextContainer: {
    flexShrink: 1,
  },
  companyName: {
    color: '#3182CE',
    fontSize: 18,
    fontFamily: Fonts.bold,
    marginBottom: 2,
  },
  userRole: {
    color: '#3182CE',
    fontSize: 14, 
    fontFamily: Fonts.regular,
    opacity: 0.8,
  },
  navContainer: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  navItemActive: {
    backgroundColor: '#2D3748',
  },
  navItemPressed: {
    backgroundColor: '#2D3748',
  },
  navText: {
    color: '#3182CE',
    fontSize: 16,
    marginLeft: 16,
    fontFamily: Fonts.medium,
  },
  navTextActive: {
    fontFamily: Fonts.bold,
  },
  footer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#2D3748',
  },
  newProjectButton: {
    backgroundColor: '#3182CE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonPressed: {
    backgroundColor: '#2B6CB0', // Azul más oscuro al presionar
  },
  newProjectButtonText: {
    color: '#ffffffff',
    fontSize: 16,
    fontFamily: Fonts.bold,
    marginLeft: 10,
  },
});