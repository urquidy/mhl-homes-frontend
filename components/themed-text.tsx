import { StyleSheet, Text, type TextProps } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Fonts } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'title' | 'subtitle' | 'body' | 'link' | 'medium';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'body',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const linkColor = useThemeColor({}, 'tint');

  return (
    <Text
      style={[
        { color },
        styles.body, // Default style
        type === 'title' ? styles.title : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? [styles.link, { color: linkColor }] : undefined,
        type === 'medium' ? styles.medium : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.body,
  },
  medium: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.medium,
  },
  title: {
    fontSize: 32,
    lineHeight: 32,
    fontFamily: Fonts.title,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
});

