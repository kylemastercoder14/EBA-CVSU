"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const CART_STORAGE_KEY = "eba_kiosk_student_cart";

export type CartItem = {
  productId: string;
  productName: string;
  variant: string;
  pickupDate: string;
  quantity: number;
};

type CartItemIdentity = Pick<CartItem, "productId" | "variant" | "pickupDate">;
type AddCartItemInput = CartItem;

type CartState = {
  items: CartItem[];
  addItem: (item: AddCartItemInput) => void;
  updateItemQuantity: (item: CartItemIdentity, quantity: number) => void;
  removeItem: (item: CartItemIdentity) => void;
  clearCart: () => void;
  getItemCount: () => number;
};

const isSameCartLine = (a: CartItemIdentity, b: CartItemIdentity) =>
  a.productId === b.productId &&
  a.variant === b.variant &&
  a.pickupDate === b.pickupDate;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((cartItem) =>
            isSameCartLine(cartItem, item),
          );

          if (!existingItem) {
            return {
              items: [...state.items, item],
            };
          }

          return {
            items: state.items.map((cartItem) =>
              isSameCartLine(cartItem, item)
                ? {
                    ...cartItem,
                    quantity: Math.min(99, cartItem.quantity + item.quantity),
                  }
                : cartItem,
            ),
          };
        });
      },
      updateItemQuantity: (item, quantity) => {
        if (quantity <= 0) {
          set((state) => ({
            items: state.items.filter(
              (cartItem) => !isSameCartLine(cartItem, item),
            ),
          }));
          return;
        }

        set((state) => ({
          items: state.items.map((cartItem) =>
            isSameCartLine(cartItem, item)
              ? { ...cartItem, quantity: Math.min(99, quantity) }
              : cartItem,
          ),
        }));
      },
      removeItem: (item) => {
        set((state) => ({
          items: state.items.filter(
            (cartItem) => !isSameCartLine(cartItem, item),
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      // Badge/indicator count should reflect distinct cart lines, not summed quantity.
      getItemCount: () => get().items.length,
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
