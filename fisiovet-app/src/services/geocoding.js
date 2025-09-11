import { fetchAddressByCep } from './cep';

// Lê a chave do app.config.js (prefixo EXPO_PUBLIC_)
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Constrói um endereço único para geocodificar
function buildFreeformAddress(endereco = {}) {
    const parts = [
        endereco.logradouro,
        endereco.numero,
        endereco.bairro,
        endereco.cidade,
        endereco.uf,
        endereco.cep,
        'Brasil',
    ]
        .filter(Boolean)
        .join(', ');
    return parts;
}

// Constrói o parâmetro "components=" (ajuda muito no Brasil)
function buildComponents(endereco = {}) {
    const comps = [];
    if (endereco.cep) comps.push(`postal_code:${endereco.cep.replace(/\D/g, '')}`);
    if (endereco.uf) comps.push(`administrative_area:${endereco.uf}`);
    if (endereco.cidade) comps.push(`locality:${endereco.cidade}`);
    comps.push('country:BR');
    return comps.join('|');
}

// Chama a Geocoding API do Google
async function callGoogleGeocode({ address, components }) {
    if (!API_KEY) throw new Error('Chave da Google API ausente (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)');
    const params = new URLSearchParams();
    if (address) params.set('address', address);
    if (components) params.set('components', components);
    params.set('key', API_KEY);

    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Falha na Geocoding API (${res.status}): ${txt}`);
    }
    const data = await res.json();

    // Trata status do Google
    // https://developers.google.com/maps/documentation/geocoding/requests-geocoding#StatusCodes
    switch (data.status) {
        case 'OK':
            break;
        case 'ZERO_RESULTS':
            throw new Error('Endereço não encontrado (ZERO_RESULTS).');
        case 'OVER_QUERY_LIMIT':
            throw new Error('Limite de cota atingido (OVER_QUERY_LIMIT).');
        case 'REQUEST_DENIED':
            throw new Error(`Requisição negada: ${data.error_message || 'REQUEST_DENIED'}`);
        case 'INVALID_REQUEST':
            throw new Error('Requisição inválida (falta address/components).');
        case 'UNKNOWN_ERROR':
            throw new Error('Erro temporário no serviço (UNKNOWN_ERROR).');
        default:
            throw new Error(`Geocoding falhou: ${data.status}`);
    }

    const result = data.results?.[0];
    if (!result?.geometry?.location) {
        throw new Error('Resposta sem geometry/location.');
    }

    const { lat, lng } = result.geometry.location;
    return {
        lat,
        lng,
        placeId: result.place_id,
        formattedAddress: result.formatted_address,
        precision: result.geometry.location_type, // ROOFTOP, RANGE_INTERPOLATED, etc.
        raw: result, // opcional: útil para debugging
    };
}

/**
 * Geocodifica usando os campos de endereço já cadastrados.
 * Retorna: { lat, lng, placeId, formattedAddress, precision }
 */
export async function geocodeAddress(endereco = {}) {
    const address = buildFreeformAddress(endereco);
    const components = buildComponents(endereco);

    // Primeiro tenta com address+components (mais forte)
    try {
        return await callGoogleGeocode({ address, components });
    } catch (e1) {
        // Fallback: tenta só com components (casos de logradouro ausente)
        try {
            return await callGoogleGeocode({ components });
        } catch (e2) {
            // Fallback final: tenta só com address
            return await callGoogleGeocode({ address });
        }
    }
}

/**
 * Geocodifica a partir de um CEP (8 dígitos) — busca no ViaCEP e depois geocodifica.
 * Retorna: { lat, lng, placeId, formattedAddress, precision, endereco }
 */
export async function geocodeByCep(cep) {
    const cleanCep = String(cep || '').replace(/\D/g, '');
    if (cleanCep.length !== 8) {
        throw new Error('CEP inválido para geocodificação');
    }
    const enderecoViaCep = await fetchAddressByCep(cleanCep);
    const geo = await geocodeAddress(enderecoViaCep);
    return { ...geo, endereco: enderecoViaCep };
}