// src/features/avaliacoes/usePetAvaliacoes.js
// @ts-nocheck

import {
  useCallback,
  useEffect,
  useMemo,
} from "react";

import {
  useDispatch,
  useSelector,
} from "react-redux";

import {
  loadAvaliacoes,
  refreshAvaliacoesRemote,
  selectAvaliacoesByPetId,
  selectAvaliacoesErrorByPetId,
  selectAvaliacoesRefreshingByPetId,
  selectAvaliacoesStatusByPetId,
} from "@/src/store/slices/avaliacaoSlice";

export function usePetAvaliacoes(
  petId
) {
  const dispatch =
    useDispatch();

  const safePetId =
    petId != null
      ? String(petId)
      : "";

  const itemsSelector =
    useMemo(
      () =>
        selectAvaliacoesByPetId(
          safePetId
        ),
      [safePetId]
    );

  const statusSelector =
    useMemo(
      () =>
        selectAvaliacoesStatusByPetId(
          safePetId
        ),
      [safePetId]
    );

  const refreshingSelector =
    useMemo(
      () =>
        selectAvaliacoesRefreshingByPetId(
          safePetId
        ),
      [safePetId]
    );

  const errorSelector =
    useMemo(
      () =>
        selectAvaliacoesErrorByPetId(
          safePetId
        ),
      [safePetId]
    );

  const items =
    useSelector(
      itemsSelector
    );

  const status =
    useSelector(
      statusSelector
    );

  const refreshing =
    useSelector(
      refreshingSelector
    );

  const error =
    useSelector(
      errorSelector
    );

  useEffect(() => {
    if (!safePetId) {
      return;
    }

    void dispatch(
      loadAvaliacoes({
        petId:
          safePetId,
      })
    );
  }, [
    dispatch,
    safePetId,
  ]);

  const refresh =
    useCallback(
      async () => {
        if (!safePetId) {
          return;
        }

        await dispatch(
          refreshAvaliacoesRemote({
            petId:
              safePetId,
          })
        ).unwrap();
      },
      [
        dispatch,
        safePetId,
      ]
    );

  const isInitialLoading =
    items.length === 0 &&
    (
      status === "idle" ||
      status === "loading"
    );

  return {
    items,
    loading:
      isInitialLoading,
    refreshing,
    error,
    refresh,
  };
}
