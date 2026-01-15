/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */


const primaryGold = '#3182CE'; // A vibrant, standard gold
const darkGold = '#2D3748'; // A darker gold for better contrast on light backgrounds

export const Colors = {
  light: {
    text: '#11181C',
    background: '#F5F5F5', // A softer, off-white background
    tint: darkGold,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: darkGold,
    card: '#FFFFFF',
    border: '#E0E0E0',
  },
  dark: {
    text: '#FFFFFF',
    background: '#121212', // The deep grey from the loading screen
    tint: primaryGold,
    icon: '#A9A9A9',
    tabIconDefault: '#A9A9A9',
    tabIconSelected: primaryGold,
    card: '#1E1E1E', // A slightly lighter grey for elevated surfaces
    border: '#272727',
  },
};

export const Fonts = {
  regular: 'DMSans-Regular',
  medium: 'DMSans-Medium',
  bold: 'DMSans-Bold',

  // Semantic aliases
  title: 'DMSans-Bold',
  subtitle: 'DMSans-Regular',
  body: 'DMSans-Regular',
};

