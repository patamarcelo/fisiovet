import { Stack } from 'expo-router';

export default function FilesLayout() {
    return (
        <Stack screenOptions={{
            headerShown: false,
            presentation: 'card',   // ← não é modal
            gestureEnabled: false,  // ← evita conflito com pinch/scroll
            animation: 'slide_from_right',
        }}>
            <Stack.Screen name="exam-preview" />
        </Stack>
    );
}