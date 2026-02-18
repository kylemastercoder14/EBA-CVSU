"use client";

import { useCallback, useEffect, useState } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import { ArrowLeft, AlertCircle, X } from "lucide-react";

import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { orpc } from "@/lib/orpc";

const MAX = 10;
const kioskReplaceOrderStorageKey = "kiosk-replace-order";
const kioskReplaceErrorStorageKey = "kiosk-replace-error";

const numberLayout = {
  default: ["1 2 3", "4 5 6", "7 8 9", "{bksp} 0 {enter}"],
};

const keyboardDisplay = {
  "{bksp}": "⌫",
  "{enter}": "Done",
};

// ── Inline Error Banner ───────────────────────────────────────────────────────
const ErrorBanner = ({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) => (
  <div className="mb-4 w-full animate-[slideDown_0.3s_cubic-bezier(0.4,0,0.2,1)_both]">
    <div className="flex items-start gap-3 rounded-2xl border-2 border-red-400/40 bg-red-500/15 px-5 py-4 backdrop-blur-sm shadow-[0_4px_20px_rgba(239,68,68,0.12)]">
      {/* Icon */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-500/20">
        <AlertCircle className="size-4 text-red-600" />
      </div>
      {/* Message */}
      <p className="flex-1 font-serif text-base font-semibold leading-snug text-red-700">
        {message}
      </p>
      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-400/20 text-red-500 hover:bg-red-400/40 transition-all active:scale-90"
      >
        <X className="size-3.5" />
      </button>
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const OrderNumberPage = () => {
  const { navigate } = useTransitionNav();
  const [errorCode] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;

    const fromQuery = new URLSearchParams(window.location.search).get("error");
    const fromStorage = localStorage.getItem(kioskReplaceErrorStorageKey);
    localStorage.removeItem(kioskReplaceErrorStorageKey);
    return fromQuery ?? fromStorage;
  });

  const [value, setValue] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const dismissError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Surface errors passed via URL param or localStorage
  useEffect(() => {
    const storedError =
      typeof window !== "undefined"
        ? localStorage.getItem(kioskReplaceErrorStorageKey)
        : null;
    const resolvedError = errorCode ?? storedError;

    if (resolvedError === "invalid-order") {
      showError("Order number not found. Please check your receipt.");
    } else if (resolvedError === "missing-order") {
      showError("Please enter and validate your order number first.");
    }

  }, [errorCode, showError]);

  const handleKeyboardPress = (key: string) => {
    // Clear error as soon as user starts typing again
    if (errorMessage) dismissError();

    if (key === "{bksp}") { setValue((v) => v.slice(0, -1)); return; }
    if (key === "{enter}") { setKeyboardOpen(false); return; }
    if (/^\d$/.test(key) && value.length < MAX) setValue((v) => v + key);
  };

  const display = value ? `ORD-${value.padStart(6, "X").slice(0, 6)}` : "";
  const isFieldFocused = keyboardOpen;
  const hasError = !!errorMessage;
  const canContinue = value.length > 0 && !isChecking;

  const handleContinue = async () => {
    if (!canContinue) return;
    dismissError();
    setIsChecking(true);

    try {
      const requestedOrderNumber = `ORD-${value}`;
      const response = await orpc.order.checkExists.call({
        orderNumber: requestedOrderNumber,
      });

      if (!response.exists || !response.order) {
        showError("Order number not found. Please check your receipt.");
        return;
      }

      const payload = {
        rawOrderNumber: value,
        formattedOrderNumber: response.normalizedOrderNumber,
        orderId: response.order.id,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem(kioskReplaceOrderStorageKey, JSON.stringify(payload));
      sessionStorage.setItem(kioskReplaceOrderStorageKey, JSON.stringify(payload));
      navigate(
        `/kiosk/replace/reason?order=${encodeURIComponent(response.normalizedOrderNumber)}`
      );
    } catch {
      showError("Unable to validate order right now. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
      {/* Back button */}
      <div className="relative z-10 px-8 pt-8 animate-[fadeUp_0.5s_ease_both]">
        <button
          onClick={() => navigate("/kiosk/action")}
          className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/20 px-5 py-2.5 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-[#07484A] backdrop-blur-sm transition-all hover:bg-white/35 active:scale-95"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      </div>

      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-8">
        <div className="flex w-full flex-col items-center px-6 animate-[fadeUp_0.7s_ease_0.2s_both]">

          {/* Top divider */}
          <div className="mb-6 flex w-4/5 items-center gap-3">
            <div className="h-px flex-1 bg-linear-to-r from-transparent to-white/40" />
            <span className="size-1.5 rounded-full bg-white/60" />
            <div className="h-px flex-1 bg-linear-to-l from-transparent to-white/40" />
          </div>

          {/* Heading */}
          <h1 className="mb-3 text-center font-serif text-5xl font-extrabold leading-tight tracking-tight text-[#07484A] drop-shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
            Enter your order number from the receipt
          </h1>

          <p className="mb-8 text-center font-serif text-xl italic text-[#07484A]/70">
            Tap the field below to open the keypad
          </p>

          {/* Middle divider */}
          <div className="mb-6 flex w-3/5 items-center gap-3">
            <div className="h-px flex-1 bg-white/20" />
            <span className="font-serif text-sm uppercase tracking-[0.35em] text-white/60">
              Order Number
            </span>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          {/* ── Inline error banner — in the document flow, above the input ── */}
          {hasError && (
            <ErrorBanner message={errorMessage!} onDismiss={dismissError} />
          )}

          {/* Input field */}
          <div className="mb-6 w-full">
            <div
              onClick={() => { setKeyboardOpen(true); dismissError(); }}
              className={`flex h-16 w-full cursor-pointer items-center rounded-2xl border-2 px-5 backdrop-blur-sm transition-all duration-200 ${
                hasError
                  ? "border-red-400/70 bg-red-50/70 ring-4 ring-red-400/15"
                  : isFieldFocused
                  ? "border-[#07484A]/70 bg-white/70 ring-4 ring-[#07484A]/15 shadow-[0_4px_24px_rgba(7,72,74,0.15)]"
                  : "border-white/40 bg-white/70 hover:border-white/70 hover:bg-white/80"
              }`}
            >
              <span
                className={`flex-1 font-serif text-xl ${
                  value
                    ? hasError
                      ? "text-red-600"
                      : "text-[#07484A]"
                    : "italic text-[#07484A]/35"
                }`}
              >
                {display || "ORD-XXXXXX"}
              </span>

              {/* Blink caret when focused and no error */}
              {isFieldFocused && !hasError && (
                <span className="ml-0.5 inline-block h-6 w-0.5 animate-[blink_1s_step-end_infinite] bg-[#07484A]" />
              )}

              {/* Error icon inside field */}
              {hasError && (
                <AlertCircle className="ml-2 size-5 shrink-0 text-red-400" />
              )}
            </div>
          </div>

          {/* Continue button */}
          <div className="flex w-full gap-4">
            <Button
              disabled={!canContinue}
              onClick={handleContinue}
              variant="kioskDefault"
              className="h-16 flex-1 font-serif text-xl font-bold uppercase tracking-[0.14em] disabled:opacity-40"
            >
              {isChecking ? "Checking…" : "Continue →"}
            </Button>
          </div>

          <p className="mt-5 font-serif text-sm italic tracking-widest text-white/55">
            Tap the field to open the keypad
          </p>
        </div>
      </main>

      {/* ── Numpad Drawer ── */}
      <Drawer open={keyboardOpen} onOpenChange={setKeyboardOpen}>
        <DrawerContent className="border-white/20 bg-[#0e6b7a]/95 backdrop-blur-md">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle className="font-serif text-lg text-white">
              Enter Order Number
            </DrawerTitle>
            <DrawerDescription className="font-serif text-white/70">
              Use the keypad to enter your order number
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-5 pb-5">
            {/* Preview */}
            <div className="mb-3 flex h-11 items-center rounded-xl border border-white/20 bg-white/10 px-4">
              <span className="font-serif text-lg text-white">
                {display || (
                  <span className="italic text-white/40">ORD-XXXXXX</span>
                )}
              </span>
              <span className="ml-0.5 inline-block h-5 w-0.5 animate-[blink_1s_step-end_infinite] bg-white" />
            </div>

            <Keyboard
              layoutName="default"
              layout={numberLayout}
              display={keyboardDisplay}
              onKeyPress={handleKeyboardPress}
              theme="hg-theme-default kiosk-kb"
            />
          </div>
        </DrawerContent>
      </Drawer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .kiosk-kb { background: transparent; padding: 4px 0; }
        .kiosk-kb .hg-row { gap: 6px; margin-bottom: 6px; justify-content: center; }
        .kiosk-kb .hg-button {
          height: 52px; min-width: 44px; flex-grow: 1; border-radius: 10px;
          background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
          color: #fff; font-family: "Playfair Display", "Cormorant Garamond", serif;
          font-size: 1.05rem; font-weight: 500; box-shadow: 0 2px 6px rgba(0,0,0,0.18);
          transition: background 0.1s, transform 0.08s;
        }
        .kiosk-kb .hg-button:active { background: rgba(255,255,255,0.35); transform: scale(0.94); }
        .kiosk-kb .hg-button.hg-functionBtn {
          background: rgba(7,72,74,0.55); border-color: rgba(7,72,74,0.4);
          font-size: 0.9rem; letter-spacing: 0.05em; min-width: 72px;
        }
        .kiosk-kb .hg-button.hg-functionBtn:active { background: rgba(7,72,74,0.8); }
        .kiosk-kb .hg-button[data-skbtn="{enter}"] {
          background: rgba(255,255,255,0.9); color: #07484A;
          font-weight: 700; min-width: 100px;
        }
      `}</style>
    </>
  );
};

export default OrderNumberPage;
