/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const goldColor = '#f3dc6f'; // Un dorado brillante y clásico
const darkGoldColor = '#a78025'; // Un dorado más oscuro para mejor contraste sobre fondos claros

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: darkGoldColor,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: darkGoldColor,
  },
  dark: {
    text: '#ECEDEE',
    background: '#080808', // Fondo negro puro
    tint: goldColor,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: goldColor,
  },
};

export const Fonts = {
  regular: 'DMSans-Regular',
  medium: 'DMSans-Medium',
  bold: 'DMSans-Bold',

  // Alias semánticos
  title: 'DMSans-Bold',
  subtitle: 'DMSans-Regular',
  body: 'DMSans-Regular',
};
