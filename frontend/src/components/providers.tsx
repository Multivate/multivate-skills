"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { CartProvider } from "@/contexts/cart-context";
import { VisitorGeoProvider } from "@/contexts/visitor-geo-context";
import { WishlistProvider } from "@/contexts/wishlist-context";
import { AiGuidanceChat } from "@/components/guidance/AiGuidanceChat";
import { GeoAudienceBanner } from "@/components/geo/GeoAudienceBanner";
import { AppearanceProvider } from "@/components/theme/AppearanceMenu";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppearanceProvider>
      <VisitorGeoProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <GeoAudienceBanner />
              {children}
              <AiGuidanceChat />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </VisitorGeoProvider>
    </AppearanceProvider>
  );
}
