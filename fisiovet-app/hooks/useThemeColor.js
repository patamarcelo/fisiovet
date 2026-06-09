// hooks/useThemeColor.js
import { Colors } from "@/constants/Colors";
import { useColorMode } from "@/src/theme/color-scheme";

export function useThemeColor(props = {}, colorName) {
  const { scheme } = useColorMode();
  const theme = scheme ?? "light";

  const colorFromProps = props?.[theme];

  return (
    colorFromProps ??
    Colors?.[theme]?.[colorName] ??
    Colors?.light?.[colorName] ??
    "#000000"
  );
}
