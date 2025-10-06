// JS
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
    View, Text, SectionList, TouchableOpacity, RefreshControl,
    Alert, Platform, ActionSheetIOS, ActivityIndicator, Pressable
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ensureFirebase } from '@/firebase/firebase';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

// 👉 helpers de escolha/seleção e upload
import {
    chooseExamSource,
    takePhotoAsFile,
    pickImageAsFile,
    pickDocumentAsFile,
} from '@/src/features/exams/pickers';
import { uploadExamForPet } from '@/src/features/exams/uploadExam';

function isImageMime(m) { return (m || '').startsWith('image/'); }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function humanDateLabel(d) {
    const t = new Date(), y = new Date(); y.setDate(t.getDate() - 1);
    if (sameDay(d, t)) return 'Hoje';
    if (sameDay(d, y)) return 'Ontem';
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
function groupByDay(items) {
    const map = new Map();
    for (const it of items) {
        const ts = it.createdAt?._seconds ? new Date(it.createdAt._seconds * 1000)
            : it.createdAt instanceof Date ? it.createdAt : new Date(0);
        const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')}`;
        if (!map.has(key)) map.set(key, { date: ts, data: [] });
        map.get(key).data.push(it);
    }
    return Array.from(map.values())
        .sort((a, b) => b.date - a.date)
        .map(s => ({ title: humanDateLabel(s.date), data: s.data }));
}

function guessExt(mime, url = '') {
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('gif')) return 'gif';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('mp4')) return 'mp4';
    if (mime.includes('quicktime')) return 'mov';
    try { const u = new URL(url); const m = (u.pathname || '').match(/\.(\w+)$/); if (m) return m[1].toLowerCase(); } catch { }
    return 'bin';
}

// baixa pro cache e devolve o caminho local (pra compartilhar)
async function prepareLocalForShare({ url, mime, title }) {
    if (!url) throw new Error('URL ausente');
    const safeName = (title || 'arquivo').toString().trim().replace(/[^\w.-]/g, '_') || 'arquivo';
    const ext = guessExt(mime || '', url);
    const local = `${FileSystem.cacheDirectory}${safeName}.${ext}`;

    try {
        const info = await FileSystem.getInfoAsync(local);
        if (info.exists && info.size > 0) return local;
    } catch { }

    const res = await FileSystem.downloadAsync(url, local);
    if (res.status !== 200) throw new Error(`Download falhou: HTTP ${res.status}`);
    return res.uri;
}

