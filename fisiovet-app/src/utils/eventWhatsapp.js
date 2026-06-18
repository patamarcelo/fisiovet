// src/utils/eventWhatsapp.js

const removeAccents = (
    value
) => {
    return String(value || '')
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        );
};

export function normalizeWhatsappPhone(
    value
) {
    const digits =
        String(value || '')
            .replace(/\D/g, '');

    if (!digits) {
        return '';
    }

    /*
     * Telefone brasileiro já contendo DDI.
     */
    if (
        digits.startsWith('55') &&
        digits.length >= 12
    ) {
        return digits;
    }

    /*
     * Telefone brasileiro salvo apenas
     * com DDD + número.
     */
    if (
        digits.length === 10 ||
        digits.length === 11
    ) {
        return `55${digits}`;
    }

    return digits;
}

export function formatEventDate(
    value
) {
    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return '';
    }

    return date.toLocaleDateString(
        'pt-BR',
        {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }
    );
}

export function formatEventTime(
    value
) {
    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return '';
    }

    return date.toLocaleTimeString(
        'pt-BR',
        {
            hour: '2-digit',
            minute: '2-digit',
        }
    );
}

export function buildEventWhatsappMessage({
    template,
    event,
    tutor,
}) {
    const petName =
        event?.petNome ||
        event?.pet?.nome ||
        event?.animalNome ||
        'pet';

    const tutorName =
        tutor?.nome ||
        '';

    const date =
        formatEventDate(
            event?.start
        );

    const time =
        formatEventTime(
            event?.start
        );

    return String(template || '')
        .replace(
            /\[Nome do Pet\]/gi,
            petName
        )
        .replace(
            /\[nome do pet\]/gi,
            petName
        )
        .replace(
            /\[Nome do Tutor\]/gi,
            tutorName
        )
        .replace(
            /\[nome do tutor\]/gi,
            tutorName
        )
        .replace(
            /\[data\]/gi,
            date
        )
        .replace(
            /\[hor[aá]rio\]/gi,
            time
        )
        .trim();
}