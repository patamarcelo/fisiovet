// firebase/firebase.js
// Compat layer: mantém a API antiga do app, mas usa Firebase Web SDK.

import { app, auth, db, storage } from "@/src/services/firebaseClient";

import {
	collection,
	doc,
	getDoc,
	getDocs,
	setDoc,
	addDoc,
	updateDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	limit,
	startAfter,
	serverTimestamp,
	deleteField,
	arrayUnion,
	arrayRemove,
	increment,
	writeBatch,
	onSnapshot
} from "firebase/firestore";

import {
	ref as storageRef,
	getDownloadURL,
	deleteObject,
	uploadBytes,
	uploadBytesResumable,
} from "firebase/storage";

/* ---------------- helpers ---------------- */

function normalizePathParts(parts) {
	return parts
		.flatMap((p) => String(p).split("/"))
		.map((p) => p.trim())
		.filter(Boolean);
}

function unwrapRef(ref) {
	return ref?.ref || ref;
}

function wrapDocSnap(snap) {
	return {
		id: snap.id,
		ref: new DocRefCompat(snap.ref),
		exists: snap.exists(),
		data: () => snap.data(),
	};
}

function wrapQuerySnap(snap) {
	const docs = snap.docs.map(wrapDocSnap);

	return {
		empty: snap.empty,
		size: snap.size,
		docs,
		forEach: (callback) => docs.forEach(callback),
	};
}

/* ---------------- Firestore compat ---------------- */

class DocRefCompat {
	constructor(ref) {
		this.ref = ref;
		this.id = ref.id;
		this.path = ref.path;
	}

	collection(name) {
		return new CollectionRefCompat(collection(this.ref, String(name)));
	}

	async get() {
		const snap = await getDoc(this.ref);
		return wrapDocSnap(snap);
	}

	async set(data, options) {
		if (options) return setDoc(this.ref, data, options);
		return setDoc(this.ref, data);
	}

	async update(data) {
		return updateDoc(this.ref, data);
	}

	async delete() {
		return deleteDoc(this.ref);
	}
	onSnapshot(nextOrObserver, error, complete) {
		return onSnapshot(
			this.ref,
			(snap) => {
				const wrapped = wrapDocSnap(snap);

				if (typeof nextOrObserver === "function") {
					nextOrObserver(wrapped);
					return;
				}

				if (nextOrObserver?.next) {
					nextOrObserver.next(wrapped);
				}
			},
			error,
			complete
		);
	}
}

class QueryCompat {
	constructor(baseRef, constraints = []) {
		this.baseRef = baseRef;
		this.constraints = constraints;
	}

	_buildQuery() {
		return this.constraints.length
			? query(this.baseRef, ...this.constraints)
			: this.baseRef;
	}

	where(fieldPath, opStr, value) {
		return new QueryCompat(this.baseRef, [
			...this.constraints,
			where(fieldPath, opStr, value),
		]);
	}

	orderBy(fieldPath, directionStr) {
		return new QueryCompat(this.baseRef, [
			...this.constraints,
			orderBy(fieldPath, directionStr),
		]);
	}

	limit(n) {
		return new QueryCompat(this.baseRef, [
			...this.constraints,
			limit(n),
		]);
	}

	startAfter(docSnap) {
		const raw = docSnap?.ref?.ref || docSnap?.ref || docSnap;

		return new QueryCompat(this.baseRef, [
			...this.constraints,
			startAfter(raw),
		]);
	}

	async get() {
		const snap = await getDocs(this._buildQuery());
		return wrapQuerySnap(snap);
	}

	onSnapshot(nextOrObserver, error, complete) {
		return onSnapshot(
			this._buildQuery(),
			(snap) => {
				const wrapped = wrapQuerySnap(snap);

				if (typeof nextOrObserver === "function") {
					nextOrObserver(wrapped);
					return;
				}

				if (nextOrObserver?.next) {
					nextOrObserver.next(wrapped);
				}
			},
			error,
			complete
		);
	}
}

class CollectionRefCompat extends QueryCompat {
	constructor(ref) {
		super(ref, []);
		this.ref = ref;
		this.id = ref.id;
		this.path = ref.path;
	}

	doc(id) {
		if (id == null) {
			return new DocRefCompat(doc(this.ref));
		}

		return new DocRefCompat(doc(this.ref, String(id)));
	}

	async add(data) {
		const createdRef = await addDoc(this.ref, data);
		return new DocRefCompat(createdRef);
	}
}

const firestore = {
	collection: (...parts) => {
		const pathParts = normalizePathParts(parts);
		return new CollectionRefCompat(collection(db, ...pathParts));
	},

	doc: (...parts) => {
		const pathParts = normalizePathParts(parts);
		return new DocRefCompat(doc(db, ...pathParts));
	},

	batch: () => {
		const rawBatch = writeBatch(db);

		return {
			set: (ref, data, options) => {
				if (options) return rawBatch.set(unwrapRef(ref), data, options);
				return rawBatch.set(unwrapRef(ref), data);
			},

			update: (ref, data) => rawBatch.update(unwrapRef(ref), data),

			delete: (ref) => rawBatch.delete(unwrapRef(ref)),

			commit: () => rawBatch.commit(),
		};
	},
};

/* ---------------- Firestore module compat ---------------- */

function firestoreModule() {
	return firestore;
}

firestoreModule.FieldValue = {
	serverTimestamp,
	delete: deleteField,
	deleteField,
	arrayUnion,
	arrayRemove,
	increment,
};

firestoreModule.Timestamp = {
	now: () => new Date(),
};

/* ---------------- Storage compat ---------------- */

class StorageRefCompat {
	constructor(path) {
		this.path = path;
		this.ref = storageRef(storage, String(path));
	}

	async getDownloadURL() {
		return getDownloadURL(this.ref);
	}

	async delete() {
		return deleteObject(this.ref);
	}

	async putFile(uri, metadata = {}) {
		const response = await fetch(uri);
		const blob = await response.blob();

		return uploadBytes(this.ref, blob, {
			contentType: metadata?.contentType || "application/octet-stream",
			customMetadata: metadata?.customMetadata,
		});
	}

	async putFileResumable(uri, metadata = {}) {
		const response = await fetch(uri);
		const blob = await response.blob();

		return uploadBytesResumable(this.ref, blob, {
			contentType: metadata?.contentType || "application/octet-stream",
			customMetadata: metadata?.customMetadata,
		});
	}
}

const storageInstance = {
	ref: (path) => new StorageRefCompat(path),
};

/* ---------------- Public API antiga ---------------- */

export function ensureFirebase() {
	return {
		app,
		auth,
		firestore,
		storageInstance,
		firestoreModule,
	};
}

export {
	app,
	auth,
	firestore,
	storageInstance,
	firestoreModule,
};

export default {
	app,
	auth,
	firestore,
	storageInstance,
	firestoreModule,
	ensureFirebase,
};