// src/features/avaliacoes/avaliacaoSlice.js
import { createSlice, nanoid } from '@reduxjs/toolkit';

function makeDefaultDraft(petId) {
    const now = Date.now();
    return {
        id: nanoid(),
        petId,
        createdAt: now,
        title: '',
        type: null,   // ou 'anamnese' / 'neurologica' etc quando criar
        fields: {},   // cada form monta sua própria estrutura aqui
    };
}

const avaliacoesSlice = createSlice({
    name: 'avaliacoes',
    initialState: {
        draftsByPet: {}, // { [petId]: draft }
    },
    reducers: {
        createDraft(state, action) {
            const { petId } = action.payload;
            state.draftsByPet[petId] = makeDefaultDraft(petId);
        },
        updateDraftField(state, action) {
            const { petId, path, value } = action.payload;
            const draft = state.draftsByPet[petId];
            if (!draft) return;
            if (!Array.isArray(path) || path.length === 0) return;

            let ref = draft;

            // Garante que TODOS os objetos intermediários existem:
            for (let i = 0; i < path.length - 1; i++) {
                const key = path[i];

                // se não existe ou não é objeto, inicializa como objeto vazio
                if (
                    ref[key] === undefined ||
                    ref[key] === null ||
                    typeof ref[key] !== 'object'
                ) {
                    ref[key] = {};
                }

                ref = ref[key];
            }

            const lastKey = path[path.length - 1];
            ref[lastKey] = value;
        },

        clearDraft(state, action) {
            const { petId } = action.payload;
            delete state.draftsByPet[petId];
        },
        // ✅ faltava este:
        replaceDraft(state, action) {
            const { petId, draft } = action.payload;
            state.draftsByPet[petId] = draft;
        },
    },
});

export const { createDraft, updateDraftField, clearDraft, replaceDraft } =
    avaliacoesSlice.actions;
export default avaliacoesSlice.reducer;