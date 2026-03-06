"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
} from "lucide-react";

import { useCart } from "@/hooks/use-cart";
import { orpc } from "@/lib/orpc";
import { NO_VARIANT_SIZE } from "@/validators/products";

type ProductVariant = {
  size: string;
  price: number;
};

type ProductItem = {
  id: string;
  image: string;
  name: string;
  category: string;
  isActive: boolean;
  isVisitorOrderable: boolean;
  variants: ProductVariant[];
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);

const normalizeCategory = (category: string) => {
  if (!category) return "Others";
  return category
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const Page = () => {
  const params = useParams<{ productId: string }>();
  const productId = decodeURIComponent(params.productId ?? "");

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [pickupDate, setPickupDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((state) => state.addItem);
  const getItemCount = useCart((state) => state.getItemCount);

  const { data, isLoading, isError } = useQuery(orpc.product.list.queryOptions());
  const { data: stockData } = useQuery(orpc.stock.list.queryOptions());

  const products = data?.products ?? [];
  const product = products.find((item) => item.id === productId) as
    | ProductItem
    | undefined;

  const stockByProductId = useMemo<Map<string, number>>(() => {
    const entries: Array<[string, number]> = (stockData?.stocks ?? []).map(
      (stock) => [stock.productId, Number(stock.currentStock ?? 0)],
    );
    return new Map<string, number>(entries);
  }, [stockData]);

  const currentStock = product ? (stockByProductId.get(product.id) ?? 0) : 0;
  const realVariants = useMemo(
    () =>
      product?.variants.filter((variant) => variant.size !== NO_VARIANT_SIZE) ??
      [],
    [product],
  );
  const fallbackVariant = useMemo(
    () => product?.variants.find((variant) => variant.size === NO_VARIANT_SIZE),
    [product],
  );
  const hasVariants = realVariants.length > 0;

  const activeSize = hasVariants ? selectedSize ?? realVariants[0]?.size ?? "" : "";
  const selectedVariant = useMemo(() => {
    if (!activeSize) return undefined;
    return realVariants.find((variant) => variant.size === activeSize);
  }, [activeSize, realVariants]);

  const isOrderable = Boolean(product?.isActive);
  const isPreOrder = isOrderable && currentStock <= 0;
  const unitPrice =
    selectedVariant?.price ??
    (hasVariants ? realVariants[0]?.price ?? 0 : fallbackVariant?.price ?? 0);

  const handleAddOrder = () => {
    if (!product) return;

    if (!pickupDate) {
      toast.error("Please select a pickup date");
      return;
    }

    if (hasVariants && !activeSize) {
      toast.error("Please choose a size");
      return;
    }

    const variantLabel = hasVariants ? activeSize : NO_VARIANT_SIZE;

    addItem({
      productId: product.id,
      productName: product.name,
      variant: variantLabel,
      quantity,
      pickupDate,
    });

    toast.success(
      `${product.name} (${variantLabel}) added to cart. Total items: ${getItemCount()}.`,
    );
  };

  return (
    <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm text-[#0B525B] underline sm:text-base"
        >
          <ArrowLeft className="size-4" /> Back to products
        </Link>

        {isLoading && (
          <p className="mt-8 text-center text-lg text-[#20596A]">Loading product...</p>
        )}

        {isError && (
          <p className="mt-8 text-center text-lg text-[#7D2D2D]">
            Unable to load product details right now.
          </p>
        )}

        {!isLoading && !isError && !product && (
          <p className="mt-8 text-center text-lg text-[#20596A]">Product not found.</p>
        )}

        {!isLoading && !isError && product && (
          <div className="mt-6 rounded-3xl border border-[#0B525B]/15 bg-white/25 p-4 shadow-[0_10px_24px_rgba(11,82,91,0.06)] backdrop-blur-sm sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(300px,420px)_1fr] lg:items-start lg:gap-8">
              <section className="rounded-3xl border border-[#C1D1DC] bg-[#EAF1F6]/80 p-3 sm:p-4">
                <div className="relative mx-auto h-64 w-full max-w-[320px] overflow-hidden rounded-3xl bg-[#E7E8EA] sm:h-72 sm:max-w-[360px] lg:h-96 lg:max-w-none">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-contain p-2"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-lg text-[#1B5A68] sm:text-2xl">
                      No image
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#D9E8F3] px-3 py-1 text-xs font-semibold text-[#0B525B] sm:text-sm">
                    {normalizeCategory(product.category)}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold sm:text-sm ${
                      isOrderable
                        ? "bg-[#075A5C] text-[#DDFFFE]"
                        : "bg-[#8F8F8F] text-[#F1F1F1]"
                    }`}
                  >
                    {isOrderable
                      ? isPreOrder
                        ? "Pre-Order"
                        : `Available • Stock ${currentStock}`
                      : "Not Available"}
                  </span>
                </div>
              </section>

              <section className="text-center lg:text-left">
                <h1 className="font-serif text-2xl font-bold leading-tight text-[#0B525B] sm:text-3xl lg:text-4xl">
                  {product.name}
                </h1>
                <p className="mt-2 text-2xl font-semibold text-[#0B525B] sm:text-3xl lg:text-3xl">
                  PHP {formatPrice(unitPrice)}
                </p>

                <div className="mt-6 space-y-6">
                  <div>
                    <p className="font-serif text-base text-[#0B525B] sm:text-lg lg:text-xl">
                      Preferred Pickup Date <span className="text-[#D05555]">*</span>
                    </p>
                    <label className="mx-auto mt-3 flex h-12 w-full max-w-xl items-center rounded-full bg-[#F1F4F6] px-4 sm:h-14 sm:px-6 lg:mx-0">
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={(event) => setPickupDate(event.target.value)}
                      className="w-full bg-transparent text-center text-sm text-[#0B525B] outline-none sm:text-base lg:text-lg"
                      />
                    </label>
                  </div>

                  {hasVariants ? (
                    <div>
                      <p className="font-serif text-base text-[#0B525B] sm:text-lg lg:text-xl">
                        Choose Size/Variant <span className="text-[#D05555]">*</span>
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3 lg:justify-start">
                        {realVariants.map((variant) => {
                          const active = variant.size === activeSize;
                          return (
                            <button
                              key={variant.size}
                              type="button"
                              onClick={() => setSelectedSize(variant.size)}
                              className={`rounded-full px-3 py-1.5 text-sm transition-colors sm:px-4 sm:py-2 sm:text-base lg:text-base ${
                                active
                                  ? "bg-[#075A5C] text-white"
                                  : "bg-[#DDE5EC] text-[#0B525B] hover:bg-[#EAF1F6]"
                              }`}
                            >
                              {variant.size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-sm italic text-[#0B525B]/70 lg:text-left">
                      No size selection required for this product.
                    </p>
                  )}

                  <div className="flex items-center justify-center lg:justify-start">
                    <div className="inline-flex items-center gap-4 rounded-full bg-[#F2F3F4] px-5 py-2 text-base text-[#0B525B] sm:gap-6 sm:px-7 sm:text-lg">
                      <button
                        type="button"
                        onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                        className="hover:text-[#06454A]"
                        aria-label="Decrease quantity"
                      >
                        <MinusIcon className="size-5" />
                      </button>
                      <span className="min-w-6 text-center font-semibold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((prev) => Math.min(99, prev + 1))}
                        className="hover:text-[#06454A]"
                        aria-label="Increase quantity"
                      >
                        <PlusIcon className="size-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3 lg:items-start">
                    <button
                      type="button"
                      onClick={handleAddOrder}
                      disabled={!isOrderable}
                      className={`inline-flex h-12 w-full max-w-md items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold sm:h-14 sm:gap-3 sm:text-base lg:text-lg ${
                        isOrderable
                          ? "bg-[#075A5C] text-white hover:bg-[#064F51]"
                          : "cursor-not-allowed bg-[#8F8F8F] text-[#E8E8E8]"
                      }`}
                    >
                      <ShoppingCartIcon className="size-5 sm:size-6" />
                      {isOrderable
                        ? isPreOrder
                          ? "Add Pre-Order"
                          : "Add Order"
                        : "Not Available"}
                    </button>
                    <p className="text-xs text-[#335D69] sm:text-sm">
                      Cart items: <span className="font-semibold">{getItemCount()}</span>
                    </p>
                    {!isOrderable && (
                      <p className="text-sm text-[#7D2D2D]">
                        This product is currently not available for ordering.
                      </p>
                    )}
                    {isOrderable && isPreOrder && (
                      <p className="text-sm text-[#0B525B]">
                        This item is available as pre-order only.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Page;
