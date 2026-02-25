"use client";

import Link from "next/link";
import {
  RefreshCcwIcon,
  ShoppingCartIcon,
} from "lucide-react";

const Page = () => {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <section className="mx-auto max-w-6xl rounded-2xl border border-[#0B525B]/15 bg-white/25 p-5 shadow-[0_10px_30px_rgba(11,82,91,0.08)] backdrop-blur-sm sm:p-7 lg:p-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-serif text-xs font-semibold uppercase text-[#0B525B]/65">
              Student Portal
            </p>
            <h1 className="mt-2 font-serif text-xl font-bold text-[#0B525B] sm:text-2xl lg:text-4xl">
              What would you like to do?
            </h1>
            <p className="mt-2 lg:block hidden text-sm text-[#426C77] lg:text-lg">
              Choose an action below to place a new order or request an item replacement.
            </p>
          </div>
          <div className="rounded-xl hidden lg:block border border-[#0B525B]/15 bg-[#EAF3FB]/70 px-4 py-3 text-sm text-[#0B525B]/80">
            Fast access for kiosk and desktop use
          </div>
        </div>
      </section>

      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <Link
          href="/products"
          className="group flex min-h-45 flex-col justify-center rounded-[26px] border-2 border-[#0B525B] bg-linear-to-b from-[#9EC7EE] to-[#8CB7E3] px-6 py-8 text-center shadow-[0_12px_28px_rgba(11,82,91,0.1)] transition-all hover:-translate-y-0.5 hover:from-[#A8D0F5] hover:to-[#96C0EA] hover:shadow-[0_18px_35px_rgba(11,82,91,0.16)] lg:min-h-80 lg:rounded-[30px] lg:border-4 lg:px-8"
        >
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#0B525B] shadow-[0_8px_18px_rgba(11,82,91,0.2)] lg:size-22">
            <ShoppingCartIcon className="size-6 text-[#87D7E4] lg:size-11" />
          </div>
          <h2 className="mt-6 font-serif text-2xl font-bold leading-tight text-black lg:text-3xl">
            Order Items
          </h2>
          <p className="mt-3 text-base text-[#426C77] lg:text-lg">
            Browse and order products
          </p>
          <p className="mt-2 text-xs text-[#2f5964]/80 lg:text-base">
            Uniforms, booklets, laces, and other EBA items.
          </p>
        </Link>

        <Link
          href="/item-replacement"
          className="group flex min-h-45 flex-col justify-center rounded-[26px] border-2 border-[#B8622F] bg-linear-to-b from-[#9EC7EE] to-[#8CB7E3] px-6 py-8 text-center shadow-[0_12px_28px_rgba(11,82,91,0.1)] transition-all hover:-translate-y-0.5 hover:from-[#A8D0F5] hover:to-[#96C0EA] hover:shadow-[0_18px_35px_rgba(11,82,91,0.16)] lg:min-h-80 lg:rounded-[30px] lg:border-4 lg:px-8"
        >
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#C36631] shadow-[0_8px_18px_rgba(195,102,49,0.25)] lg:size-22">
            <RefreshCcwIcon className="size-6 text-[#FFD5BC] lg:size-11" />
          </div>
          <h2 className="mt-6 font-serif text-2xl font-bold leading-tight text-black lg:text-3xl">
            Replace an Item
          </h2>
          <p className="mt-3 text-base text-[#426C77] lg:text-lg">
            Process item replacement requests
          </p>
          <p className="mt-2 text-xs text-[#2f5964]/80 lg:text-base">
            Submit a replacement request for eligible purchased items.
          </p>
        </Link>
      </div>
    </main>
  );
};

export default Page;
