"use client";

import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import { ShoppingCart, RefreshCcw, ArrowLeft } from "lucide-react";

const actions = [
  {
    key: "order",
    icon: ShoppingCart,
    title: "Order Items",
    description: "Browse and order products",
    href: "/kiosk/order",
    accent: "#07484A",
  },
  {
    key: "replace",
    icon: RefreshCcw,
    title: "Replace an Item",
    description: "Process item returns",
    href: "/kiosk/replace",
    accent: "#b45309",
  },
];

const ActionSelectPage = () => {
  const { navigate } = useTransitionNav();

  return (
    <>
      {/* Back */}
      <div className="mt-8 mx-15 flex w-full justify-start">
        <button
          onClick={() => navigate("/kiosk/sign-in")}
          className="flex items-center gap-2 rounded-xl border border-white/30 bg-black/50 px-5 py-2.5 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-sm transition-all hover:bg-white/35 active:scale-95 animate-[fadeUp_0.7s_ease_0.2s_both]"
        >
          <ArrowLeft className='size-4' /> Back
        </button>
      </div>
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-8">
        <div className="flex w-full flex-col items-center px-6 animate-[fadeUp_0.7s_ease_0.2s_both]">
          {/* Heading */}
          <h1 className="mb-10 text-center font-serif text-5xl font-extrabold leading-tight tracking-tight text-[#07484A] drop-shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
            What would you like to do?
          </h1>

          {/* Action cards */}
          <div className="flex w-full flex-col gap-5">
            {actions.map(
              ({ key, icon: Icon, title, description, href, accent }) => (
                <button
                  key={key}
                  onClick={() => navigate(href)}
                  className="group flex w-full flex-col items-center rounded-3xl border-2 border-white/40 bg-white/30 py-8 px-6 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all duration-200 hover:bg-white/45 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] active:scale-[0.98]"
                  style={{ borderColor: `${accent}40` }}
                >
                  {/* Icon circle */}
                  <div
                    className="mb-4 flex size-16 items-center justify-center rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.18)]"
                    style={{ background: accent }}
                  >
                    <Icon className="size-7 text-white" />
                  </div>
                  <span className="font-serif text-2xl font-bold text-[#07484A]">
                    {title}
                  </span>
                  <span className="mt-1 font-serif text-sm italic text-[#07484A]/60">
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

export default ActionSelectPage;
