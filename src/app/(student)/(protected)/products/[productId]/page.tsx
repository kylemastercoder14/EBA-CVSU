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

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

const Page = () => {
  const params = useParams<{ productId: string }>();
  const productId = decodeURIComponent(params.productId ?? "");

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [pickupDate, setPickupDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const addItem = useCart((state) => state.addItem);
  const getItemCount = useCart((state) => state.getItemCount);

  const {
    data,
    isLoading,
    isError,
  } = useQuery(orpc.product.list.queryOptions());

  const products = data?.products ?? [];
  const product = products.find((item) => item.id === productId) as ProductItem | undefined;

  const activeSize = selectedSize ?? product?.variants[0]?.size ?? "";
  const selectedVariant = useMemo(() => {
    if (!product || !activeSize) return undefined;
    return product.variants.find((variant) => variant.size === activeSize);
  }, [product, activeSize]);

  const available = Boolean(product?.isActive);
  const unitPrice = selectedVariant?.price ?? product?.variants[0]?.price ?? 0;

  const handleAddOrder = () => {
    if (!product) return;

    if (!pickupDate) {
      toast.error("Please select a pickup date");
      return;
    }

    if (!activeSize) {
      toast.error("Please choose a size");
      return;
    }

    addItem({
      productId: product.id,
      productName: product.name,
      variant: activeSize,
      quantity,
      pickupDate,
    });

    toast.success(`${product.name} (${activeSize}) added to cart. Total items: ${getItemCount()}.`);
  };

  return (
    <main className="px-6 py-8 sm:px-10 sm:py-10">
      <Link href="/products" className="text-[#0B525B] flex items-center gap-2 underline">
        <ArrowLeft className='size-4' /> Back to products
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
        <div className="mx-auto mt-6 max-w-175 text-center">
          <div className="relative mx-auto h-72.5 w-full max-w-[320px] overflow-hidden rounded-4xl bg-[#E7E8EA]">
            {product.image ? (
              <Image src={product.image} alt={product.name} fill className="object-contain" />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl text-[#1B5A68]">
                No image
              </div>
            )}
          </div>

          <h1 className="mt-4 font-serif text-4xl font-bold text-[#0B525B]">{product.name}</h1>
          <p className="mt-2 text-3xl font-semibold text-[#0B525B]">₱{formatPrice(unitPrice)}</p>

          <div className="mt-6">
            <p className="font-serif text-xl text-[#0B525B]">
              Preferred Pickup Date <span className="text-[#D05555]">*</span>
            </p>
            <label className="mx-auto mt-3 flex h-14 max-w-140 items-center justify-between rounded-full bg-[#F1F4F6] px-6">
              <input
                type="date"
                value={pickupDate}
                onChange={(event) => setPickupDate(event.target.value)}
                className="w-full bg-transparent text-center text-xl text-[#0B525B] outline-none"
              />
            </label>
          </div>

          <div className="mt-8">
            <p className="font-serif text-xl text-[#0B525B]">
              Choose Size/Variant <span className="text-[#D05555]">*</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
              {product.variants.map((variant) => {
                const active = variant.size === activeSize;
                return (
                  <button
                    key={variant.size}
                    type="button"
                    onClick={() => setSelectedSize(variant.size)}
                    className={`rounded-full px-4 py-2 text-xl transition-colors ${active
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

          <div className="mt-8 flex items-center justify-center">
            <div className="inline-flex items-center gap-6 rounded-full bg-[#F2F3F4] px-7 py-2 text-xl text-[#0B525B]">
              <button
                type="button"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                className="hover:text-[#06454A]"
                aria-label="Decrease quantity"
              >
                <MinusIcon className="size-5" />
              </button>
              <span>{quantity}</span>
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

          <button
            type="button"
            onClick={handleAddOrder}
            disabled={!available}
            className={`mt-8 inline-flex w-full max-w-100 items-center justify-center gap-3 rounded-full px-6 py-4 text-2xl font-semibold ${available
                ? "bg-[#075A5C] text-white hover:bg-[#064F51]"
                : "cursor-not-allowed bg-[#8F8F8F] text-[#E8E8E8]"
              }`}
          >
            <ShoppingCartIcon className="size-7" />
            {available ? "Add Order" : "Not Available"}
          </button>
        </div>
      )}
    </main>
  );
};

export default Page;
