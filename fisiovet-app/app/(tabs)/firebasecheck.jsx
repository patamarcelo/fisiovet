import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ensureFirebase } from '@/firebase/firebase';
import { useDispatch } from 'react-redux';
import { setUser } from '@/store/slices/userSlice';

export default function FirebaseCheckScreen() {
    const router = useRouter();
    const { auth, firestore } = ensureFirebase();

    const [status, setStatus] = useState('Inicializando…');
    const [uid, setUid] = useState(null);
    const [pingDoc, setPingDoc] = useState(null);
    const [busy, setBusy] = useState(false);
    const dispatch = useDispatch()

    useEffect(() => {
        setStatus('Firebase carregado. Pronto para testar.');
    }, []);

    const signInAnon = async () => {
        setBusy(true);
        try {
            const res = await auth().signInAnonymously();
            setUid(res.user.uid);
            setStatus('Auth OK (anônimo).');
        } catch (e) {
            setStatus('Falha no Auth: ' + (e?.message ?? String(e)));
        } finally {
            setBusy(false);
        }
    };

    const writePing = async () => {
        setBusy(true);
        try {
            const ref = firestore().collection('debug').doc('ping');
            await ref.set({
                ok: true,
                at: firestore.FieldValue.serverTimestamp(),
                from: 'dev-client',
            });
            setStatus('Firestore WRITE OK.');
        } catch (e) {
            setStatus('Falha no Firestore (write): ' + (e?.message ?? String(e)));
        } finally {
            setBusy(false);
        }
    };

    const readPing = async () => {
        setBusy(true);
        try {
            const snap = await firestore().collection('debug').doc('ping').get();
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

    const handleLougout = () => {
        dispatch(setUser(null));
    }

    return (
        <View style={s.container}>
            <Text style={s.title}>Firebase Check</Text>
            <Text style={s.msg}>{status}</Text>
            {uid && <Text style={s.code}>uid: {uid}</Text>}
            {pingDoc && <Text style={s.code}>ping: {JSON.stringify(pingDoc)}</Text>}

            <View style={s.row}>
                <Button title="1) Sign-in anônimo" onPress={signInAnon} />
            </View>
            <View style={s.row}>
                <Button title="2) Gravar ping" onPress={writePing} />
            </View>
            <View style={s.row}>
                <Button title="3) Ler ping" onPress={readPing} />
            </View>
            <View style={s.row}>
                <Button title="4) Sair" onPress={handleLougout} />
            </View>

            {busy && <ActivityIndicator style={{ marginTop: 16 }} />}
            <View style={s.row}>
                <Button title="Voltar" onPress={() => router.back()} />
            </View>
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