"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, SearchIcon } from "lucide-react";
import { orpc } from "@/lib/orpc";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

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
    <main>
      <section className="bg-[#C4D0DD] px-8 py-9">
        <h1 className="font-serif text-4xl font-bold text-[#0B525B]">Browse Products</h1>
        <p className="mt-3 text-2xl text-[#4E7F89]">
          Find uniforms, pajamas, and merchandise for CvSU students
        </p>
      </section>

      <section className="bg-[#4F8BC8] px-6 py-8 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <label className="relative block">
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search products..."
              className="h-12 w-full rounded-full bg-[#E7DFEA] px-5 pr-14 text-xl text-[#4B4B58] outline-none placeholder:text-[#5B5963]"
            />
            <SearchIcon className="pointer-events-none absolute right-4 top-1/2 size-7 -translate-y-1/2 text-[#55505E]" />
          </label>

          <div className="flex items-center gap-3">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`h-12 rounded-full px-4 text-center font-serif text-lg transition-colors ${
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
      </section>

      <section className="px-6 py-8 sm:px-8 sm:py-10">
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const stockCount = stockByProductId.get(product.id) ?? 0;
              const available = product.isActive && stockCount > 0;
              const category = normalizeCategory(product.category);
              const price = getLowestPrice(product.variants);

              return (
                <div
                  key={product.id}
                  className="relative rounded-[34px] border-4 border-[#A5BACB] bg-linear-to-b from-[#C5D3DF] to-[#4C8CC9] p-4 shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  <span
                    className={`absolute top-3 right-4 z-10 rounded-full px-4 py-1 text-base font-semibold ${
                      available
                        ? "bg-[#075A5C] text-[#DDFFFE]"
                        : "bg-[#8E2C1B] text-[#FFF2ED]"
                    }`}
                  >
                    {available ? "Available" : "Not Available"}
                  </span>
                  <div className="relative mx-auto h-56 w-full max-w-65 overflow-hidden rounded-3xl bg-transparent">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl text-[#1B5A68]">
                        No image
                      </div>
                    )}
                  </div>

                  <p className="mt-2 text-xl text-[#063c66]">{category}</p>
                  <h2 className="mt-1 line-clamp-1 font-sans text-2xl leading-tight text-white">
                    {product.name}
                  </h2>
                  <p className="mt-1 text-sm text-[#D3E8FF]">
                    Stock: {stockCount} | Variants: {product.variants.length}
                  </p>
                  <p className="mb-3 text-2xl text-[#D3E8FF]">PHP {formatPrice(price)}</p>
                  <Button
                    onClick={() => router.push(`/products/${product.id}`)}
                    className="ml-auto flex justify-end rounded-full bg-[#063c66] hover:bg-[#063c66]/90"
                  >
                    View Details <ArrowRight className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default Page;
