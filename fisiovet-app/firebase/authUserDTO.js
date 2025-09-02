// authUserDTO.js
export function mapFirebaseUserToDTO(u) {
	if (!u) return null;
	return {
		uid: u.uid,
		email: u.email ?? null,
		displayName: u.displayName ?? null,
		photoURL: u.photoURL ?? null,
		emailVerified: !!u.emailVerified,
		isAnonymous: !!u.isAnonymous,
		// Metadados como strings ou números simples
		creationTime: u.metadata?.creationTime ?? null,
		lastSignInTime: u.metadata?.lastSignInTime ?? null,
		// Nunca guarde refreshToken no Redux!
		// providerIds úteis (apenas strings)
		providers: Array.isArray(u.providerData)
			? u.providerData.map((p) => p?.providerId).filter(Boolean)
			: []
	};
}
