import React, { useLayoutEffect } from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useSelector } from 'react-redux';
import TutorForm from '@/src/screens/tutores/Form';

export default function EditarTutor() {
    const { id } = useLocalSearchParams();
    const navigation = useNavigation();

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