import { useLocalSearchParams, router } from 'expo-router';
import { useSelector } from 'react-redux';
import TutorForm from '@/src/screens/tutores/Form';

export default function EditarTutor() {
    const { id } = useLocalSearchParams();
    const tutor = useSelector((s) => s.tutores.byId[id]);

    return <TutorForm tutor={tutor} onSuccess={() => router.back()} />;
}