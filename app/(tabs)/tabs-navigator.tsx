import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTenant } from '../../contexts/TenantContext';

export default function TabsNavigator() {
  const { tenant } = useTenant();
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // El header ya lo gestiona el Drawer.
        tabBarActiveTintColor: tenant.primaryColor,
      }}
    >
      <Tabs.Screen
        name="index" // Corresponde a (tabs)/index.tsx
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Feather name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore" // Corresponde a (tabs)/explore.tsx
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Feather name="compass" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}