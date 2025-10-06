import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import WebView from 'react-native-webview';
import { Image } from 'expo-image';
import { ensureFirebase } from '@/firebase/firebase';
import { Platform } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

const isImg = (m) => (m || '').startsWith('image/');
const isPdf = (m) => (m || '').includes('pdf');

export default function ExamPreview() {
    const insets = useSafeAreaInsets();
    const { uid: uidParam, petId, examId } = useLocalSearchParams();
    const fb = ensureFirebase();
    const auth = fb?.auth;
    const firestore = fb?.firestore;
    const storage = fb?.storageInstance;

    const uid = uidParam || auth?.currentUser?.uid;

    const tint = useThemeColor({}, 'tint');

    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState(null); // { title, mime, url }
    const [err, setErr] = useState(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                if (!firestore || !storage || !uid || !petId || !examId) {
                    throw new Error('Parâmetros ausentes');
                }
                const docRef = firestore
                    .collection('users').doc(String(uid))
                    .collection('pets').doc(String(petId))
                    .collection('exams').doc(String(examId));

                const snap = await docRef.get();
                if (!snap.exists) throw new Error('Exame não encontrado');

                const data = snap.data();
                const storagePath = data?.file?.storagePath;
                if (!storagePath) throw new Error('storagePath ausente');

                const sref = storage.ref(storagePath);
                const freshUrl = await sref.getDownloadURL();

                if (!alive) return;
                setMeta({
                    title: data?.title || data?.file?.name || 'Exame',
                    mime: data?.file?.mime || '',
                    url: freshUrl, // URL crua do Firebase
                });
                setErr(null);
            } catch (e) {
                if (!alive) return;
                setErr(e);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [firestore, storage, uid, petId, examId]);

    const body = useMemo(() => {
        if (!meta) return null;
        const { url, mime } = meta;

        if (isPdf(mime)) {
            if (Platform.OS === 'android') {
                const gv = `https://drive.google.com/viewerng/viewer?embedded=1&url=${encodeURIComponent(url)}`;
                return (
                    <WebView
                        source={{ uri: gv }}
                        style={{ flex: 1, backgroundColor: 'black' }}
                        startInLoadingState
                        allowsBackForwardNavigationGestures={false}
                        setSupportMultipleWindows={false}
                        overScrollMode="never"
                        nestedScrollEnabled
                        // melhora zoom:
                        scalesPageToFit
                        // logs úteis:
                        onHttpError={(e) => console.log('webview http error', e.nativeEvent)}
                        onError={(e) => console.log('webview error', e.nativeEvent)}
                    />
                );
            }
            // iOS: renderiza PDF nativamente com zoom
            return (
                <WebView
                    source={{ uri: url }}
                    style={{ flex: 1, backgroundColor: 'black' }}
                    startInLoadingState
                    allowsBackForwardNavigationGestures
                    setSupportMultipleWindows={false}
                    bounces={false}
                    overScrollMode="never"
                    scalesPageToFit
                    onHttpError={(e) => console.log('webview http error', e.nativeEvent)}
                    onError={(e) => console.log('webview error', e.nativeEvent)}
                />
            );
        }

        if (isImg(mime)) {
            return (
                <Image
                    source={{ uri: url }}
                    style={{ flex: 1 }}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                // zoom por gesto de pinça — o Expo Image não oferece zoom nativo.
                // Se quiser pinch-to-zoom real em imagem, depois podemos trocar
                // por um viewer com gestos (react-native-image-viewing, etc.).
                />
            );
        }

        // Outros tipos: tenta abrir direto no WebView
        return (
            <WebView
                source={{ uri: url }}
                style={{ flex: 1, backgroundColor: 'black' }}
                startInLoadingState
                setSupportMultipleWindows={false}
                overScrollMode="never"
                scalesPageToFit
                onHttpError={(e) => console.log('webview http error', e.nativeEvent)}
                onError={(e) => console.log('webview error', e.nativeEvent)}
            />
        );
    }, [meta]);

    return (
        <View style={{ flex: 1, backgroundColor: tint }}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="light" />

            {/* HEADER ocupa espaço real */}
            <View
                style={{
                    paddingTop: insets.top,
                    height: insets.top + 56,
                    backgroundColor: 'rgba(0,0,0,0.45)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 8,
                }}
            >
                <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
                    <Ionicons name="close" size={24} color="#fff" />
                </Pressable>
                <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '600', marginLeft: 8, flex: 1 }}>
                    {meta?.title || 'Exame'}
                </Text>
            </View>

            {/* CONTEÚDO abaixo do header */}
            <View style={{ flex: 1 }}>
                {loading ? (
                    /* ...loading... */
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator /><Text style={{ color: '#fff', marginTop: 8 }}>Carregando…</Text>
                    </View>
                ) : err ? (
                    /* ...erro... */
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                        <Text style={{ color: '#fff', textAlign: 'center' }}>Não foi possível abrir o arquivo.</Text>
                        <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 6 }}>{String(err?.message || '')}</Text>
                    </View>
                ) : (
                    body /* seu WebView/Image */
                )}
            </View>
        </View>
    );
}