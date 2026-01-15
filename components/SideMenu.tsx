import i18n from '@/constants/i18n';
import { Colors, Fonts } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { StyledButton } from './ui/StyledButton';

interface SideMenuProps {
  companyName: string;
  userName: string;
  userRole: string;
}

interface MenuItem {
  href: string;
  name: string;
  icon: keyof typeof Feather.glyphMap;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  { href: '/(tabs)/', name: 'Dashboard', icon: 'grid' },
  { href: '/(tabs)/projects', name: 'Projects', icon: 'briefcase' },
  { href: '/(tabs)/budgets', name: 'Budgets', icon: 'clipboard', roles: ['Admin', 'Project Manager'] },
  { href: '/(tabs)/checklist', name: 'Checklist', icon: 'check-square', roles: ['Admin', 'Project Manager'] },
  { href: '/(tabs)/reports', name: 'Reports', icon: 'bar-chart-2', roles: ['Admin', 'Viewer'] },
];

const SideMenu: React.FC<SideMenuProps> = ({ companyName, userName, userRole }) => {
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const styles = getThemedStyles(colorScheme);
  const theme = Colors[colorScheme || 'light'];

  const visibleMenuItems = menuItems.filter(item => !item.roles || item.roles.includes(userRole));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>{companyName.charAt(0)}</Text>
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.userRole}>{userRole}</Text>
        </View>
      </View>

      <View style={styles.navContainer}>
        {visibleMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link href={item.href as any} asChild key={item.name}>
              <Pressable>
                {({ pressed }) => (
                  <View style={[
                    styles.navItem,
                    isActive && styles.navItemActive,
                    pressed && styles.navItemPressed
                  ]}>
                    <Feather name={item.icon} size={22} color={isActive ? theme.tabIconSelected : theme.tabIconDefault} />
                    <Text style={[styles.navText, isActive && styles.navTextActive]}>
                      {item.name}
                    </Text>
                  </View>
                )}
              </Pressable>
            </Link>
          );
        })}
      </View>

      <View style={styles.footer}>
        <StyledButton
          title={i18n.t('projects.newProject')}
          onPress={() => { /* Lógica para nuevo proyecto */ }}
          variant="primary"
          icon={<Feather name="plus-circle" size={20} color={colorScheme === 'dark' ? Colors.dark.background : Colors.light.background} />}
        />
      </View>
    </View>
  );
};

const getThemedStyles = (scheme: 'light' | 'dark' | null | undefined) => {
  const theme = Colors[scheme || 'light'];

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: scheme === 'dark' ? '#1A202C' : theme.background,
      padding: 15,
      [Platform.OS === 'web' ? 'maxWidth' : 'width']: Platform.OS === 'web' ? 220 : 280,
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
      backgroundColor: theme.tint,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    logoText: {
      color: scheme === 'dark' ? theme.background : theme.background,
      fontSize: 20,
      fontFamily: Fonts.bold,
    },
    headerTextContainer: {
      flexShrink: 1,
    },
    companyName: {
      color: theme.text,
      fontSize: 16,
      fontFamily: Fonts.bold,
    },
    userRole: {
      color: theme.icon,
      fontSize: 14,
      fontFamily: Fonts.regular,
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
      backgroundColor: theme.tint,
    },
    navItemPressed: {
      backgroundColor: scheme === 'dark' ? '#2D3748' : theme.border,
    },
    navText: {
      color: theme.icon,
      fontSize: 16,
      marginLeft: 12,
      fontFamily: Fonts.medium,
    },
    navTextActive: {
      color: scheme === 'dark' ? theme.background : theme.background,
      fontFamily: Fonts.bold,
    },
    footer: {
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
  });
};

export default SideMenu;