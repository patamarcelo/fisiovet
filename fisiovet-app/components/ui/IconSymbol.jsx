// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

/**
 * @param {{
 *   name: keyof typeof MAPPING,
 *   size?: number,
 *   color?: string | import('react-native').OpaqueColorValue,
 *   style?: import('react-native').StyleProp<import('react-native').TextStyle>
 * }} props
 */

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

// exemplo de mapeamento (precisa criar)
const MAPPING = {
  home: 'home',
  settings: 'settings',
  search: 'search',
};