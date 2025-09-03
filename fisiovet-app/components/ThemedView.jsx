import { View } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

/**
 * @param {{
 *   style?: import('react-native').StyleProp<import('react-native').ViewStyle>,
 *   lightColor?: string,
 *   darkColor?: string
 * } & import('react-native').ViewProps} props
 */
export function ThemedView({ style, lightColor, darkColor, ...otherProps }) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}