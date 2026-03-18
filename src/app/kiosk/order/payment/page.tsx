"use client";

import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import { Smartphone, Banknote } from "lucide-react";

type PaymentMethod = "gcash" | "cash";
const kioskPaymentMethodStorageKey = "kiosk-payment-method";

const methods = [
  {
    key: "gcash",
    icon: Smartphone,
    title: "GCash",
    description: "Pay via GCash QR Code",
    href: "/kiosk/order/payment/gcash",
    accent: "#07484A",
  },
  {
    key: "cash",
    icon: Banknote,
    title: "Cash",
    description: "Pay at EBA office during pickup",
    href: "/kiosk/order/payment/cash",
    accent: "#1a6b4a",
  },
];

const PaymentMethodPage = () => {
  const { navigate } = useTransitionNav();
  const handleSelectMethod = (method: PaymentMethod, href: string) => {
    sessionStorage.setItem(kioskPaymentMethodStorageKey, method);
    localStorage.setItem(kioskPaymentMethodStorageKey, method);
    navigate(href);
  };

  return (
    <>
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-8">
        <div className="flex w-full flex-col items-center px-6 animate-[fadeUp_0.7s_ease_0.2s_both]">
          {/* Top divider */}
          <div className="mb-6 flex w-4/5 items-center gap-3">
            <div className="h-px flex-1 bg-linear-to-r from-transparent to-white/40" />
            <span className="size-1.5 rounded-full bg-white/60" />
            <div className="h-px flex-1 bg-linear-to-l from-transparent to-white/40" />
          </div>

          {/* Heading */}
          <h1 className="font-serif text-5xl font-extrabold leading-tight tracking-tight text-[#07484A] drop-shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
            Select Payment Method
          </h1>

          {/* Middle divider */}
          <div className="my-7 flex w-3/5 items-center gap-3">
            <div className="h-px flex-1 bg-white/20" />
            <span className="font-serif text-sm uppercase tracking-[0.35em] text-white/60">
              Choose one
            </span>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          {/* Method cards */}
          <div className="flex w-full flex-col gap-5">
            {methods.map(
              ({ key, icon: Icon, title, description, href, accent }) => (
                <button
                  key={key}
                  onClick={() => handleSelectMethod(key as PaymentMethod, href)}
                  className="group flex w-full flex-col items-center rounded-3xl border-2 border-white/35 bg-white/25 py-10 px-6 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.1)]  duration-200 hover:bg-white/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] active:scale-[0.98]"
                  style={{ borderColor: `${accent}35` }}
                >
                  <div
                    className="mb-4 flex size-25 items-center justify-center rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.18)]"
                    style={{ background: accent }}
                  >
                    <Icon className="size-14 text-white" />
                  </div>
                  <span className="font-serif text-3xl font-bold text-[#07484A]">
                    {title}
                  </span>
                  <span className="mt-1 font-serif text-lg italic text-[#07484A]/60">
                    {description}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default PaymentMethodPage;
