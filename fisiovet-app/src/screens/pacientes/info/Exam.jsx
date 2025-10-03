// app/(phone)/pacientes/[id]/exam.jsx  (lista)  — JS puro
import { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ensureFirebase } from '@/firebase/firebase';

export default function ExamsList() {
    const { firestore, auth } = ensureFirebase() || {};
    const { id: petId } = useLocalSearchParams();
    const [items, setItems] = useState([]);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!firestore) return;
        const uid = auth?.currentUser?.uid;
        if (!uid || !petId) return;

        // users/{uid}/pets/{petId}/exams
        const colRef = firestore
            .collection('users')
            .doc(String(uid))
            .collection('pets')
            .doc(String(petId))
            .collection('exams');

        const unsubscribe = colRef
            .orderBy('createdAt', 'desc')
            .onSnapshot(
                (snap) => {
                    setErr(null);
                    const list = snap?.docs?.map((d) => ({ id: d.id, ...d.data() })) ?? [];
                    setItems(list);
                },
                (error) => {
                    console.warn('onSnapshot(exams) erro:', error);
                    setErr(error);
                    setItems([]);
                }
            );

        return unsubscribe;
    }, [firestore, auth, petId]);

    const renderItem = ({ item }) => {
        const isImage = (item.file?.mime || '').startsWith('image/');
        return (
            <TouchableOpacity style={{ flexDirection: 'row', padding: 12, alignItems: 'center' }}>
                {isImage ? (
                    <Image
                        source={{ uri: item.file?.downloadURL }}
                        style={{ width: 56, height: 56, borderRadius: 8 }}
                        cachePolicy="memory-disk"
                        contentFit="cover"
                    />
                ) : (
                    <View
                        style={{
                            width: 56, height: 56, borderRadius: 8, backgroundColor: '#E5E7EB',
                            alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Text>PDF</Text>
                    </View>
                )}
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontWeight: '600' }}>
                        {item.title || item.file?.name || 'Exame'}
                    </Text>
                    <Text numberOfLines={1} style={{ color: '#6B7280' }}>
                        {item.file?.mime}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            {err ? (
                <View style={{ padding: 16 }}>
                    <Text style={{ color: 'crimson' }}>
                        Não foi possível carregar os exames. Verifique as regras do Firestore e o caminho users/&lt;uid&gt;/pets/&lt;petId&gt;/exams.
                    </Text>
                </View>
            ) : null}
            <FlatList data={items} keyExtractor={(i) => i.id} renderItem={renderItem} />
        </View>
    );
}