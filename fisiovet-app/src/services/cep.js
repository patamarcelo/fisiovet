// Serviço simples com ViaCEP (sem key). Retorna campos normalizados.
export async function fetchAddressByCep(rawCep) {
    const cep = String(rawCep || '').replace(/\D/g, '');
    if (cep.length !== 8) throw new Error('CEP inválido');

    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) throw new Error('Falha na consulta de CEP');

    const data = await res.json();
    if (data?.erro) throw new Error('CEP não encontrado');

    // Normaliza para nosso app
    return {
        cep,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || '',
        complemento: data.complemento || '',
    };
}

// Mock de geocodificação por CEP (troque depois por Google/Here/etc.)
export async function geocodeCepMock(cep, endereco) {
    // Porto Alegre (aprox)
    return {
        lat: -30.0346,
        lng: -51.2177,
        precision: 'mock', // útil para saber que é estimado
    };
}