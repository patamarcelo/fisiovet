// src/store/slices/userSlice.js
import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit";
import {
	ensureUserProfile,
	getUserProfile,
} from "@/src/services/users";

const FREE_SUBSCRIPTION = {
	plan: "free",
	status: "inactive",
	source: null,
	manual: false,
	currentPeriodEnd: null,
};

const initialState = {
	user: null, // Firebase Auth DTO
	profile: null, // users/{uid}
	loadingProfile: false,
	profileError: null,
};

/**
 * Cria/atualiza users/{uid} no Firestore e carrega o profile.
 * Use após onAuthStateChanged quando houver usuário logado.
 */
export const syncUserProfile = createAsyncThunk(
	"user/syncProfile",
	async (authUserDTO, { rejectWithValue }) => {
		try {
			if (!authUserDTO?.uid) return null;
			return await ensureUserProfile(authUserDTO);
		} catch (e) {
			return rejectWithValue(e?.message || "Erro ao sincronizar usuário");
		}
	}
);

/**
 * Recarrega users/{uid}.
 * Útil após editar manualmente no Firebase Console.
 */
export const fetchUserProfile = createAsyncThunk(
	"user/fetchProfile",
	async (uid, { rejectWithValue }) => {
		try {
			if (!uid) return null;
			return await getUserProfile(uid);
		} catch (e) {
			return rejectWithValue(e?.message || "Erro ao buscar perfil do usuário");
		}
	}
);

const userSlice = createSlice({
	name: "user",
	initialState,
	reducers: {
		setUser(state, action) {
			state.user = action.payload;
			if (!action.payload) {
				state.profile = null;
				state.loadingProfile = false;
				state.profileError = null;
			}
		},

		clearUser(state) {
			state.user = null;
			state.profile = null;
			state.loadingProfile = false;
			state.profileError = null;
		},

		setUserProfile(state, action) {
			state.profile = action.payload;
			state.profileError = null;
		},

		setLocalSubscription(state, action) {
			const patch = action.payload || {};

			state.profile = {
				...(state.profile || {}),
				subscription: {
					...(state.profile?.subscription || FREE_SUBSCRIPTION),
					...patch,
				},
			};
		},
	},

	extraReducers: (builder) => {
		builder
			.addCase(syncUserProfile.pending, (state) => {
				state.loadingProfile = true;
				state.profileError = null;
			})
			.addCase(syncUserProfile.fulfilled, (state, action) => {
				state.loadingProfile = false;
				state.profile = action.payload;
			})
			.addCase(syncUserProfile.rejected, (state, action) => {
				state.loadingProfile = false;
				state.profileError =
					action.payload || action.error?.message || "Erro ao sincronizar usuário";
			})

			.addCase(fetchUserProfile.pending, (state) => {
				state.loadingProfile = true;
				state.profileError = null;
			})
			.addCase(fetchUserProfile.fulfilled, (state, action) => {
				state.loadingProfile = false;
				state.profile = action.payload;
			})
			.addCase(fetchUserProfile.rejected, (state, action) => {
				state.loadingProfile = false;
				state.profileError =
					action.payload || action.error?.message || "Erro ao buscar usuário";
			});
	},
});

export const {
	setUser,
	clearUser,
	setUserProfile,
	setLocalSubscription,
} = userSlice.actions;

export default userSlice.reducer;

/* ---------------- Selectors ---------------- */

export const selectUser = (state) => state.user.user;
export const selectUserProfile = (state) => state.user.profile;
export const selectUserProfileLoading = (state) => state.user.loadingProfile;
export const selectUserProfileError = (state) => state.user.profileError;

export const selectUserUid = createSelector(selectUser, (u) => u?.uid || null);

export const selectUserName = createSelector(
	[selectUser, selectUserProfile],
	(authUser, profile) => {
		const u = profile || authUser;
		if (!u) return "Usuário";

		return (
			u.displayName ||
			u.name ||
			u.firstName ||
			u.email ||
			"Usuário"
		);
	}
);

export const selectUserPhoto = createSelector(
	[selectUser, selectUserProfile],
	(authUser, profile) => profile?.photoURL || authUser?.photoURL || null
);

export const selectUserSubscription = createSelector(
	selectUserProfile,
	(profile) => profile?.subscription || FREE_SUBSCRIPTION
);

export function isSubscriptionCurrentlyActive(subscription) {
	if (!subscription) return false;

	const plan = subscription.plan || "free";
	const status = subscription.status || "inactive";

	if (plan === "free") return false;
	if (status !== "active" && status !== "trialing") return false;

	if (!subscription.currentPeriodEnd) return true;

	const end = new Date(subscription.currentPeriodEnd).getTime();

	if (!Number.isFinite(end)) return false;

	return end > Date.now();
}

export const selectHasPremiumAccess = createSelector(
	selectUserSubscription,
	(subscription) => isSubscriptionCurrentlyActive(subscription)
);

export const selectEffectivePlan = createSelector(
	selectUserSubscription,
	(subscription) => {
		if (isSubscriptionCurrentlyActive(subscription)) {
			return subscription.plan || "premium";
		}

		return "free";
	}
);