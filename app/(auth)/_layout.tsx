import i18n from '@/constants/i18n';
import { Colors, Fonts } from '@/constants/theme';
import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  // Forzamos tema claro en autenticación para consistencia visual
  const theme = Colors['light'];

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.card,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontFamily: Fonts.bold,
        },
        contentStyle: {
          backgroundColor: theme.background,
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="select-plan"
        options={{ title: i18n.t('auth.selectPlan') }}
      />
      <Stack.Screen
        name="register"
        options={{ title: i18n.t('auth.register') }}
      />
      <Stack.Screen
        name="register-success"
        options={{ title: i18n.t('auth.registerSuccess') }}
      />
    </Stack>
  );
}