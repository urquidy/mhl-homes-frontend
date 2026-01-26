import { Stack } from 'expo-router';
import React from 'react';
import { Colors } from '@/constants/theme';

export default function AuthLayout() {
  const colorScheme = 'dark';
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors[colorScheme].background } }} />;
}