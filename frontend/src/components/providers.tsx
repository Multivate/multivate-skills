"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { CartProvider } from "@/contexts/cart-context";
import { WishlistProvider } from "@/contexts/wishlist-context";
import { AiGuidanceChat } from "@/components/guidance/AiGuidanceChat";
import { AppearanceProvider } from "@/components/theme/AppearanceMenu";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppearanceProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            {children}
            <AiGuidanceChat />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </AppearanceProvider>
  );
}
