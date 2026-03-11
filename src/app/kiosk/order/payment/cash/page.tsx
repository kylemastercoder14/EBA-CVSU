"use client";

import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";

const steps = [
  {
    icon: Banknote,
    title: "Payment Instructions",
    body: "Please bring the exact amount when you come to the EBA office to claim your order.",
  },
  {
    icon: CalendarClock,
    title: "Pickup Schedule",
    body: "Your order will be prepared upon confirmation. Staff will notify you via SMS about your scheduled pickup date.",
  },
  {
    icon: ClipboardCheck,
    title: "Order Confirmation",
    body: "You will receive an order slip after completing this step. Present it at the EBA office during pickup.",
  },
];

const CashPaymentPage = () => {
  const { navigate } = useTransitionNav();

  return (
    <>
      {/* Back */}
      <div className="mt-8 mx-15 flex w-full justify-start">
        <button
          onClick={() => navigate("/kiosk/order/payment")}
          className="flex items-center gap-2 rounded-xl border border-white/30 bg-black/50 px-5 py-2.5 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-sm  hover:bg-white/35 active:scale-95 animate-[fadeUp_0.7s_ease_0.2s_both]"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      </div>
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-8">
        <div className="flex w-full flex-col items-center px-4 animate-[fadeUp_0.7s_ease_0.2s_both]">
          {/* Main card */}
          <div className="w-full rounded-3xl border border-white/25 bg-[#07484A] px-6 py-7 shadow-[0_16px_48px_rgba(7,72,74,0.3)]">
            {/* Icon + title */}
            <div className="mb-6 flex flex-col items-center gap-3">
              <div className="flex size-17 items-center justify-center rounded-full bg-emerald-400 shadow-[0_4px_20px_rgba(52,211,153,0.4)]">
                <Banknote className="size-10 text-white" />
              </div>
              <p className="font-serif text-2xl font-bold text-white">
                Cash Payment Selected
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4 mb-5">
              {steps.map(({ icon: Icon, title, body }, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15 border border-white/20">
                    <Icon className="size-6 text-white/80" />
                  </div>
                  <div>
                    <p className="font-serif text-lg font-bold text-white">
                      {title}
                    </p>
                    <p className="font-serif text-base text-white/65 leading-snug mt-0.5">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Important note */}
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/20 px-4 py-4">
              <AlertCircle className="mt-0.5 size-6 shrink-0 text-amber-400" />
              <p className="font-serif text-sm text-amber-100/90 leading-snug italic">
                Important Reminder: Please keep this order slip during the
                pickup. Failure to do so may result in delays during your
                pickup.
              </p>
            </div>
          </div>

          {/* Continue */}
          <Button
            onClick={() => navigate("/kiosk/order/payment/success")}
            className="mt-6 h-16 w-full rounded-2xl bg-[#07484A] font-serif text-xl font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_24px_rgba(7,72,74,0.35)] hover:bg-[#0a5e60] active:scale-[0.98] border-0 "
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

export default CashPaymentPage;