export default function ExamsList() {
    const { firestore, auth, storageInstance } = ensureFirebase() || {};
    const { id: petId } = useLocalSearchParams();

    const [items, setItems] = useState([]);
    const [err, setErr] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // overlays
    const [isSharing, setIsSharing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!firestore) return;
        const uid = auth?.currentUser?.uid;
        if (!uid || !petId) return;

        const colRef = firestore
            .collection('users').doc(String(uid))
            .collection('pets').doc(String(petId))
            .collection('exams');

        const unsub = colRef.orderBy('createdAt', 'desc').onSnapshot(
            snap => {
                setErr(null);
                setItems(snap?.docs?.map(d => ({ id: d.id, ...d.data() })) ?? []);
            },
            e => { console.warn('exams onSnapshot', e); setErr(e); setItems([]); }
        );
        return unsub;
    }, [firestore, auth, petId]);

    const sections = useMemo(() => groupByDay(items), [items]);

    const openPreview = useCallback((item) => {
        const uid = auth?.currentUser?.uid;
        if (!uid) return;
        router.push({
            pathname: '/(files)/exam-preview',
            params: {
                uid: String(uid),
                petId: String(petId),
                examId: String(item.id),
            }
        });
    }, [auth, petId]);

    const handleShare = useCallback(async (item) => {
        try {
            const url = item?.file?.downloadURL;
            const mime = item?.file?.mime || '';
            const title = item?.title || item?.file?.name || 'Exame';
            if (!url) return;

            setIsSharing(true);
            const localUri = await prepareLocalForShare({ url, mime, title });
            setIsSharing(false);

            if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
                await Sharing.shareAsync(localUri, { mimeType: mime || undefined, dialogTitle: title });
            } else {
                await Share.share({ url: localUri, message: localUri });
            }
        } catch (e) {
            console.log('share error', e);
            setIsSharing(false);
            Alert.alert('Compartilhar', 'Não foi possível compartilhar este arquivo.');
        }
    }, []);

    const handleDelete = useCallback(async (item) => {
        const uid = auth?.currentUser?.uid;
        if (!uid || !petId) return;
        Alert.alert('Apagar', 'Deseja apagar este exame?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Apagar', style: 'destructive', onPress: async () => {
                    try {
                        const path = item?.file?.storagePath;
                        if (path && storageInstance) {
                            await storageInstance.ref(path).delete();
                        }
                        await firestore
                            .collection('users').doc(String(uid))
                            .collection('pets').doc(String(petId))
                            .collection('exams').doc(String(item.id))
                            .delete();
                    } catch (e) {
                        console.log('delete error', e);
                        Alert.alert('Apagar', 'Falha ao apagar o exame.');
                    }
                }
            }
        ]);
    }, [auth, petId, firestore, storageInstance]);

    const openActions = useCallback((item) => {
        const options = ['Compartilhar', 'Apagar', 'Cancelar'];
        const cancelButtonIndex = 2;
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                { options, destructiveButtonIndex: 1, cancelButtonIndex },
                (i) => { if (i === 0) handleShare(item); else if (i === 1) handleDelete(item); }
            );
        } else {
            Alert.alert('Exame', 'Escolha uma ação', [
                { text: 'Compartilhar', onPress: () => handleShare(item) },
                { text: 'Apagar', style: 'destructive', onPress: () => handleDelete(item) },
                { text: 'Cancelar', style: 'cancel' }
            ]);
        }
    }, [handleShare, handleDelete]);

    const renderThumb = (item) => {
        const mime = item?.file?.mime || '';
        if (isImageMime(mime)) {
            return (
                <Image
                    source={{ uri: item?.file?.downloadURL }}
                    style={{ width: 56, height: 56, borderRadius: 8 }}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                />
            );
        }
        let icon = 'document-text-outline';
        if (mime.includes('pdf')) icon = 'document-outline';
        else if (mime.includes('video')) icon = 'videocam-outline';
        else if (mime.includes('audio')) icon = 'musical-notes-outline';
        return (
            <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={22} color="#374151" />
            </View>
        );
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            onPress={() => openPreview(item)}
            onLongPress={() => openActions(item)}
            style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' }}
        >
            {renderThumb(item)}
            <View style={{ marginLeft: 12, flex: 1 }}>
                <Text numberOfLines={1} style={{ fontWeight: '600', fontSize: 16 }}>
                    {item.title || item.file?.name || 'Exame'}
                </Text>
                <Text numberOfLines={1} style={{ color: '#6B7280', marginTop: 2, fontSize: 12 }}>
                    {item.file?.mime || 'arquivo'}
                </Text>
            </View>
            <TouchableOpacity onPress={() => openActions(item)} hitSlop={12}>
                <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section }) => (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F3F4F6', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
            <Text style={{ color: '#374151', fontWeight: '700' }}>{section.title}</Text>
        </View>
    );

    // ⬇️ função "Adicionar" (usada pelo botão + do header)
    const handleAdd = useCallback(async () => {
        try {
            const fb = ensureFirebase();
            if (!fb) return Alert.alert('Exames', 'Falha ao inicializar Firebase.');
            const { auth, firestore, storageInstance } = fb;
            const uid = auth?.currentUser?.uid;
            if (!uid) return Alert.alert('Exames', 'Usuário não autenticado.');
            if (!petId) return;

            // (opcional) buscar tutorId do pet para salvar junto
            let tutorId = null;
            try {
                const petSnap = await firestore
                    .collection('users').doc(String(uid))
                    .collection('pets').doc(String(petId))
                    .get();
                if (petSnap.exists) {
                    const data = petSnap.data();
                    tutorId = data?.tutor?.id ? String(data.tutor.id) : null;
                }
            } catch { /* segue sem tutorId */ }

            // 1) escolher origem
            const source = await chooseExamSource();
            if (!source) return;

            // 2) picker
            let picked = null;
            if (source === 'camera') picked = await takePhotoAsFile();
            else if (source === 'gallery') picked = await pickImageAsFile();
            else if (source === 'document') picked = await pickDocumentAsFile();
            if (!picked) return;

            // 3) upload com progress
            setUploading(true);
            setProgress(0);

            await uploadExamForPet({
                firestore,
                storage: storageInstance,
                uid,
                petId: String(petId),
                tutorId,
                title: null,
                notes: null,
                file: picked,
                onProgress: (p) => setProgress(p),
            });

            setProgress(100);
            setUploading(false);
            Alert.alert('Exames', 'Arquivo salvo!');
        } catch (e) {
            setUploading(false);
            console.log('Erro ao salvar exame:', e);
            Alert.alert('Exames', 'Falha ao salvar o arquivo.');
        }
    }, [petId]);

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            {/* título + botão "+" no header */}
            <Stack.Screen
                options={{
                    title: 'Exames',
                    headerRight: () => (
                        <Pressable onPress={handleAdd} hitSlop={8} style={{ paddingHorizontal: 4 }}>
                            <Ionicons name="add-circle" size={24} color="#007AFF" />
                        </Pressable>
                    ),
                }}
            />

            {err ? (
                <View style={{ padding: 16 }}>
                    <Text style={{ color: 'crimson' }}>Não foi possível carregar os exames.</Text>
                </View>
            ) : null}

            <SectionList
                sections={sections}
                keyExtractor={(i) => i.id}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.04)', marginLeft: 84 }} />}
                ListEmptyComponent={
                    <View style={{ padding: 24 }}>
                        <Text style={{ color: '#6B7280' }}>Nenhum exame por aqui ainda.</Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 400); }}
                    />
                }
                contentContainerStyle={{ paddingBottom: 16 }}
            />

            {/* Spinner de compartilhar */}
            {isSharing && (
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
                        alignItems: 'center', justifyContent: 'center', zIndex: 999,
                    }}
                >
                    <View style={{ backgroundColor: '#111827', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 10, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={{ color: '#fff', marginTop: 10 }}>Preparando para compartilhar…</Text>
                    </View>
                </View>
            )}

            {/* Overlay de upload com progress */}
            {uploading && (
                <View style={{
                    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }}>
                    <View style={{ backgroundColor: '#111827', padding: 16, borderRadius: 12, minWidth: 180, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={{ color: 'white', marginTop: 10, fontWeight: '600' }}>
                            Enviando… {progress}%
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}