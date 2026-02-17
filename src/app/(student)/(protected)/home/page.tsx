"use client";

import Link from "next/link";
import {
  RefreshCcwIcon,
  ShoppingCartIcon,
} from "lucide-react";

const Page = () => {
  return (
    <main className="p-10">
      <h1 className="text-center font-serif text-4xl font-bold text-[#0B525B]">
        What would you like to do?
      </h1>

      <div className="mx-auto mt-10 grid max-w-190 grid-cols-1 gap-6">
        <Link
          href="/products"
          className="group rounded-[34px] border-[6px] border-[#0B525B] bg-[#91BCE6] px-6 py-8 text-center transition-colors hover:bg-[#9CC7F0]"
        >
          <div className="mx-auto flex size-30.5 items-center justify-center rounded-full bg-[#0B525B]">
            <ShoppingCartIcon className="size-14 text-[#87D7E4]" />
          </div>
          <h2 className="mt-7 font-serif text-3xl font-bold leading-tight text-black">
            Order Items
          </h2>
          <p className="mt-3 text-xl text-[#426C77]">
            Browse and order products
          </p>
        </Link>

        <Link
          href="/item-replacement"
          className="group rounded-[34px] border-[6px] border-[#B8622F] bg-[#91BCE6] px-6 py-8 text-center transition-colors hover:bg-[#9CC7F0]"
        >
          <div className="mx-auto flex size-30.5 items-center justify-center rounded-full bg-[#C36631]">
            <RefreshCcwIcon className="size-14 text-[#FFD5BC]" />
          </div>
          <h2 className="mt-7 font-serif text-3xl font-bold leading-tight text-black">
            Replace an Item
          </h2>
          <p className="mt-3 text-xl text-[#426C77]">
            Process item replacement requests
          </p>
        </Link>
      </div>
    </main>
  );
};

export default Page;
