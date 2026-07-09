"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { CartProvider } from "@/contexts/cart-context";
import { AiGuidanceChat } from "@/components/guidance/AiGuidanceChat";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <AiGuidanceChat />
      </CartProvider>
    </AuthProvider>
  );
}
