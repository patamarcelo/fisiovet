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
  color = "whitesmoke",
  style = {},
}) {

  const resolved = MAPPING[name] || name;

  return <MaterialIcons color={color} size={size} name={resolved} style={style} />;
}

// exemplo de mapeamento (precisa criar)
// mapeie os nomes “estilo SF Symbols” que você usa para MaterialIcons equivalentes
const MAPPING = {
  home: 'home',
  settings: 'settings',
  search: 'search',

  // setas / navegação
  'chevron.right': 'chevron-right',

  // pagamentos / dinheiro
  'creditcard.fill': 'credit-card',
  'monetization-on': 'monetization-on',
  'payments': 'payments',

  // agenda / calendário
  calendar: 'calendar-today',
  'calendar-outline': 'calendar-today',

  // pessoa
  'person.crop.circle.fill': 'person',
};