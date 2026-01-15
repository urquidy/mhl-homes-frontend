import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Colors } from '@/constants/theme';

export default function TabsNavigator() {
  const colorScheme = 'dark';
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // El header ya lo gestiona el Drawer.
        tabBarActiveTintColor: Colors[colorScheme].tint,
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