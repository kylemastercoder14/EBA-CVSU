"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, QrCode } from "lucide-react";
import Image from "next/image";

import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { orpc } from "@/lib/orpc";

const GCashQRPage = () => {
  const { navigate } = useTransitionNav();
  const cartItems = useCart((state) => state.items);
  const { data: productsData } = useQuery(orpc.product.list.queryOptions());
  const { data: gcashQrData } = useQuery(orpc.payment.getGcashQr.queryOptions());

  const totalAmount = useMemo(() => {
    const products = productsData?.products ?? [];

    return cartItems.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      const variantPrice = product?.variants.find(
        (variant) => variant.size === item.variant,
      )?.price;
      const minPrice =
        product && product.variants.length > 0
          ? Math.min(...product.variants.map((variant) => variant.price))
          : 0;
      const unitPrice = Number(variantPrice ?? minPrice ?? 0);
      return sum + unitPrice * item.quantity;
    }, 0);
  }, [cartItems, productsData?.products]);

  const steps = useMemo(
    () => [
      "Open your GCash app and scan the QR code above",
      `Confirm the payment amount of P${totalAmount.toFixed(2)}`,
      "Complete the payment on your phone",
      'Tap "Continue" below after payment is complete',
    ],
    [totalAmount],
  );
  const gcashQrUrl = gcashQrData?.imageUrl || "/gcash-qr.png";

  return (
    <>
      {/* Back */}
      <div className="mt-8 mx-15 flex w-full justify-start">
        <button
          onClick={() => navigate("/kiosk/order/payment")}
          className="flex items-center gap-2 rounded-xl border border-white/30 bg-black/50 px-5 py-2.5 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition-all hover:bg-white/35 active:scale-95 animate-[fadeUp_0.7s_ease_0.2s_both]"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      </div>
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-8">
        <div className="flex w-full flex-col items-center px-4 animate-[fadeUp_0.7s_ease_0.2s_both]">
          {/* Heading */}
          <h1 className="mb-6 font-serif text-5xl font-extrabold tracking-tight text-[#07484A] drop-shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
            GCash Payment
          </h1>

          {/* QR Card */}
          <div className="w-full rounded-3xl border border-white/25 bg-[#07484A] px-6 pt-6 pb-7 shadow-[0_16px_48px_rgba(7,72,74,0.3)]">
            {/* Header row */}
            <div className="mb-5 flex flex-col items-center gap-2">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-400 shadow-[0_4px_16px_rgba(52,211,153,0.4)]">
                <QrCode className="size-6 text-white" />
              </div>
              <p className="font-serif text-xl font-semibold text-white/90">
                Scan QR Code to Pay
              </p>
              <p className="font-serif text-5xl font-extrabold text-white">
                P{totalAmount.toFixed(2)}
              </p>
            </div>

            {/* QR code image area */}
            <div className="mx-auto flex size-65 items-center justify-center rounded-2xl bg-white p-3 shadow-inner">
              {/* Replace with actual QR image: <Image src="/qr-gcash.png" fill /> */}
              <div className="relative h-full w-full">
                <Image
                  src={gcashQrUrl}
                  alt="GCash QR Code"
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="mt-5 w-full rounded-2xl border border-white/25 bg-white/15 px-6 py-6 backdrop-blur-sm space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#07484A] font-serif text-xl font-bold text-white">
                  {i + 1}
                </span>
                <p className="font-serif text-lg text-[#07484A]/80 leading-snug">
                  {step}
                </p>
              </div>
            ))}
          </div>

          {/* Continue */}
          <Button
            onClick={() => navigate("/kiosk/order/payment/gcash/reference")}
            className="mt-6 h-16 w-full rounded-2xl bg-[#07484A] font-serif text-xl font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_24px_rgba(7,72,74,0.35)] hover:bg-[#0a5e60] active:scale-[0.98] border-0 transition-all"
          >
            Continue
          </Button>
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

export default GCashQRPage;
