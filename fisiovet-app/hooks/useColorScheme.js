import { useColorMode } from "@/src/theme/color-scheme";

export function useColorScheme() {
  const { scheme } = useColorMode();
  return scheme || "light";
}
