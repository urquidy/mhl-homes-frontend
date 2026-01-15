import { Colors, Fonts } from '@/constants/theme';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type TouchableOpacityProps,
  useColorScheme,
} from 'react-native';

type StyledButtonProps = TouchableOpacityProps & {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'tertiary';
  icon?: React.ReactNode;
  fullWidth?: boolean;
};

export function StyledButton({
  title,
  onPress,
  isLoading = false,
  variant = 'primary',
  icon,
  fullWidth = false,
  ...rest
}: StyledButtonProps) {
  const colorScheme = useColorScheme();
  const styles = getThemedStyles(colorScheme);

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          button: styles.primaryButton,
          text: styles.primaryText,
          indicator:
            colorScheme === 'dark'
              ? Colors.dark.background
              : Colors.light.background,
        };
      case 'secondary':
        return {
          button: styles.secondaryButton,
          text: styles.secondaryText,
          indicator:
            colorScheme === 'dark' ? Colors.dark.text : Colors.light.text,
        };
      case 'tertiary':
        return {
          button: styles.tertiaryButton,
          text: styles.tertiaryText,
          indicator:
            colorScheme === 'dark' ? Colors.dark.text : Colors.light.text,
        };
      default:
        return {
          button: {},
          text: {},
          indicator: '#000000',
        };
    }
  };

  const {
    button: variantButton,
    text: variantText,
    indicator,
  } = getVariantStyles();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantButton,
        fullWidth && styles.fullWidth,
        (isLoading || rest.disabled) && styles.disabled,
      ]}
      onPress={onPress}
      disabled={isLoading || rest.disabled}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={indicator} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.text, variantText]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const getThemedStyles = (scheme: 'light' | 'dark' | null | undefined) => {
  const theme = Colors[scheme || 'light'];

  return StyleSheet.create({
    button: {
      height: 50,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      flexDirection: 'row',
    },
    fullWidth: {
      width: '100%',
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    icon: {
      marginRight: 8,
    },
    text: {
      fontFamily: Fonts.bold,
      fontSize: 16,
    },
    primaryButton: {
      backgroundColor: scheme === 'dark' ? theme.tint : '#2D3748',
    },
    primaryText: {
      color: scheme === 'dark' ? theme.background : theme.background,
    },
    secondaryButton: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryText: {
      color: theme.text,
    },
    tertiaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.tint,
    },
    tertiaryText: {
      color: theme.tint,
    },
    disabled: {
      opacity: 0.7,
    },
  });
};