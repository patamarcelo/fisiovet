// src/features/avaliacoes/saveAvaliacao.js
import firestoreModule from '@react-native-firebase/firestore';

/**
 * Salva uma avaliação em:
 * users/{uid}/pets/{petId}/avaliacoes/{avaliacaoId}
 *
 * fields = { radios: {...}, switches: {...}, notes: '' }
 */
export async function saveAvaliacaoForPet({ firestore, uid, petId, tutorId = null, fields }) {
    if (!uid) throw new Error('UID ausente');
    if (!petId) throw new Error('petId ausente');

    const col = firestore
        .collection('users').doc(String(uid))
        .collection('pets').doc(String(petId))
        .collection('avaliacoes');

    // cria doc com ID automático
    const ref = col.doc();
    const payload = {
        type: 'avaliacao',
        petId,
        tutorId,
        fields: fields || { radios: {}, switches: {}, notes: '' },
        createdAt: firestoreModule.FieldValue.serverTimestamp(),
        status: 'submitted', // ou 'draft' se preferir
    };

    await ref.set(payload);
    return { avaliacaoId: ref.id };
}