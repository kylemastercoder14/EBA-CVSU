"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import { Button } from "@/components/ui/button";
import { orpc } from "@/lib/orpc";
import {
  AlertCircle,
  Wrench,
  Ruler,
  RefreshCcw,
  ArrowLeft,
} from "lucide-react";

const reasons = [
  { key: "wrong-item", icon: AlertCircle, label: "Wrong Item" },
  { key: "defective", icon: Wrench, label: "Defective Item" },
  { key: "wrong-size", icon: Ruler, label: "Wrong Size" },
  { key: "change-mind", icon: RefreshCcw, label: "Change of Mind" },
];
const kioskReplaceErrorStorageKey = "kiosk-replace-error";
const kioskReplaceReasonStorageKey = "kiosk-replace-reason";
const kioskReplaceRequestStorageKey = "kiosk-replace-request";

const reasonKeyToEnum: Record<string, "WRONG_ITEM" | "DEFECTIVE_ITEM" | "WRONG_SIZE" | "CHANGE_OF_MIND"> = {
  "wrong-item": "WRONG_ITEM",
  defective: "DEFECTIVE_ITEM",
  "wrong-size": "WRONG_SIZE",
  "change-mind": "CHANGE_OF_MIND",
};

const ReturnReasonPage = () => {
  const { navigate } = useTransitionNav();
  const [selected, setSelected] = useState<string | null>(null);
  const createReplaceMutation = useMutation(orpc.replace.create.mutationOptions());
  const [orderNumber] = useState(() => {
    if (typeof window !== "undefined") {
      const fromQuery = new URLSearchParams(window.location.search).get("order");
      if (fromQuery?.trim()) return fromQuery.trim().toUpperCase();
    }

    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("kiosk-replace-order");
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { formattedOrderNumber?: string };
          if (parsed.formattedOrderNumber?.trim()) {
            return parsed.formattedOrderNumber.trim().toUpperCase();
          }
        } catch {
          // Ignore malformed storage.
        }
      }
    }

    return "-";
  });
  const needsValidation = orderNumber !== "-";
  const { data: existsData, isLoading: isValidating } = useQuery({
    ...orpc.order.checkExists.queryOptions({
      input: { orderNumber },
    }),
    enabled: needsValidation,
  });

  useEffect(() => {
    if (!needsValidation) {
      if (typeof window !== "undefined") {
        localStorage.setItem(kioskReplaceErrorStorageKey, "missing-order");
      }
      navigate("/kiosk/replace?error=missing-order");
      return;
    }
    if (isValidating) return;
    if (!existsData?.exists) {
      if (typeof window !== "undefined") {
        localStorage.setItem(kioskReplaceErrorStorageKey, "invalid-order");
      }
      navigate("/kiosk/replace?error=invalid-order");
    }
  }, [needsValidation, isValidating, existsData, navigate]);

  if (!needsValidation || isValidating || !existsData?.exists) {
    return (
      <main className="relative z-10 flex h-full items-center justify-center px-10">
        <p className="font-serif text-lg text-white/80">Validating order number...</p>
      </main>
    );
  }

  const handleSubmit = async () => {
    if (!selected) return;

    const selectedReason = reasons.find((reason) => reason.key === selected);
    const backendReason = reasonKeyToEnum[selected];
    if (!backendReason) return;

    let created: Awaited<ReturnType<typeof createReplaceMutation.mutateAsync>> | null = null;
    try {
      created = await createReplaceMutation.mutateAsync({
        orderNumber,
        reason: backendReason,
      });
    } catch {
      navigate(
        `/kiosk/replace/result?status=error&order=${encodeURIComponent(orderNumber)}&message=${encodeURIComponent("Unable to submit return request right now.")}`,
      );
      return;
    }

    const payload = {
      orderNumber,
      reasonKey: selected,
      reasonLabel: selectedReason?.label ?? selected,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(kioskReplaceReasonStorageKey, JSON.stringify(payload));
    sessionStorage.setItem(kioskReplaceReasonStorageKey, JSON.stringify(payload));
    localStorage.setItem(kioskReplaceRequestStorageKey, JSON.stringify(created.replaceRequest));
    sessionStorage.setItem(kioskReplaceRequestStorageKey, JSON.stringify(created.replaceRequest));
    navigate(`/kiosk/replace/result?status=success&order=${orderNumber}`);
  };

  return (
    <>
      {/* Back */}
      <div className="mt-8 mx-15 flex w-full justify-start">
        <button
          onClick={() => navigate("/kiosk/replace")}
          className="flex items-center gap-2 rounded-xl border border-white/30 bg-black/50 px-5 py-2.5 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-sm  hover:bg-white/35 active:scale-95 animate-[fadeUp_0.7s_ease_0.2s_both]"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      </div>
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-8">
        <div className="flex w-full flex-col items-center px-6 animate-[fadeUp_0.7s_ease_0.2s_both]">
          {/* Heading */}
          <h1 className="mb-6 text-center font-serif text-5xl font-extrabold leading-tight tracking-tight text-[#07484A] drop-shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
            Select Return Reason
          </h1>

          {/* Card */}
          <div className="mb-6 w-full rounded-3xl border border-white/30 bg-white/20 p-5 backdrop-blur-sm">
            {/* Order badge */}
            <p className="mb-4 text-center font-serif text-sm text-[#07484A]/60 tracking-wide">
              Order Number:{" "}
              <span className="font-bold text-[#07484A]">{orderNumber}</span>
            </p>

            {/* Reason options */}
            <div className="flex flex-col gap-3">
              {reasons.map(({ key, icon: Icon, label }) => {
                const isSelected = selected === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 font-serif text-lg font-semibold  duration-150 active:scale-[0.98] ${
                      isSelected
                        ? "border-[#07484A]/70 bg-[#07484A]/15 text-[#07484A] shadow-[0_4px_20px_rgba(7,72,74,0.15)]"
                        : "border-white/30 bg-white/25 text-[#07484A]/80 hover:bg-white/40 hover:border-white/50"
                    }`}
                  >
                    <div
                      className={`flex size-11 shrink-0 items-center justify-center rounded-full  ${
                        isSelected ? "bg-[#07484A]" : "bg-white/40"
                      }`}
                    >
                      <Icon
                        className={`size-5 ${isSelected ? "text-white" : "text-[#07484A]/60"}`}
                      />
                    </div>
                    {label}
                    {isSelected && (
                      <span className="ml-auto text-[#07484A]">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <Button
            disabled={!selected || createReplaceMutation.isPending}
            onClick={() => void handleSubmit()}
            className="h-16 w-full rounded-2xl bg-emerald-500 font-serif text-xl font-bold uppercase tracking-[0.12em] text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none border-0 "
          >
            {createReplaceMutation.isPending ? "Submitting..." : "Submit Return Request"}
          </Button>

          {/* Info note */}
          <div className="mt-4 flex w-full items-start gap-3 rounded-2xl border border-white/25 bg-white/15 px-4 py-3 backdrop-blur-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#07484A]/60" />
            <p className="font-serif text-sm italic text-[#07484A]/70 leading-snug">
              Please bring your receipt and the item to the EBA Office to
              complete the return process.
            </p>
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

export default ReturnReasonPage;
