import { useEffect } from 'react';
import { useNavigation } from 'expo-router';

export default function useHideTabBar(hidden = true) {
    const navigation = useNavigation();

    useEffect(() => {
        const parent = navigation.getParent?.();
        if (!parent) return;

        if (hidden) {
            parent.setOptions({ tabBarStyle: { display: 'none' } });
        }

        return () => {
            // restaura o estilo padrão do Tabs quando sair da tela
            parent.setOptions({ tabBarStyle: undefined });
        };
    }, [navigation, hidden]);
}