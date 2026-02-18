"use client";

import { useEffect, useMemo, useState } from "react";
import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import { ShoppingCart, ShoppingBag, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { type Product, PRODUCTS } from "@/lib/product";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/orpc";
import { useCart } from "@/hooks/use-cart";

type UserType = "student" | "visitor";
type DisplayProduct = Product & { stockCount?: number; backendId: string };
const kioskUserTypeStorageKey = "kiosk-user-type";
const kioskSignInStorageKey = "kiosk-sign-in";
const kioskAutoRefreshMs = 10_000;

// ── Product Card ──────────────────────────────────────────────────────────────
const ProductCard = ({
  product,
  onClick,
}: {
  product: DisplayProduct;
  onClick: () => void;
}) => {
  const isUnavailableOnly = !product.available && !product.preOrder;

  return (
    <button
      onClick={onClick}
      disabled={isUnavailableOnly}
      className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-white/30 bg-white/25 backdrop-blur-sm shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-200 hover:bg-white/40 hover:shadow-[0_8px_28px_rgba(0,0,0,0.15)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed text-left"
    >
      {/* Unavailable badge */}
      {!product.available ? (
        <span className="absolute top-2.5 right-2.5 z-10 rounded-full bg-red-500 px-2.5 py-0.5 font-serif text-[0.6rem] font-bold uppercase tracking-wider text-white shadow">
          Out of Stock
        </span>
      ) : (
        <span className="absolute top-2.5 right-2.5 z-10 rounded-full bg-green-500 px-2.5 py-0.5 font-serif text-[0.6rem] font-bold uppercase tracking-wider text-white shadow">
          In stock
        </span>
      )}

      {/* Image */}
      <div className="relative h-65 w-full overflow-hidden bg-white/40">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill className="object-contain p-3" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ShoppingBag className="size-12 text-[#07484A]/20" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5 p-3">
        <span className="font-serif text-[0.65rem] uppercase tracking-[0.15em] text-[#07484A]/55">
          {product.category}
        </span>
        <span className="font-serif text-sm font-bold leading-tight text-[#07484A]">
          {product.name}
        </span>
        <span className="mt-1 font-serif text-sm font-semibold text-[#07484A]/80">
          ₱{product.price.toFixed(2)}
        </span>
        {product.preOrder ? (
          <span className="mt-1.5 rounded-lg bg-[#07484A] py-3 text-center font-serif text-[0.6rem] font-bold uppercase tracking-wider text-white">
            Pre-Order Available
          </span>
        ) : (
          <span className="mt-1.5 rounded-lg bg-[#07484A] py-3 text-center font-serif text-[0.6rem] font-bold uppercase tracking-wider text-white">
            Order Now
          </span>
        )}
      </div>
    </button>
  );
};

// ── Browse Page ───────────────────────────────────────────────────────────────
const BrowsePage = () => {
  const { navigate } = useTransitionNav();
  const [type] = useState<UserType>(() => {
    if (typeof window === "undefined") return "student";

    const fromQuery = new URLSearchParams(window.location.search).get("type");
    if (fromQuery === "visitor") return "visitor";
    if (fromQuery === "student") return "student";

    const fromStorage =
      localStorage.getItem(kioskUserTypeStorageKey) ??
      sessionStorage.getItem(kioskUserTypeStorageKey);
    return fromStorage === "visitor" ? "visitor" : "student";
  });
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    ...orpc.product.list.queryOptions(),
    refetchInterval: kioskAutoRefreshMs,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  const { data: stocksData } = useQuery({
    ...orpc.stock.list.queryOptions(),
    refetchInterval: kioskAutoRefreshMs,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
  useEffect(() => {
    sessionStorage.setItem(kioskUserTypeStorageKey, type);
    localStorage.setItem(kioskUserTypeStorageKey, type);

    const rawSignIn = localStorage.getItem(kioskSignInStorageKey);
    if (!rawSignIn) return;

    try {
      const signIn = JSON.parse(rawSignIn) as Record<string, unknown>;
      localStorage.setItem(
        kioskSignInStorageKey,
        JSON.stringify({
          ...signIn,
          userType: type,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Ignore malformed local storage payload.
    }
  }, [type]);

  const cartQty = useCart((state) => state.getItemCount());

  const stockByProductId = useMemo<Map<string, number>>(() => {
    const entries: Array<[string, number]> = (stocksData?.stocks ?? []).map(
      (stock) => [stock.productId, Number(stock.currentStock ?? 0)],
    );
    return new Map<string, number>(entries);
  }, [stocksData]);

  const backendProducts = useMemo<DisplayProduct[]>(() => {
    const rows = productsData?.products ?? [];
    const staticIdByNameCategory = new Map(
      PRODUCTS.map((p) => [`${p.name.toLowerCase()}::${p.category.toLowerCase()}`, p.id]),
    );

    return rows
      .filter((product) => product.isActive)
      .map((product) => {
        const stock = stockByProductId.get(product.id) ?? 0;
        const minPrice =
          product.variants.length > 0
            ? Math.min(...product.variants.map((variant) => variant.price))
            : 0;

        const staticId =
          staticIdByNameCategory.get(
            `${product.name.toLowerCase()}::${product.category.toLowerCase()}`,
          ) ?? product.id;

        return {
          id: staticId,
          backendId: product.id,
          name: product.name,
          category: product.category,
          price: minPrice,
          image: product.image || "",
          visitorAccess: product.isVisitorOrderable,
          available: stock > 0,
          preOrder: stock <= 0,
          stockCount: stock,
          sizes: product.variants.map((variant) => variant.size),
        };
      });
  }, [productsData, stockByProductId]);

  const productsSource: DisplayProduct[] =
    backendProducts.length > 0
      ? backendProducts
      : PRODUCTS.map((product) => ({ ...product, backendId: product.id }));
  const products =
    type === "visitor"
      ? productsSource.filter((p) => p.visitorAccess)
      : productsSource;

  return (
    <>

      <main className="relative z-10 flex h-full flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-8 pt-6 pb-4 animate-[fadeUp_0.5s_ease_both]">
          {/* Back */}
          <button
            onClick={() => navigate("/kiosk/order")}
            className="flex items-center gap-2 rounded-xl border border-white/30 bg-black/50 px-5 py-2.5 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition-all hover:bg-white/35 active:scale-95"
          >
            <ArrowLeft className="size-4" /> Back
          </button>

          {/* Cart icon */}
          <button
            onClick={() => navigate("/kiosk/order/cart")}
            className="relative flex size-11 items-center justify-center rounded-full border border-white/30 bg-black/50 backdrop-blur-sm hover:bg-white/40 transition-all active:scale-95"
          >
            <ShoppingCart className="size-5 text-white" />
            {cartQty > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 font-serif text-[0.6rem] font-bold text-white shadow">
                {cartQty}
              </span>
            )}
          </button>
        </div>

        {/* ── Title ── */}
        <div className="px-8 pb-4 animate-[fadeUp_0.6s_ease_0.1s_both]">
          <h1 className="font-serif text-4xl font-extrabold tracking-tight text-[#07484A] drop-shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
            Select a Product
          </h1>
          {type === "visitor" && (
            <p className="mt-1 font-serif text-sm italic text-[#07484A]/55">
              Showing items available for visitors
            </p>
          )}
        </div>

        {/* ── Product grid ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-8 animate-[fadeUp_0.7s_ease_0.2s_both]">
          {isProductsLoading && (
            <p className="mb-3 font-serif text-sm italic text-[#07484A]/55">
              Loading products...
            </p>
          )}
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  // Navigate to the dedicated product detail page
                  onClick={() =>
                    navigate(
                      `/kiosk/order/browse/${p.id}?type=${type}&backendId=${encodeURIComponent(
                        p.backendId,
                      )}`,
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <div className="mt-24 flex flex-col items-center gap-3 text-center">
              <ShoppingBag className="size-16 text-[#07484A]/20" />
              <p className="font-serif text-lg italic text-[#07484A]/40">
                No products available
              </p>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default BrowsePage;
