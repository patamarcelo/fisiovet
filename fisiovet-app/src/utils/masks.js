// Formata CEP: "12345678" -> "12345-678"
export function maskCep(value) {
    if (!value) return '';
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

// Formata telefone: "51987654321" -> "(51) 98765-4321"
export function maskPhone(value) {
    if (!value) return '';
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10)
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}