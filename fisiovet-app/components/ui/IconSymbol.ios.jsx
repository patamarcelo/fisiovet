import { SymbolView } from 'expo-symbols';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}) {
  return (
    <SymbolView
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
