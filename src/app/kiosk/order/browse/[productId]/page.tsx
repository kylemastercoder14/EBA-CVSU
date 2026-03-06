"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import {
  ShoppingCart,
  ShoppingBag,
  Minus,
  Plus,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { orpc } from "@/lib/orpc";
import { useCart } from "@/hooks/use-cart";
import { NO_VARIANT_SIZE } from "@/validators/products";

type ProductVariant = { size: string; price: number };

type DetailProduct = {
  id: string;
  image: string;
  name: string;
  category: string;
  variants: ProductVariant[];
  available: boolean;
  preOrder: boolean;
  stockCount: number;
};

const ProductDetailPage = () => {
  const { navigate } = useTransitionNav();
  const params = useParams<{ productId: string }>();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") ?? "student";
  const backendIdFromQuery = searchParams.get("backendId") ?? "";
  const backendId =
    backendIdFromQuery || decodeURIComponent(params.productId ?? "");

  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    undefined,
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCart((state) => state.addItem);
  const cartQty = useCart((state) => state.getItemCount());

  const {
    data: productsData,
    isLoading: isProductsLoading,
    isError: isProductsError,
  } = useQuery(orpc.product.list.queryOptions());
  const { data: stocksData } = useQuery(orpc.stock.list.queryOptions());

  const stockByProductId = useMemo<Map<string, number>>(() => {
    const entries: Array<[string, number]> = (stocksData?.stocks ?? []).map(
      (stock) => [stock.productId, Number(stock.currentStock ?? 0)],
    );
    return new Map<string, number>(entries);
  }, [stocksData]);

  const product = useMemo<DetailProduct | undefined>(() => {
    const source = productsData?.products ?? [];
    const row = source.find((item) => item.id === backendId);
    if (!row) return undefined;

    const stockCount = stockByProductId.get(row.id) ?? 0;
    return {
      id: row.id,
      image: row.image || "",
      name: row.name,
      category: row.category,
      variants: row.variants.map((variant) => ({
        size: variant.size,
        price: Number(variant.price),
      })),
      available: row.isActive && stockCount > 0,
      preOrder: false,
      stockCount,
    };
  }, [backendId, productsData, stockByProductId]);

  const realVariants = useMemo(
    () => product?.variants.filter((variant) => variant.size !== NO_VARIANT_SIZE) ?? [],
    [product],
  );
  const fallbackVariant = useMemo(
    () => product?.variants.find((variant) => variant.size === NO_VARIANT_SIZE),
    [product],
  );
  const hasVariants = realVariants.length > 0;

  const minPrice = useMemo(() => {
    if (hasVariants) return Math.min(...realVariants.map((variant) => variant.price));
    return fallbackVariant?.price ?? 0;
  }, [fallbackVariant?.price, hasVariants, realVariants]);

  const activeSize =
    hasVariants
      ? selectedSize &&
        realVariants.some((variant) => variant.size === selectedSize)
        ? selectedSize
        : realVariants[0].size
      : undefined;
  const activeVariant = useMemo(() => {
    if (!activeSize) return undefined;
    return realVariants.find((variant) => variant.size === activeSize);
  }, [activeSize, realVariants]);
  const activePrice = activeVariant?.price ?? minPrice;
  const canAdd =
    Boolean(product?.available) &&
    (!hasVariants || !!activeSize);

  const handleAddToCart = () => {
    if (!product) return;
    const pickupDate = new Date().toISOString().slice(0, 10);

    addItem({
      productId: product.id,
      productName: product.name,
      variant: hasVariants ? activeSize ?? NO_VARIANT_SIZE : NO_VARIANT_SIZE,
      pickupDate,
      quantity: qty,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (isProductsLoading && !product) {
    return (
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-8">
        <p className="font-serif text-xl italic text-[#07484A]/60">
          Loading product...
        </p>
      </main>
    );
  }

  if (isProductsError && !product) {
    return (
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-8">
        <p className="font-serif text-xl italic text-[#07484A]/60">
          Unable to load product details right now.
        </p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-8">
        <AlertCircle className="size-16 text-[#07484A]/30 mb-4" />
        <p className="font-serif text-xl italic text-[#07484A]/50">
          Product not found.
        </p>
        <button
          onClick={() => navigate(`/kiosk/order/browse?type=${type}`)}
          className="mt-6 rounded-xl border border-white/30 bg-white/20 px-6 py-3 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-[#07484A]"
        >
          Back to Products
        </button>
      </main>
    );
  }

  return (
    <>
      <main className="relative z-10 flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between px-8 pt-6 pb-4 animate-[fadeUp_0.5s_ease_both]">
          <button
            onClick={() => navigate(`/kiosk/order/browse?type=${type}`)}
            className="flex items-center gap-2 rounded-xl border border-white/30 bg-black/50 px-5 py-2.5 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition-all hover:bg-white/35 active:scale-95"
          >
            <ArrowLeft className="size-4" /> Back
          </button>

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

        <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-8">
          <div className="mb-6 overflow-hidden rounded-3xl border border-white/30 bg-white/40 animate-[fadeUp_0.6s_ease_0.1s_both]">
            <div className="relative h-120 w-full">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain p-6"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ShoppingBag className="size-20 text-[#07484A]/15" />
                </div>
              )}
            </div>
          </div>

          <div className="animate-[fadeUp_0.7s_ease_0.2s_both]">
            <div className="mb-2 flex items-center gap-3">
              <span className="font-serif text-xs uppercase tracking-[0.2em] text-[#07484A]/55">
                {product.category}
              </span>
              {!product.available ? (
                <span className="rounded-full bg-red-500 px-2.5 py-0.5 font-serif text-[0.6rem] font-bold uppercase tracking-wider text-white">
                  Out of Stock
                </span>
              ) : (
                <span className="rounded-full bg-green-500 px-2.5 py-0.5 font-serif text-[0.6rem] font-bold uppercase tracking-wider text-white">
                  In Stock
                </span>
              )}
            </div>

            <h1 className="font-serif text-5xl font-extrabold leading-tight tracking-tight text-[#07484A] drop-shadow-[0_2px_12px_rgba(0,0,0,0.1)]">
              {product.name}
            </h1>

            <div className="flex items-center justify-between">
              <p className="mt-2 font-serif text-4xl font-bold text-[#07484A]">
                ₱{activePrice.toFixed(2)}
              </p>

              <p className="font-serif text-base uppercase text-[#07484A]">
                Total stock: {product.stockCount} pc/s
              </p>
            </div>

            <p className="mt-5 font-serif text-lg italic text-[#07484A]/70 leading-relaxed">
              {product.category} item available at the EBA Office. Please ensure
              the correct size and quantity before placing your order.
            </p>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/30" />
              <span className="size-1.5 rounded-full bg-white/50" />
              <div className="h-px flex-1 bg-white/30" />
            </div>

            {hasVariants && (
              <div className="mb-6">
                <span className="font-serif text-sm uppercase tracking-[0.2em] text-[#07484A]/60">
                  Choose Size/Variant
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {realVariants.map((variant) => (
                    <button
                      key={variant.size}
                      onClick={() => setSelectedSize(variant.size)}
                      className={`rounded-full border-2 px-5 py-2 font-serif text-sm font-semibold transition-all duration-150 active:scale-95 ${
                        activeSize === variant.size
                          ? "border-[#07484A] bg-[#07484A] text-white shadow-md"
                          : "border-white/40 bg-white/30 text-[#07484A] hover:bg-white/50"
                      }`}
                    >
                      {variant.size}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!hasVariants && (
              <p className="mb-6 font-serif text-sm italic text-[#07484A]/60">
                No size selection required for this item.
              </p>
            )}

            <div className="mb-8 flex items-center gap-5">
              <span className="font-serif text-sm uppercase tracking-[0.2em] text-[#07484A]/60">
                Quantity
              </span>
              <div className="flex items-center gap-4 rounded-full border border-white/40 bg-white/30 px-2 py-2">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex size-10 items-center justify-center rounded-full bg-white/50 text-[#07484A] hover:bg-white/70 active:scale-90 transition-all"
                >
                  <Minus className="size-5" />
                </button>
                <span className="w-8 text-center font-serif text-2xl font-bold text-[#07484A]">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="flex size-10 items-center justify-center rounded-full bg-white/50 text-[#07484A] hover:bg-white/70 active:scale-90 transition-all"
                >
                  <Plus className="size-5" />
                </button>
              </div>
            </div>

            <Button
              disabled={!canAdd}
              onClick={handleAddToCart}
              className={`h-16 w-full rounded-2xl font-serif text-xl font-bold uppercase tracking-[0.12em] text-white border-0 transition-all duration-300 active:scale-[0.98] disabled:opacity-40 ${
                added
                  ? "bg-emerald-500 shadow-[0_8px_24px_rgba(16,185,129,0.4)]"
                  : "bg-[#07484A] shadow-[0_8px_24px_rgba(7,72,74,0.35)] hover:bg-[#0a5e60]"
              }`}
            >
              <ShoppingCart className="mr-2 size-5" />
              {added
                ? "Added!"
                : product.available
                  ? "Add to Order"
                  : "Unavailable"}
            </Button>
          </div>
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

export default ProductDetailPage;
