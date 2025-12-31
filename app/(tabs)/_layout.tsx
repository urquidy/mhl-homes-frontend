import React, { useState } from 'react';
import { Drawer } from 'expo-router/drawer';
import { Feather } from '@expo/vector-icons';
import Header from '@/components/Header';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import i18n from '../../constants/i18n';
import NewProjectModal from '@/components/projects/NewProjectModal';
import { EventsProvider } from '../../contexts/EventsContext';
import { NotificationsProvider } from '../../contexts/NotificationsContext';

// --- Datos y tipos movidos desde SideMenu.tsx ---
interface MenuItem {
  href: string;
  name: string;
  icon: keyof typeof Feather.glyphMap;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  { href: '/(tabs)/', name: 'nav.dashboard', icon: 'grid' },
  { href: '/(tabs)/projects', name: 'nav.projects', icon: 'briefcase' },
  { href: '/(tabs)/budgets', name: 'nav.budgets', icon: 'clipboard', roles: ['ADMIN', 'Project Manager'] },
  { href: '/(tabs)/checklist', name: 'nav.checklist', icon: 'check-square', roles: ['ADMIN', 'Project Manager'] },
  { href: '/(tabs)/agenda', name: 'nav.agenda', icon: 'calendar' },
  { href: '/(tabs)/reports', name: 'nav.reports', icon: 'bar-chart-2', roles: ['ADMIN', 'Viewer'] },
  { href: '/(tabs)/admin', name: 'nav.administrator', icon: 'settings', roles: ['ADMIN'] },
];

// Contexto para permitir que las pantallas cambien la acción del botón "Agregar" del Header
export const HeaderActionContext = React.createContext<{
  setCustomAddAction: (action: (() => void) | null) => void;
}>({ setCustomAddAction: () => {} });

/**
 * Este es el layout principal de la aplicación autenticada.
 * Define un Drawer que contiene el SideMenu y el Header.
 */
export default function AppLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  
  // Estado para la acción personalizada del botón "Agregar"
  const [customAddAction, setCustomAddAction] = useState<(() => void) | null>(null);
  const [isNewProjectModalVisible, setIsNewProjectModalVisible] = useState(false);

  const visibleMenuItems = menuItems.filter(item => !item.roles || (user && item.roles.includes(user.role as string)));

  const handleAddPress = customAddAction || (() => setIsNewProjectModalVisible(true));

  return (
    <HeaderActionContext.Provider value={{ setCustomAddAction }}>
      <EventsProvider>
      <NotificationsProvider>
      <Drawer
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
                  <Text style={styles.userRole}>{user?.role || 'Guest'}</Text>
                </View>
              </View>

              <View style={styles.navContainer}>
                {visibleMenuItems.map((item) => {                
                  // Determina si el ítem actual es el activo.
                  // Condición especial para el Dashboard que puede tener la ruta '/' o '/(tabs)/'
                  const screenName = item.href.split('/').pop() || 'index';
                  const isActive = (screenName === 'index' && pathname === '/') || (screenName !== 'index' && pathname === `/${screenName}`);

                  
                  return (
                    <Pressable 
                      key={item.name} 
                      onPress={() => {
                        props.navigation.navigate(screenName); // Navegación programática
                        props.navigation.closeDrawer();
                      }}
                    >
                      {({ pressed }) => (
                        <View style={[ styles.navItem, isActive && styles.navItemActive, pressed && styles.navItemPressed ]}>
                          <Feather name={item.icon} size={22} color="#D4AF37" />
                          <Text style={[styles.navText, isActive && styles.navTextActive]}>{i18n.t(item.name)}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* --- Botón de Nuevo Proyecto --- */}
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