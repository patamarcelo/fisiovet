import { useWindowDimensions, Platform } from "react-native";

export function useLayoutVariant() {
    const { width, height } = useWindowDimensions();
    const isPad =
        Platform.OS === "ios" &&
        (Platform.isPad === true || Platform.constants?.interfaceIdiom === "pad");

    if (isPad) {
        const isLandscape = width > height;
        return isLandscape ? "tabletLandscape" : "tabletPortrait";
    }
    return "phone";
}