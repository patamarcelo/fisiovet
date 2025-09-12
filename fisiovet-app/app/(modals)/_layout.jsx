// app/(modals)/_layout.jsx
import { Stack } from 'expo-router';

export default function ModalLayout() {
    return (
        <Stack
            screenOptions={{
                presentation: 'modal',
                headerTitle: 'Mapa',
            }}
        />
    );
}