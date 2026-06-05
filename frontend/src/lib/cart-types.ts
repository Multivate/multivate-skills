export type CartSource = "live";

export type CartLine = {
  slug: string;
  title: string;
  image: string;
  priceLabel?: string | null;
  source: CartSource;
};

export const CART_STORAGE_KEY = "multivate_cart_v2";
