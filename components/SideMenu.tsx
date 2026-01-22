import { Feather } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import i18n from '../constants/i18n'; // Asegúrate que la ruta a i18n sea correcta

// --- Tipos para las props y los ítems del menú ---
interface SideMenuProps {
  companyName: string;
  userName: string;
  userRole: string;
}

interface MenuItem {
  href: string;
  name: string;
  icon: keyof typeof Feather.glyphMap;
  roles?: string[]; // Roles que pueden ver este ítem. Si no se especifica, es para todos.
}

// --- Datos de los ítems del menú ---
const menuItems: MenuItem[] = [
  // Mock de roles: 'Admin', 'Project Manager', 'Viewer'
  { href: '/(tabs)/', name: i18n.t('nav.dashboard'), icon: 'grid' }, // Visible para todos
  { href: '/(tabs)/projects', name: i18n.t('nav.projects'), icon: 'briefcase' }, // Visible para todos
  { href: '/(tabs)/budgets', name: i18n.t('nav.budgets'), icon: 'clipboard', roles: ['Admin', 'Project Manager'] },
  { href: '/(tabs)/checklist', name: i18n.t('nav.checklist'), icon: 'check-square', roles: ['Admin', 'Project Manager'] },
  { href: '/(tabs)/reports', name: i18n.t('nav.reports'), icon: 'bar-chart-2', roles: ['Admin', 'Viewer'] },
];

const SideMenu: React.FC<SideMenuProps> = ({ companyName, userName, userRole }) => {
  const pathname = usePathname();
  const visibleMenuItems = menuItems.filter(item => !item.roles || item.roles.includes(userRole));

  return (
    <View style={styles.container}>
      {/* --- Cabecera con nombre de la constructora y rol --- */}
      <View style={styles.header}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>{companyName.charAt(0)}</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.userRole}>{userRole}</Text>
        </View>
      </View>

      {/* --- Navegación Principal --- */}
      <View style={styles.navContainer}>
        {visibleMenuItems.map((item) => (
          <Link href={item.href as any} asChild key={item.name}>
            <Pressable>
              {({ pressed }) => (
                <View style={[
                  styles.navItem,
                  pathname === item.href && styles.navItemActive,
                  pressed && styles.navItemPressed
                ]}>
                  <Feather name={item.icon} size={22} color={pathname === item.href ? '#FFFFFF' : '#A0AEC0'} />
                  <Text style={[styles.navText, pathname === item.href && styles.navTextActive]}>
                    {item.name}
                  </Text>
                </View>
              )}
            </Pressable>
          </Link>
        ))}
      </View>

      {/* --- Espaciador y Botón de Nuevo Proyecto --- */}
      <View style={styles.footer}>
        <Pressable style={({ pressed }) => [styles.newProjectButton, pressed && styles.buttonPressed]}>
          <Feather name="plus-circle" size={20} color="#FFFFFF" />
          <Text style={styles.newProjectButtonText}>{i18n.t('nav.newProject')}</Text>
        </Pressable>
      </View>
    </View>
  );
};

// --- Estilos del componente ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A202C', // Un fondo oscuro
    padding: 15, // Reducimos el padding general
    // Usamos maxWidth en web para un mejor control del ancho.
    [Platform.OS === 'web' ? 'maxWidth' : 'width']: Platform.OS === 'web' ? 200 : 280,
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
    // Permite que el contenedor se encoja si el texto es muy largo.
    flexShrink: 1,
  },
  companyName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#A0AEC0', // Un gris claro
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
    backgroundColor: '#2D3748', // Un fondo ligeramente más claro para el ítem activo
  },
  navItemPressed: {
    backgroundColor: '#2D3748',
  },
  navText: {
    color: '#A0AEC0',
    fontSize: 16,
    marginLeft: 12,
  },
  navTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#2D3748',
  },
  newProjectButton: {
    backgroundColor: '#3182CE', // Un color azul para destacar
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonPressed: {
    backgroundColor: '#2B6CB0', // Un azul más oscuro al presionar
  },
  newProjectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default SideMenu;