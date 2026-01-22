import Header from '@/components/Header';
import NewProjectModal from '@/components/projects/NewProjectModal';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../../constants/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { EventsProvider } from '../../contexts/EventsContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { NotificationsProvider } from '../../contexts/NotificationsContext';
import api from '../../services/api';

// --- Datos y tipos movidos desde SideMenu.tsx ---
interface MenuItem {
  link: string;
  title: string;
  icon: string;
  permission?: string;
  order?: number;
}

// Contexto para permitir que las pantallas cambien la acción del botón "Agregar" del Header
export const HeaderActionContext = React.createContext<{
  setCustomAddAction: (action: (() => void) | null) => void;
}>({ setCustomAddAction: () => {} });

// Contexto para permitir recargar el menú desde otras pantallas (ej. Dashboard)
export const MenuContext = React.createContext<{
  reloadMenu: () => Promise<void>;
}>({ reloadMenu: async () => {} });

/**
 * Este es el layout principal de la aplicación autenticada.
 * Define un Drawer que contiene el SideMenu y el Header.
 */
export default function AppLayoutContent() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  
  // Estado para la acción personalizada del botón "Agregar"
  const [customAddAction, setCustomAddAction] = useState<(() => void) | null>(null);
  const [isNewProjectModalVisible, setIsNewProjectModalVisible] = useState(false);
  const [dynamicMenuItems, setDynamicMenuItems] = useState<MenuItem[]>([]);
  const [roleName, setRoleName] = useState('');
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  // Función para cargar el menú desde la API
  const fetchMenu = async () => {
    if (!token) return;
    try {
      const response = await api.get('/api/menu');
      const menuData = response.data || [];
      setDynamicMenuItems(menuData);
      await AsyncStorage.setItem('menu_cache', JSON.stringify(menuData));
    } catch (err) {
      console.error("Error fetching menu:", err);
    }
  };

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
  }, [token]);

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

  const handleAddPress = customAddAction || (() => setIsNewProjectModalVisible(true));

  if (isLoadingMenu) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A202C' }}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  return (
    <HeaderActionContext.Provider value={{ setCustomAddAction }}>
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
            <View style={[styles.container, { paddingTop: 15 + insets.top, paddingBottom: 15 + insets.bottom }]}>
              <View style={styles.header}>
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoText}>{user?.companyName.charAt(0) || 'M'}</Text>
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.companyName}>{user?.companyName || 'MHL Homes'}</Text>
                  <Text style={styles.userRole}>{roleName}</Text>
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
                          <Feather name={item.icon as keyof typeof Feather.glyphMap} size={22} color="#D4AF37" />
                          <Text style={[styles.navText, isActive && styles.navTextActive]}>{i18n.t(item.title)}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* --- Botón de Nuevo Proyecto --- */}
              {user?.permissions?.includes('PROJECT_CREATE') && (
              <View style={styles.footer}>
                <Pressable
                  onPress={() => {
                    props.navigation.closeDrawer();
                    setIsNewProjectModalVisible(true);
                  }}
                  style={({ pressed }) => [styles.newProjectButton, pressed && styles.buttonPressed]}>
                  <Feather name="plus-circle" size={20} color="#ffffffff" />
                  <Text style={styles.newProjectButtonText}>{i18n.t('nav.newProject')}</Text>
                </Pressable>
              </View>
              )}
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
                onAddPress={handleAddPress}
                onProfilePress={() => router.push('/(tabs)/profile' as any)}
              />
            ),
            drawerType: isLargeScreen ? 'permanent' : 'slide',
            headerShown: true,
            swipeEnabled: !isLargeScreen,
            // Elimina el fondo oscuro (overlay) cuando el menú está abierto.
            overlayColor: 'transparent',
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

      {/* Modal Global de Nuevo Proyecto */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isNewProjectModalVisible}
        onRequestClose={() => setIsNewProjectModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Asegúrate de que NewProjectModal acepte la prop 'onClose' para cerrar el modal */}
            <NewProjectModal onClose={() => setIsNewProjectModalVisible(false)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </NotificationsProvider>
      </EventsProvider>
      </MenuContext.Provider>
    </HeaderActionContext.Provider>
  );
}

// --- Estilos del Menú ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C',
    padding: 15,
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
    fontWeight: 'bold',
  },
  headerTextContainer: {
    flexShrink: 1,
  },
  companyName: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#D4AF37',
    fontSize: 14,
  },
  navContainer: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  navItemActive: {
    backgroundColor: '#2D3748',
  },
  navItemPressed: {
    backgroundColor: '#2D3748',
  },
  navText: {
    color: '#D4AF37',
    fontSize: 16,
    marginLeft: 12,
  },
  navTextActive: {
    color: '#D4AF37',
    fontWeight: '600',
  },
  footer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#2D3748',
  },
  newProjectButton: {
    backgroundColor: '#D4AF37',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonPressed: {
    backgroundColor: '#b89b30', // Dorado más oscuro al presionar
  },
  newProjectButtonText: {
    color: '#ffffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Estilos para el Modal (similares a budgets.tsx)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    maxHeight: '90%',
    flex: 1, // Asegura que el contenido interno (que usa flex: 1) tenga altura y no colapse
  },
});