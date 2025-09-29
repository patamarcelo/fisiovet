import React, { useLayoutEffect } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useSelector } from 'react-redux';
import TutorForm from '@/app/(modals)/tutor-new';

export default function EditarTutor() {
    const { id, mode } = useLocalSearchParams();
    const navigation = useNavigation();

    console.log('id: ', id, 'mode: ', mode)

    // pega o tutor do redux
    const tutor = useSelector((s) => s.tutores.byId[id]);

    // configura o header assim que a tela montar / tutor mudar
    useLayoutEffect(() => {
        navigation.setOptions({
            headerLargeTitle: false,                    // 🔒 desativa large title aqui
            headerTitle: tutor?.nome || 'Editar Tutor', // 🔤 nome do tutor no título
        });
    }, [navigation, tutor?.nome]);

    return <TutorForm tutor={tutor} onSuccess={() => navigation.goBack()} />;
}