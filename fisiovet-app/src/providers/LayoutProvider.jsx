import React, { createContext, useContext, useMemo } from "react";
import { useLayoutVariant } from "@/hooks/useLayoutVariant";

const LayoutCtx = createContext({ variant: "phone" });

export function LayoutProvider({ children }) {
    const variant = useLayoutVariant();
    const value = useMemo(() => ({ variant }), [variant]);
    return <LayoutCtx.Provider value={value}>{children}</LayoutCtx.Provider>;
}

export function useLayout() {
    return useContext(LayoutCtx);
}