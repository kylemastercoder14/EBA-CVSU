"use client";

import { HandCoinsIcon, SmartphoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/hooks/use-cart";
import { orpc } from "@/lib/orpc";
import { NO_VARIANT_SIZE } from "@/validators/products";

type PaymentOption = {
  id: "cash" | "gcash";
  title: string;
  description: string;
  borderClass: string;
  iconWrapClass: string;
  iconClass: string;
};

const options: PaymentOption[] = [
  {
    id: "cash",
    title: "Cash",
    description: "Pay at EBA office during pickup",
    borderClass: "border-[#04515A]",
    iconWrapClass: "bg-[#04515A]",
    iconClass: "text-[#9AD3DE]",
  },
  {
    id: "gcash",
    title: "GCash",
    description: "Pay using GCash QR Code",
    borderClass: "border-[#1674DB]",
    iconWrapClass: "bg-[#0F5AAE]",
    iconClass: "text-[#8FC0F6]",
  },
];

const Page = () => {
  const router = useRouter();
  const items = useCart((state) => state.items);
  const { data: stockData } = useQuery(orpc.stock.list.queryOptions());

  const stockByVariantKey = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const stock of stockData?.stocks ?? []) {
      map.set(
        `${stock.productId}::${stock.variant ?? NO_VARIANT_SIZE}`,
        Number(stock.currentStock ?? 0),
      );
    }
    return map;
  }, [stockData]);

  const hasPreOrderItems = useMemo(
    () =>
      items.some(
        (item) =>
          (stockByVariantKey.get(`${item.productId}::${item.variant}`) ??
            Number.POSITIVE_INFINITY) <= 0,
      ),
    [items, stockByVariantKey],
  );

  const visibleOptions = hasPreOrderItems
    ? options.filter((option) => option.id === "gcash")
    : options;

  return (
    <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
      <h1 className="text-center font-serif text-2xl font-bold text-[#0B525B] sm:text-3xl lg:text-4xl">
        Select Payment Method
      </h1>
      {hasPreOrderItems && (
        <p className="mt-2 text-center text-sm text-[#0B525B] sm:text-base">
          Pre-order items require GCash payment.
        </p>
      )}

      <section className="mx-auto mt-6 grid w-full max-w-5xl grid-cols-1 gap-5 sm:mt-8 sm:gap-6 lg:mt-10 lg:grid-cols-2 lg:gap-6">
        {visibleOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => router.push(`/payment-method/${option.id}`)}
            className={`rounded-[24px] border-2 bg-[#91BCE6] px-4 py-6 text-center transition-colors hover:bg-[#A1C7EC] sm:rounded-[30px] sm:border-4 sm:px-6 sm:py-8 lg:rounded-[30px] lg:border-4 lg:py-8 ${option.borderClass}`}
          >
            <div
              className={`mx-auto flex size-18 items-center justify-center rounded-full sm:size-24 lg:size-24 ${option.iconWrapClass}`}
            >
              {option.id === "cash" ? (
                <HandCoinsIcon className={`size-8 sm:size-10 lg:size-10 ${option.iconClass}`} />
              ) : (
                <SmartphoneIcon className={`size-8 sm:size-10 lg:size-10 ${option.iconClass}`} />
              )}
            </div>
            <h2 className="mt-4 font-serif text-2xl font-bold text-[#0B525B] sm:mt-5 sm:text-3xl lg:mt-6 lg:text-3xl">
              {option.title}
            </h2>
            <p className="mt-2 text-sm text-[#416A75] sm:mt-3 sm:text-base lg:mt-4 lg:text-lg">{option.description}</p>
          </button>
        ))}
      </section>
      </div>
    </main>
  );
};

export default Page;
