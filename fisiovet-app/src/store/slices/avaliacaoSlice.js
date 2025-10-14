// src/features/avaliacoes/avaliacaoSlice.js
import { createSlice, nanoid } from '@reduxjs/toolkit';

function makeDefaultDraft(petId) {
    const now = Date.now();
    return {
        id: nanoid(),
        petId,
        createdAt: now,
        radios: {
            grupoRadio1: 'op1',
            grupoRadio2: 'op1',
            grupoRadio3: 'op1',
            grupoRadio4: 'op1',
            grupoRadio5: 'op1',
        },
        switches: {
            grupoSwitch1: { op1: false, op2: false, op3: false },
            grupoSwitch2: { op1: false, op2: false, op3: false },
            grupoSwitch3: { op1: false, op2: false, op3: false },
            grupoSwitch4: { op1: false, op2: false, op3: false },
            grupoSwitch5: { op1: false, op2: false, op3: false },
        },
        notes: '',
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
            let ref = draft;
            for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
            ref[path[path.length - 1]] = value;
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