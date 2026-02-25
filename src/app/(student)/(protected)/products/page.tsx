"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, SearchIcon } from "lucide-react";
import { orpc } from "@/lib/orpc";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { NO_VARIANT_SIZE } from "@/validators/products";

type ProductVariant = {
  size: string;
  price: number;
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

const getLowestPrice = (variants: ProductVariant[]) => {
  if (variants.length === 0) return 0;
  return variants.reduce(
    (lowest, variant) => Math.min(lowest, variant.price),
    variants[0].price,
  );
};

const normalizeCategory = (category: string) => {
  if (!category) return "Others";
  return category
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
};

const Page = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data, isLoading, isError } = useQuery(orpc.product.list.queryOptions());
  const { data: stockData } = useQuery(orpc.stock.list.queryOptions());

  const products = useMemo(() => data?.products ?? [], [data?.products]);
  const stockByProductId = useMemo<Map<string, number>>(() => {
    const entries: Array<[string, number]> = (stockData?.stocks ?? []).map((stock) => [
      stock.productId,
      Number(stock.currentStock ?? 0),
    ]);
    return new Map<string, number>(entries);
  }, [stockData]);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(products.map((product) => normalizeCategory(product.category))),
    );

    return ["All", ...uniqueCategories];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const categoryName = normalizeCategory(product.category);
      const categoryMatches =
        selectedCategory === "All" || categoryName === selectedCategory;

      if (!categoryMatches) return false;
      if (!normalizedSearch) return true;

      return (
        product.name.toLowerCase().includes(normalizedSearch) ||
        categoryName.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [products, searchTerm, selectedCategory]);

  return (
    <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4]">
      <section className="bg-[#C4D0DD] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-serif text-2xl font-bold text-[#0B525B] sm:text-3xl lg:text-4xl">
            Browse Products
          </h1>
          <p className="mt-2 text-sm text-[#4E7F89] sm:mt-3 sm:text-base lg:text-lg">
            Find uniforms, pajamas, and merchandise for CvSU students
          </p>
        </div>
      </section>

      <section className="bg-[#4F8BC8] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl space-y-4">
          <label className="relative block">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search products..."
              className="h-11 w-full rounded-full bg-[#E7DFEA] px-4 pr-12 text-base text-[#4B4B58] outline-none placeholder:text-[#5B5963] sm:h-12 sm:px-5 sm:pr-14 sm:text-lg lg:text-xl"
            />
            <SearchIcon className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-[#55505E] sm:right-4 sm:size-6 lg:size-7" />
          </label>

          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex min-w-max items-center gap-2 px-1 sm:gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`h-10 shrink-0 rounded-full px-3 text-center font-serif text-sm transition-colors sm:h-11 sm:px-4 sm:text-base lg:h-12 lg:text-lg ${
                    selectedCategory === category
                      ? "bg-[#075A5C] text-white"
                      : "bg-[#BFD9EB] text-[#195568] hover:bg-[#D2E7F3]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-7xl">
        {isLoading && (
          <p className="text-center text-lg text-[#20596A]">Loading products...</p>
        )}

        {isError && (
          <p className="text-center text-lg text-[#7D2D2D]">
            Unable to load products right now. Please try again.
          </p>
        )}

        {!isLoading && !isError && filteredProducts.length === 0 && (
          <p className="text-center text-lg text-[#20596A]">No products found for your filter.</p>
        )}

        {!isLoading && !isError && filteredProducts.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
            {filteredProducts.map((product) => {
              const stockCount = stockByProductId.get(product.id) ?? 0;
              const available = product.isActive && stockCount > 0;
              const category = normalizeCategory(product.category);
              const price = getLowestPrice(product.variants);
              const visibleVariantCount = product.variants.filter(
                (variant) => variant.size !== NO_VARIANT_SIZE,
              ).length;

              return (
                <div
                  key={product.id}
                  className="relative rounded-[26px] border-2 border-[#A5BACB] bg-linear-to-b from-[#C5D3DF] to-[#4C8CC9] p-3 shadow-sm transition-transform hover:-translate-y-0.5 sm:rounded-[30px] sm:border-3 sm:p-4 lg:rounded-[34px] lg:border-4"
                >
                  <span
                    className={`absolute top-3 right-3 z-10 rounded-full px-3 py-1 text-xs font-semibold sm:right-4 sm:px-4 sm:text-sm lg:text-base ${
                      available
                        ? "bg-[#075A5C] text-[#DDFFFE]"
                        : "bg-[#8E2C1B] text-[#FFF2ED]"
                    }`}
                  >
                    {available ? "Available" : "Not Available"}
                  </span>
                  <div className="relative mx-auto h-44 w-full max-w-65 overflow-hidden rounded-2xl bg-transparent sm:h-52 sm:rounded-3xl lg:h-56">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-lg text-[#1B5A68] sm:text-2xl">
                        No image
                      </div>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-[#063c66] sm:text-lg lg:text-xl">{category}</p>
                  <h2 className="mt-1 line-clamp-2 min-h-[2.75rem] font-sans text-lg leading-tight text-white sm:min-h-[3.1rem] sm:text-xl lg:text-xl">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-xs text-[#D3E8FF] sm:text-sm">
                    Stock: {stockCount} | Variants: {visibleVariantCount}
                  </p>
                  <p className="mb-3 text-lg text-[#D3E8FF] sm:text-xl lg:text-xl">
                    PHP {formatPrice(price)}
                  </p>
                  <Button
                    onClick={() => router.push(`/products/${product.id}`)}
                    className="h-9 w-full rounded-full bg-[#063c66] text-sm hover:bg-[#063c66]/90 sm:ml-auto sm:w-auto sm:px-4 sm:text-base"
                  >
                    View Details <ArrowRight className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </section>
    </main>
  );
};

export default Page;
