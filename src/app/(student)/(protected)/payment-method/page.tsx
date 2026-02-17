"use client";

import { HandCoinsIcon, SmartphoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";

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

  return (
    <main className="min-h-[calc(100dvh-80px)] bg-[#C8D6E4] px-6 py-8 sm:px-10">
      <h1 className="text-center font-serif text-4xl font-bold text-[#0B525B] sm:text-5xl">
        Select Payment Method
      </h1>

      <section className="mx-auto mt-10 flex w-full max-w-95 flex-col gap-8 sm:mt-12">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => router.push(`/payment-method/${option.id}`)}
            className={`rounded-[34px] border-5 bg-[#91BCE6] px-6 py-10 text-center transition-colors hover:bg-[#A1C7EC] ${option.borderClass}`}
          >
            <div
              className={`mx-auto flex size-32 items-center justify-center rounded-full ${option.iconWrapClass}`}
            >
              {option.id === "cash" ? (
                <HandCoinsIcon className={`size-14 ${option.iconClass}`} />
              ) : (
                <SmartphoneIcon className={`size-14 ${option.iconClass}`} />
              )}
            </div>
            <h2 className="mt-6 font-serif text-4xl font-bold text-[#0B525B]">
              {option.title}
            </h2>
            <p className="mt-4 text-xl text-[#416A75]">{option.description}</p>
          </button>
        ))}
      </section>
    </main>
  );
};

export default Page;
