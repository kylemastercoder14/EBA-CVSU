"use client";

import { useEffect, useState } from "react";
import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const COUNTDOWN_SEC = 8;

const ReturnResultPage = () => {
  const { navigate } = useTransitionNav();
  const [params] = useState(() => {
    if (typeof window === "undefined") {
      return { status: "success", order: "", message: "" };
    }
    const search = new URLSearchParams(window.location.search);
    return {
      status: search.get("status") ?? "success",
      order: search.get("order") ?? "",
      message: search.get("message") ?? "",
    };
  });

  const status = params.status; // "success" | "error"
  const order = params.order;
  const message = params.message;

  const isSuccess = status === "success";

  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);

  // Countdown tick + auto-navigate on 0
  useEffect(() => {
    if (countdown <= 0) {
      navigate("/kiosk");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  // ── variant config ────────────────────────────────────────────────────────
  const variant = isSuccess
    ? {
        iconBg:   "bg-emerald-500",
        iconGlow: "shadow-[0_8px_32px_rgba(16,185,129,0.45)]",
        ringColor:"stroke-emerald-400",
        Icon:     CheckCircle2,
        heading:  "Return Request Submitted",
        subtext:  message || "Your return request is waiting for admin approval. You will receive an SMS once it is approved or declined.",
      }
    : {
        iconBg:   "bg-red-500",
        iconGlow: "shadow-[0_8px_32px_rgba(239,68,68,0.45)]",
        ringColor:"stroke-red-400",
        Icon:     XCircle,
        heading:  "Request Failed",
        subtext:  message || "We couldn't process your return request. Please try again or visit the EBA Office.",
      };

  // SVG ring progress
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = (countdown / COUNTDOWN_SEC) * circumference;

  return (
    <>
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-8">
        <div className="flex w-full flex-col items-center px-6 animate-[fadeUp_0.7s_ease_0.2s_both]">

          {/* Result card */}
          <div className="w-full rounded-3xl border border-white/25 bg-white/15 px-8 py-12 text-center backdrop-blur-sm shadow-[0_24px_60px_rgba(0,0,0,0.15)]">

            {/* Icon */}
            <div
              className={`mx-auto mb-6 flex size-20 items-center justify-center rounded-full ${variant.iconBg} ${variant.iconGlow} animate-[popIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)_0.3s_both]`}
            >
              <variant.Icon className="size-10 text-white" />
            </div>

            {/* Heading */}
            <h1 className="font-serif text-4xl font-extrabold tracking-tight text-[#07484A]">
              {variant.heading}
            </h1>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/25" />
              <span className="size-1.5 rounded-full bg-white/50" />
              <div className="h-px flex-1 bg-white/25" />
            </div>

            {/* Order number — only shown when present */}
            {order && (
              <p className="font-serif text-lg text-[#07484A]/70">
                Order Number:{" "}
                <span className="font-bold text-[#07484A]">{order}</span>
              </p>
            )}

            {/* Sub-message */}
            <p className="mt-2 font-serif text-base italic text-[#07484A]/55 leading-relaxed">
              {variant.subtext}
            </p>

            {/* ── Countdown ring ── */}
            <div className="mt-8 flex flex-col items-center gap-2">
              <div className="relative flex items-center justify-center">
                {/* Track ring */}
                <svg width="100" height="100" className="-rotate-90">
                  <circle
                    cx="50" cy="50" r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="5"
                  />
                  {/* Progress ring */}
                  <circle
                    cx="50" cy="50" r={radius}
                    fill="none"
                    className={variant.ringColor}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                  />
                </svg>
                {/* Number in centre */}
                <span className="absolute font-serif text-3xl font-bold text-[#07484A]">
                  {countdown}
                </span>
              </div>
              <p className="font-serif text-sm italic text-[#07484A]/45 tracking-wide">
                Returning to home…
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex w-full gap-4">
            {!isSuccess && (
              <Button
                onClick={() => navigate("/kiosk/replace")}
                variant="kioskDefault"
                className="h-14 w-1/3 font-serif text-base font-semibold uppercase tracking-[0.14em] opacity-80"
              >
                ← Retry
              </Button>
            )}
            <Button
              onClick={() => navigate("/kiosk")}
              variant="kioskDefault"
              className="h-14 flex-1 font-serif text-lg font-bold uppercase tracking-[0.14em]"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
};

export default ReturnResultPage;
