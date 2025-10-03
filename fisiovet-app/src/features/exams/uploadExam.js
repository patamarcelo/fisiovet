// src/features/exams/uploadExam.js
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import mime from 'mime'; // se não tiver, instale: npm i mime

// Escolhe arquivo (imagem, pdf, etc.)
export async function pickExamFile({ mode = 'any' } = {}) {
    if (mode === 'image') {
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.9,
            base64: false,
            allowsEditing: false,
        });
        if (res.canceled) return null;
        const asset = res.assets[0];
        return {
            uri: asset.uri,
            name: asset.fileName || asset.uri.split('/').pop() || `image-${Date.now()}.jpg`,
            mime: asset.mimeType || mime.getType(asset.uri) || 'image/jpeg',
            size: asset.fileSize || (await safeGetSize(asset.uri)),
            width: asset.width,
            height: asset.height,
        };
    }

    // Documentos (PDF, etc.)
    const res = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
    });
    if (res.canceled) return null;
    const asset = res.assets[0];
    return {
        uri: asset.uri,
        name: asset.name || asset.uri.split('/').pop() || `file-${Date.now()}`,
        mime: asset.mimeType || mime.getType(asset.uri) || 'application/octet-stream',
        size: asset.size ?? (await safeGetSize(asset.uri)),
    };
}

async function safeGetSize(uri) {
    try {
        const info = await FileSystem.getInfoAsync(uri, { size: true });
        return info.size ?? 0;
    } catch {
        return 0;
    }
}

/**
 * Sobe arquivo no Storage e cria doc em:
 * users/{uid}/pets/{petId}/exams/{examId}
 */
export async function uploadExamForPet({
    firestore,         // vem do ensureFirebase()
    storage,           // storageInstance do ensureFirebase()
    uid,
    petId,
    tutorId = null,
    title = null,
    notes = null,
    file,              // { uri, name, mime, size, width?, height? }
}) {
    if (!uid) throw new Error('UID ausente');
    if (!petId) throw new Error('petId ausente');
    if (!file?.uri) throw new Error('Arquivo inválido');

    // 1) Cria um doc vazio para pegar o ID
    const examRef = firestore
        .collection('users').doc(uid)
        .collection('pets').doc(String(petId))
        .collection('exams')
        .doc();

    const examId = examRef.id;

    // 2) Faz upload no Storage (RNFirebase storage)
    const storagePath = `users/${uid}/pets/${petId}/exams/${examId}/${file.name}`;
    const sref = storage.ref(storagePath);

    // putFile aceita URI local (file://)
    const uploadTask = sref.putFile(file.uri, {
        contentType: file.mime,
    });

    await new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            // progress => { console.log(progress.bytesTransferred, progress.totalBytes); },
            () => { },
            reject,
            resolve
        );
    });

    const downloadURL = await sref.getDownloadURL();

    // 3) Salva metadados no Firestore
    const payload = {
        petId,
        tutorId,
        title: title || file.name,
        notes: notes || null,
        type: 'exam',
        tags: [],
        createdAt: firestore.FieldValue.serverTimestamp(),
        file: {
            name: file.name,
            mime: file.mime,
            size: file.size ?? null,
            width: file.width ?? null,
            height: file.height ?? null,
            storagePath,
            downloadURL,
        },
    };

    await examRef.set(payload);

    // (Opcional) timeline espelhado
    // const timelineRef = firestore.collection('users').doc(uid).collection('timeline').doc();
    // await timelineRef.set({
    //   kind: 'exam',
    //   createdAt: payload.createdAt,
    //   ref: { collection: 'exams', id: examId, petId },
    //   summary: title || file.name,
    // });

    return { examId, downloadURL };
}