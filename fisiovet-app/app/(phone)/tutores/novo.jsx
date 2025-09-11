import TutorForm from '@/src/screens/tutores/Form';
import { router } from 'expo-router';

export default function NovoTutor() {
    return <TutorForm onSuccess={() => router.back()} />;
}