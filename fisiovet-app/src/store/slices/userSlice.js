// userSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = { user: null };

const userSlice = createSlice({
	name: "user",
	initialState,
	reducers: {
		setUser(state, action) {
			// action.payload = DTO ou null
			state.user = action.payload;
		},
		clearUser(state) {
			state.user = null;
		},
	},
});

export const { setUser, clearUser } = userSlice.actions;

// --- Selectors ---
export const selectUser = (state) => state.user.user;

export const selectUserName = (state) => {
	console.log('state user: ', state.user)
	const u = state.user.user;
	if (!u) return "Usuário";
	return u.displayName || u.name || u.firstName || u.email || "Usuário";
};
export const selectUserPhoto = (state) => state.user.user?.photoURL || null;

export default userSlice.reducer;
