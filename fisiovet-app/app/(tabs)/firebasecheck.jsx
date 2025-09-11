// FirebaseCheckScreen.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';

import { ensureFirebase } from '@/firebase/firebase'; // <- sua função modular
import { FieldValue } from '@react-native-firebase/firestore'; // <- p/ serverTimestamp
import { clearUser } from '@/src/store/slices/userSlice';

export default function FirebaseCheckScreen() {
    const router = useRouter();
    const fb = ensureFirebase();               // { app, auth, firestore } OU null
    const [status, setStatus] = useState('Inicializando…');
    const [uid, setUid] = useState(null);
    const [pingDoc, setPingDoc] = useState(null);
    const [busy, setBusy] = useState(false);
    const dispatch = useDispatch();

    useEffect(() => {
        if (!fb) {
            setStatus('Firebase não inicializado. Confira os arquivos google-services.');
            return;
        }
        setStatus('Firebase carregado. Pronto para testar.');
    }, [fb]);

    const signInAnon = async () => {
        if (!fb) return;
        setBusy(true);
        try {
            const res = await fb.auth.signInAnonymously(); // ✅ sem parênteses
            setUid(res.user.uid);
            setStatus('Auth OK (anônimo).');
        } catch (e) {
            setStatus('Falha no Auth: ' + (e?.message ?? String(e)));
        } finally {
            setBusy(false);
        }
    };

    const writePing = async () => {
        if (!fb) return;
        setBusy(true);
        try {
            const user = fb.auth.currentUser; // ✅ modular
            if (!user) {
                setStatus('Usuário não autenticado!');
                return;
            }

            await fb.firestore
                .collection('users')
                .doc(user.uid)
                .collection('debug')
                .doc('ping')
                .set({
                    ok: true,
                    at: FieldValue.serverTimestamp(), // ✅ timestamp modular
                    from: 'dev-client',
                    uid: user.uid,
                    email: user.email ?? null,
                });

            setStatus('Firestore WRITE OK.');
        } catch (e) {
            setStatus('Falha no Firestore (write): ' + (e?.message ?? String(e)));
        } finally {
            setBusy(false);
        }
    };

    const readPing = async () => {
        if (!fb) return;
        setBusy(true);
        try {
            const user = fb.auth.currentUser;
            if (!user) {
                setStatus('Usuário não autenticado!');
                return;
            }

            const snap = await fb.firestore
                .collection('users')
                .doc(user.uid)
                .collection('debug')
                .doc('ping')
                .get();

            if (snap.exists) {
                setPingDoc(snap.data());
                setStatus('Firestore READ OK.');
            } else {
                setPingDoc(null);
                setStatus('Doc não encontrado.');
            }
        } catch (e) {
            setStatus('Falha no Firestore (read): ' + (e?.message ?? String(e)));
        } finally {
            setBusy(false);
        }
    };

    const handleLogout = async () => {
        if (!fb) return;
        await fb.auth.signOut();
        dispatch(clearUser());
    };

    return (
        <View style={s.container}>
            <Text style={s.title}>Firebase Check</Text>
            <Text style={s.msg}>{status}</Text>
            {uid && <Text style={s.code}>uid: {uid}</Text>}
            {pingDoc && <Text style={s.code}>ping: {JSON.stringify(pingDoc)}</Text>}

            <View style={s.row}><Button title="1) Sign-in anônimo" onPress={signInAnon} /></View>
            <View style={s.row}><Button title="2) Gravar ping" onPress={writePing} /></View>
            <View style={s.row}><Button title="3) Ler ping" onPress={readPing} /></View>
            <View style={s.row}><Button title="4) Sair" onPress={handleLogout} /></View>

            {busy && <ActivityIndicator style={{ marginTop: 16 }} />}
            <View style={s.row}><Button title="Voltar" onPress={() => router.back()} /></View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, padding: 20, gap: 12, justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '700' },
    msg: { fontSize: 14, color: '#444' },
    code: { fontFamily: 'Menlo', fontSize: 12, color: '#666' },
    row: { marginTop: 10 },
});