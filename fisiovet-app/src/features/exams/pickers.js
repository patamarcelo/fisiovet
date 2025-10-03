// src/features/exams/pickers.js
import { Platform, ActionSheetIOS, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

/** Mostra as opções e retorna 'camera' | 'gallery' | 'document' | null */
export async function chooseExamSource() {
    if (Platform.OS === 'ios') {
        return new Promise((resolve) => {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: 'Adicionar exame',
                    options: ['Cancelar', 'Tirar foto', 'Escolher da galeria', 'Escolher arquivo'],
                    cancelButtonIndex: 0,
                },
                (btnIndex) => {
                    if (btnIndex === 1) resolve('camera');
                    else if (btnIndex === 2) resolve('gallery');
                    else if (btnIndex === 3) resolve('document');
                    else resolve(null);
                }
            );
        });
    }

    // Android (simples)
    return new Promise((resolve) => {
        Alert.alert(
            'Adicionar exame',
            'Selecione a origem',
            [
                { text: 'Tirar foto', onPress: () => resolve('camera') },
                { text: 'Galeria', onPress: () => resolve('gallery') },
                { text: 'Arquivos', onPress: () => resolve('document') },
                { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
            ],
            { cancelable: true }
        );
    });
}

/** Tira foto com a câmera e retorna { uri, name, mime, size, width, height } */
export async function takePhotoAsFile() {
    // Permissão câmera
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permissão', 'Permissão da câmera negada.');
        return null;
    }

    const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        exif: false,
    });
    if (result.canceled) return null;

    const asset = result.assets[0];
    const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
    // nome e mime “sensatos”
    const name = asset.fileName || `exam_${Date.now()}.jpg`;
    const mime = asset.mimeType || 'image/jpeg';

    return {
        uri: asset.uri,
        name,
        mime,
        size: info.size || 0,
        width: asset.width,
        height: asset.height,
    };
}

/** Pega imagem da galeria: retorna { uri, name, mime, size, width, height } */
export async function pickImageAsFile() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert('Permissão', 'Permissão da galeria negada.');
        return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        exif: false,
    });
    if (result.canceled) return null;

    const asset = result.assets[0];
    const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
    const name = asset.fileName || `exam_${Date.now()}.jpg`;
    const mime = asset.mimeType || 'image/jpeg';

    return {
        uri: asset.uri,
        name,
        mime,
        size: info.size || 0,
        width: asset.width,
        height: asset.height,
    };
}

/** Pega arquivo (pdf/imagem/etc): retorna { uri, name, mime, size } */
export async function pickDocumentAsFile() {
    const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: '*/*', // se quiser restringir: ['application/pdf', 'image/*']
    });
    if (result.canceled) return null;

    const asset = result.assets[0];
    // Em alguns casos o DocumentPicker já traz tamanho; se não, tenta FileSystem
    let size = asset.size ?? 0;
    if (!size && asset.uri) {
        const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
        size = info.size || 0;
    }

    return {
        uri: asset.uri,
        name: asset.name || `exam_${Date.now()}`,
        mime: asset.mimeType || 'application/octet-stream',
        size,
        // (documento geralmente não tem width/height, tudo bem)
    };
}