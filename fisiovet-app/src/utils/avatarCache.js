// utils/avatarCache.js
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, getDownloadURL, getMetadata } from 'firebase/storage';

const MANIFEST_KEY = '@avatar_cache_manifest'; // { [path]: { version, localUri } }

function safeFileName(s) {
    return String(s).replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function readManifest() {
    try {
        const raw = await AsyncStorage.getItem(MANIFEST_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

async function writeManifest(m) {
    try {
        await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(m));
    } catch (e) {
        // silencia erros de persistência
    }
}

async function fileExists(uri) {
    try {
        const info = await FileSystem.getInfoAsync(uri);
        return !!info?.exists;
    } catch (e) {
        return false;
    }
}

/**
 * Faz cache local (file://) de um arquivo do Firebase Storage (avatar etc.)
 * - Se online, pega a "version" (generation) e baixa só se mudou.
 * - Se offline, tenta usar a última cópia local salva.
 * Retorna: { localUri, version, from }  where from ∈ 'downloaded' | 'cache-hit' | 'cache-offline' | 'cache-stale' | 'empty'
 */
export async function getCachedAvatar(storage, path) {
    const manifest = await readManifest();
    const cached = manifest[path];

    // 1) tenta obter URL + metadata (para descobrir a versão)
    let version = null;
    let downloadUrl = null;

    try {
        const r = ref(storage, path);
        const [url, meta] = await Promise.all([getDownloadURL(r), getMetadata(r)]);
        version = (meta && meta.generation) || String(Date.parse(meta?.updated || '')) || String(Date.now());
        downloadUrl = `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
    } catch (e) {
        // offline ou erro → tenta usar cache existente
        if (cached?.localUri && (await fileExists(cached.localUri))) {
            return { localUri: cached.localUri, version: cached.version, from: 'cache-offline' };
        }
        return { localUri: null, version: null, from: 'empty' };
    }

    // 2) se já temos a mesma versão salva, retorna
    if (cached?.version === version && cached?.localUri && (await fileExists(cached.localUri))) {
        return { localUri: cached.localUri, version, from: 'cache-hit' };
    }

    // 3) baixa e salva nova versão
    const fileName = `${safeFileName(path)}__${version}.img`;
    const localUri = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + fileName;

    try {
        const res = await FileSystem.downloadAsync(downloadUrl, localUri);
        if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

        // limpa versões antigas desse path (best-effort)
        try {
            const dir = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory || FileSystem.documentDirectory);
            const prefix = `${safeFileName(path)}__`;
            const oldOnes = dir.filter((f) => f.startsWith(prefix) && !f.endsWith(`${version}.img`));
            await Promise.all(
                oldOnes.map((f) =>
                    FileSystem.deleteAsync((FileSystem.cacheDirectory || FileSystem.documentDirectory) + f, { idempotent: true })
                )
            );
        } catch (e) { }

        manifest[path] = { version, localUri };
        await writeManifest(manifest);

        return { localUri, version, from: 'downloaded' };
    } catch (e) {
        // se falhou o download mas existe cópia antiga, usa
        if (cached?.localUri && (await fileExists(cached.localUri))) {
            return { localUri: cached.localUri, version: cached.version, from: 'cache-stale' };
        }
        return { localUri: null, version: null, from: 'empty' };
    }
}