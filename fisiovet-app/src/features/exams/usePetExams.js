// src/features/exams/usePetExams.js
// @ts-nocheck

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    ensureFirebase,
} from "@/firebase/firebase";

export function usePetExams(
    petId
) {
    const [
        items,
        setItems,
    ] = useState([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        error,
        setError,
    ] = useState(null);

    const [
        refreshKey,
        setRefreshKey,
    ] = useState(0);

    useEffect(() => {
        const firebase =
            ensureFirebase();

        const firestore =
            firebase?.firestore;

        const auth =
            firebase?.auth;

        const uid =
            auth?.currentUser?.uid;

        if (
            !firestore ||
            !uid ||
            !petId
        ) {
            setItems([]);
            setLoading(false);
            setError(null);

            return;
        }

        setLoading(true);
        setError(null);

        const collectionRef =
            firestore
                .collection(
                    "users"
                )
                .doc(
                    String(uid)
                )
                .collection(
                    "pets"
                )
                .doc(
                    String(petId)
                )
                .collection(
                    "exams"
                );

        const unsubscribe =
            collectionRef
                .orderBy(
                    "createdAt",
                    "desc"
                )
                .onSnapshot(
                    (
                        snapshot
                    ) => {
                        const rows =
                            snapshot?.docs?.map(
                                (
                                    document
                                ) => ({
                                    id:
                                        document.id,

                                    ...document.data(),
                                })
                            ) || [];

                        setItems(
                            rows
                        );

                        setError(
                            null
                        );

                        setLoading(
                            false
                        );
                    },

                    (
                        snapshotError
                    ) => {
                        console.warn(
                            "usePetExams onSnapshot:",
                            snapshotError
                        );

                        setItems(
                            []
                        );

                        setError(
                            snapshotError
                        );

                        setLoading(
                            false
                        );
                    }
                );

        return () => {
            unsubscribe?.();
        };
    }, [
        petId,
        refreshKey,
    ]);

    const refresh =
        useCallback(() => {
            setRefreshKey(
                (
                    current
                ) =>
                    current + 1
            );
        }, []);

    return {
        items,
        loading,
        error,
        refresh,
    };
}