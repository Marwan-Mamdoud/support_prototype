"use client";
import { createContext, useContext, useState } from "react";

const Ctx = createContext<{ brandPreview: boolean; setBrandPreview: (v: boolean) => void }>({ brandPreview: false, setBrandPreview: () => {} });

export function BrandPreviewProvider({ children }: { children: React.ReactNode }) {
  const [brandPreview, setBrandPreview] = useState(false);
  return <Ctx.Provider value={{ brandPreview, setBrandPreview }}>{children}</Ctx.Provider>;
}

export function useBrandPreview() {
  return useContext(Ctx);
}
