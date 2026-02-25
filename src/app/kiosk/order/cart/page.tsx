"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  EditIcon,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { orpc } from "@/lib/orpc";
import { type CartItem as StoreCartItem, useCart } from "@/hooks/use-cart";

type CartItemResolved = StoreCartItem & {
  image: string;
  unitPrice: number;
};

const TERMS = [
  {
    title: "1. Order Placement",
    body: "By submitting an order through our website, you confirm that all information provided is accurate and complete.",
  },
  {
    title: "2. Payment Terms",
    body: "Payment must be completed at the time of order placement. We accept GCash and Cash payments.",
  },
  {
    title: "3. Pickup Schedule",
    body: "Orders must be claimed at the EBA office during official operating hours on the selected date.",
  },
  {
    title: "4. Returns and Exchanges",
    body: "Returns and exchanges are accepted within seven (7) days from pickup for valid cases.",
  },
  {
    title: "5. Contact Information",
    body: "For inquiries regarding kiosk orders, please contact the EBA office during official operating hours.",
  },
];

const TermsDialog = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => (
  <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="max-h-[80dvh]! w-[88vw] max-w-3xl! flex flex-col gap-0 overflow-hidden rounded-3xl border border-white/25 bg-linear-to-b from-[#cce5f5] to-[#a8d0ee] p-0 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
      <DialogHeader className="flex-row items-center justify-between border-b border-[#07484A]/25 px-6 py-5">
        <DialogTitle className="font-serif text-2xl font-extrabold tracking-tight text-[#07484A]">
          Terms and Conditions
        </DialogTitle>
      </DialogHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 no-scrollbar">
        <p className="font-serif text-3xl font-bold text-[#07484A]">
          EBA Uniform Ordering Terms and Conditions
        </p>
        {TERMS.map(({ title, body }) => (
          <div key={title}>
            <p className="mb-1 font-serif text-2xl font-bold text-[#07484A]">{title}</p>
            <p className="font-serif text-lg leading-relaxed text-[#07484A]/70">{body}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-white/25 px-6 py-4">
        <button
          onClick={onClose}
          className="h-13 w-full rounded-2xl bg-[#07484A] font-serif text-base font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_24px_rgba(7,72,74,0.3)] transition-all hover:bg-[#0a5e60] active:scale-[0.98]"
        >
          Close
        </button>
      </div>
    </DialogContent>
  </Dialog>
);

const CartRow = ({
  item,
  onEdit,
  onRemove,
}: {
  item: CartItemResolved;
  onEdit: () => void;
  onRemove: () => void;
}) => (
  <div className="flex gap-4 rounded-2xl border border-white/30 bg-white/25 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-sm animate-[fadeUp_0.6s_ease_both]">
    <div className="relative size-50 shrink-0 overflow-hidden rounded-xl bg-white/50">
      {item.image ? (
        <Image src={item.image} alt={item.productName} fill className="object-contain p-1.5" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <ShoppingBag className="size-8 text-[#07484A]/20" />
        </div>
      )}
    </div>

    <div className="flex flex-1 flex-col justify-between">
      <div>
        <p className="font-serif text-3xl font-bold leading-tight text-[#07484A]">{item.productName}</p>
        <p className="mt-0.5 font-serif text-lg text-[#07484A]/60">Size: {item.variant}</p>
        <p className="font-serif text-lg text-[#07484A]/60">Quantity: {item.quantity}</p>
        <p className="font-serif text-lg text-[#07484A]/60">Pickup: {item.pickupDate}</p>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-lg border border-[#07484A]/30 bg-white/40 px-3 py-2 font-serif text-base font-semibold uppercase tracking-[0.12em] text-[#07484A] transition-all hover:bg-white/60 active:scale-95"
        >
          <EditIcon className="size-5" />
          Edit
        </button>
        <button
          onClick={onRemove}
          className="flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-400/15 px-3 py-2 font-serif text-base font-semibold uppercase tracking-[0.12em] text-red-600 transition-all hover:bg-red-400/25 active:scale-95"
        >
          <Trash2 className="size-5" />
          Remove
        </button>
      </div>
    </div>

    <div className="shrink-0 text-right">
      <p className="font-serif text-4xl font-bold text-[#07484A]">
        ₱{(item.unitPrice * item.quantity).toLocaleString()}
      </p>
    </div>
  </div>
);

const EditQuantityDialog = ({
  open,
  item,
  quantity,
  onClose,
  onDecrease,
  onIncrease,
  onSave,
}: {
  open: boolean;
  item: CartItemResolved | null;
  quantity: number;
  onClose: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onSave: () => void;
}) => (
  <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
    <DialogContent className="w-[88vw]! max-w-lg! overflow-hidden rounded-3xl border border-white/30 bg-linear-to-b from-[#cce5f5] to-[#a8d0ee] p-0 shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
      <DialogHeader className="border-b border-[#07484A]/20 px-6 py-5">
        <DialogTitle className="font-serif text-2xl font-extrabold tracking-tight text-[#07484A]">
          Edit Quantity
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-5 px-6 py-5">
        <div className="rounded-2xl border border-white/40 bg-white/35 p-4 shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
          <p className="font-serif text-2xl font-bold leading-tight text-[#07484A]">
            {item?.productName ?? "-"}
          </p>
          <p className="mt-1 font-serif text-base text-[#07484A]/65">
            Size: {item?.variant ?? "-"}
          </p>
          <p className="font-serif text-base text-[#07484A]/65">
            Pickup: {item?.pickupDate ?? "-"}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/40 bg-white/30 p-5">
          <span className="font-serif text-sm uppercase tracking-[0.22em] text-[#07484A]/60">
            Quantity
          </span>
          <div className="flex items-center gap-4 rounded-full border border-white/50 bg-white/40 px-2 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
            <button
              type="button"
              onClick={onDecrease}
              disabled={quantity <= 1}
              className="flex size-11 items-center justify-center rounded-full bg-white/60 text-[#07484A] transition-all hover:bg-white/80 active:scale-90 disabled:opacity-35 disabled:hover:bg-white/60"
            >
              <Minus className="size-5" />
            </button>
            <span className="w-10 text-center font-serif text-3xl font-bold text-[#07484A]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={onIncrease}
              disabled={quantity >= 99}
              className="flex size-11 items-center justify-center rounded-full bg-white/60 text-[#07484A] transition-all hover:bg-white/80 active:scale-90 disabled:opacity-35 disabled:hover:bg-white/60"
            >
              <Plus className="size-5" />
            </button>
          </div>
          <p className="font-serif text-sm italic text-[#07484A]/55">
            Maximum quantity per item is 99.
          </p>
        </div>
      </div>

      <div className="flex gap-3 border-t border-white/25 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="h-13 flex-1 rounded-2xl border-2 border-white/50 bg-white/35 font-serif text-sm font-semibold uppercase tracking-[0.14em] text-[#07484A] transition-all hover:bg-white/55 active:scale-[0.98]"
        >
          Cancel
        </button>
        <Button
          type="button"
          onClick={onSave}
          className="h-13 flex-1 rounded-2xl border-0 bg-[#07484A] font-serif text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_8px_24px_rgba(7,72,74,0.3)] transition-all hover:bg-[#0a5e60] active:scale-[0.98]"
        >
          Update
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

const CartPage = () => {
  const { navigate } = useTransitionNav();
  const cartItems = useCart((state) => state.items);
  const removeItem = useCart((state) => state.removeItem);
  const clearCart = useCart((state) => state.clearCart);
  const updateItemQuantity = useCart((state) => state.updateItemQuantity);
  const [accepted, setAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItemResolved | null>(null);
  const [editingQuantity, setEditingQuantity] = useState(1);

  const { data: productsData } = useQuery(orpc.product.list.queryOptions());

  const resolvedItems = useMemo<CartItemResolved[]>(() => {
    const products = productsData?.products ?? [];
    return cartItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const variantPrice = product?.variants.find((v) => v.size === item.variant)?.price;
      const minPrice =
        product && product.variants.length > 0
          ? Math.min(...product.variants.map((variant) => variant.price))
          : 0;

      return {
        ...item,
        image: product?.image || "",
        unitPrice: Number(variantPrice ?? minPrice ?? 0),
      };
    });
  }, [cartItems, productsData]);

  const type =
    typeof window !== "undefined"
      ? (sessionStorage.getItem("kiosk-user-type") ?? "student")
      : "student";

  const total = resolvedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const canProceed = resolvedItems.length > 0 && accepted;

  const openEditDialog = (item: CartItemResolved) => {
    setEditingItem(item);
    setEditingQuantity(item.quantity);
  };

  const closeEditDialog = () => {
    setEditingItem(null);
    setEditingQuantity(1);
  };

  const saveEditedQuantity = () => {
    if (!editingItem) return;
    updateItemQuantity(
      {
        productId: editingItem.productId,
        variant: editingItem.variant,
        pickupDate: editingItem.pickupDate,
      },
      editingQuantity,
    );
    closeEditDialog();
  };

  const handleRemoveAllItems = () => {
    clearCart();
    setAccepted(false);
    closeEditDialog();
  };

  return (
    <>
      <main className="relative z-10 flex h-full flex-col overflow-hidden">
        <div className="flex items-center px-8 pt-6 pb-2">
          <button
            onClick={() => navigate(`/kiosk/order/browse?type=${type}`)}
            className="flex items-center gap-2 rounded-xl border border-white/30 bg-black/50 px-5 py-2.5 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition-all hover:bg-white/35 active:scale-95 animate-[fadeUp_0.5s_ease_both]"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
        </div>

        <div className="px-8 pt-6 pb-4 animate-[fadeUp_0.6s_ease_0.1s_both]">
          <h1 className="font-serif text-5xl font-extrabold tracking-tight text-[#07484A] drop-shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
            Order Summary
          </h1>
        </div>

        <div className="mt-7 flex-1 space-y-4 overflow-y-auto px-8 pb-4 no-scrollbar">
          {resolvedItems.length > 0 ? (
            resolvedItems.map((item) => (
              <CartRow
                key={`${item.productId}-${item.variant}-${item.pickupDate}`}
                item={item}
                onEdit={() => openEditDialog(item)}
                onRemove={() =>
                  removeItem({
                    productId: item.productId,
                    variant: item.variant,
                    pickupDate: item.pickupDate,
                  })
                }
              />
            ))
          ) : (
            <div className="mt-20 flex flex-col items-center gap-4 text-center animate-[fadeUp_0.7s_ease_both]">
              <ShoppingCart className="size-16 text-[#07484A]/20" />
              <p className="font-serif text-lg italic text-[#07484A]/40">Your cart is empty</p>
              <button
                onClick={() => navigate(`/kiosk/order/browse?type=${type}`)}
                className="mt-2 rounded-xl border border-white/30 bg-white/25 px-6 py-3 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-[#07484A] backdrop-blur-sm transition-all hover:bg-white/40 active:scale-95"
              >
                Browse Products
              </button>
            </div>
          )}
        </div>

        {resolvedItems.length > 0 && (
          <div className="space-y-4 border-t border-white/20 bg-white/10 px-8 pt-4 pb-6 backdrop-blur-sm animate-[fadeUp_0.6s_ease_both]">
            <div className="flex items-center justify-between">
              <span className="font-serif text-3xl font-bold text-[#07484A]">Total:</span>
              <span className="font-serif text-3xl font-extrabold text-[#07484A]">₱{total.toLocaleString()}</span>
            </div>

            <div className="flex w-full items-center gap-3">
              <button
                onClick={() => setAccepted((v) => !v)}
                className={`flex size-7 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150 active:scale-90 ${
                  accepted ? "border-emerald-500 bg-emerald-500" : "border-white/50 bg-white/20"
                }`}
              >
                {accepted && <Check className="size-3.5 text-white" />}
              </button>
              <span className="font-serif text-lg italic leading-snug text-[#07484A]/70">
                I accept the{" "}
                <button
                  onClick={() => setTermsOpen(true)}
                  className="font-semibold not-italic text-[#07484A] underline underline-offset-2 transition-colors hover:text-[#07484A]/70"
                >
                  terms and conditions
                </button>
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRemoveAllItems}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-red-300/50 bg-red-400/15 px-4 font-serif text-sm font-bold uppercase tracking-[0.12em] text-red-700 backdrop-blur-sm transition-all hover:bg-red-400/25 active:scale-[0.98]"
              >
                <Trash2 className="size-5" />
                Remove All
              </button>

              <button
                onClick={() => navigate(`/kiosk/order/browse?type=${type}`)}
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-white/40 bg-white/30 font-serif text-base font-semibold uppercase text-[#07484A] backdrop-blur-sm transition-all hover:bg-white/45 active:scale-[0.98]"
              >
                <ShoppingBag className="size-5" />
                Continue Shopping
              </button>

              <Button
                disabled={!canProceed}
                onClick={() => navigate("/kiosk/order/payment")}
                className="h-14 flex-1 rounded-2xl border-0 bg-emerald-500 font-serif text-base font-bold uppercase text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
              >
                Proceed
              </Button>
            </div>
          </div>
        )}
      </main>

      <EditQuantityDialog
        open={Boolean(editingItem)}
        item={editingItem}
        quantity={editingQuantity}
        onClose={closeEditDialog}
        onDecrease={() => setEditingQuantity((qty) => Math.max(1, qty - 1))}
        onIncrease={() => setEditingQuantity((qty) => Math.min(99, qty + 1))}
        onSave={saveEditedQuantity}
      />
      <TermsDialog open={termsOpen} onClose={() => setTermsOpen(false)} />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default CartPage;
