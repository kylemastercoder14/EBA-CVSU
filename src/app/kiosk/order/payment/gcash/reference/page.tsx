"use client";

import { useState } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { ArrowLeft, ScrollText } from "lucide-react";

const numberLayout = {
  default: ["1 2 3", "4 5 6", "7 8 9", "{bksp} 0 {enter}"],
};

const keyboardDisplay = {
  "{bksp}": "⌫",
  "{enter}": "Done",
};

const MAX = 13;
const kioskPaymentReferenceStorageKey = "kiosk-payment-reference";

const GCashReferencePage = () => {
  const { navigate } = useTransitionNav();
  const [value, setValue] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const handleKeyboardPress = (key: string) => {
    if (key === "{bksp}") {
      setValue((v) => v.slice(0, -1));
      return;
    }
    if (key === "{enter}") {
      setKeyboardOpen(false);
      return;
    }
    if (/^\d$/.test(key) && value.length < MAX) setValue((v) => v + key);
  };

  const canSubmit = value.length >= 13;
  const isFocused = keyboardOpen;
  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload = {
      method: "gcash",
      referenceNumber: value,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(kioskPaymentReferenceStorageKey, JSON.stringify(payload));
    sessionStorage.setItem(kioskPaymentReferenceStorageKey, JSON.stringify(payload));
    navigate("/kiosk/order/payment/success");
  };

  return (
    <>
      {/* Back */}
      <div className="mt-8 mx-15 flex w-full justify-start">
        <button
          onClick={() => navigate("/kiosk/order/payment/gcash")}
          className="flex items-center gap-2 rounded-xl border border-white/30 bg-black/50 px-5 py-2.5 font-serif text-sm font-semibold uppercase tracking-[0.15em] text-white backdrop-blur-sm  hover:bg-white/35 active:scale-95 animate-[fadeUp_0.7s_ease_0.2s_both]"
        >
          <ArrowLeft className="size-4" /> Back
        </button>
      </div>
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-8">
        <div className="flex w-full flex-col items-center px-4 animate-[fadeUp_0.7s_ease_0.2s_both]">
          {/* Heading */}
          <h1 className="mb-8 font-serif text-5xl font-extrabold tracking-tight text-[#07484A] drop-shadow-[0_2px_12px_rgba(0,0,0,0.15)]">
            GCash Payment
          </h1>

          {/* Reference card */}
          <div className="w-full rounded-3xl border border-white/25 bg-[#07484A] px-6 py-7 shadow-[0_16px_48px_rgba(7,72,74,0.3)]">
            {/* Icon + label */}
            <div className="mb-5 flex flex-col items-center gap-2">
              <div className="flex size-20 items-center justify-center rounded-full bg-emerald-400 shadow-[0_4px_16px_rgba(52,211,153,0.4)]">
                <ScrollText className="size-10 text-white" />
              </div>
              <p className="font-serif text-2xl font-bold text-white">
                GCash Reference Number
              </p>
              <p className="font-serif text-lg italic text-white/65 text-center">
                Enter the reference number from your GCash receipt
              </p>
            </div>

            {/* Tap-to-type field */}
            <div
              className={`flex h-14 w-full cursor-pointer items-center justify-center rounded-2xl border-2 bg-white/15 px-5  duration-200 ${
                isFocused
                  ? "border-emerald-400 ring-2 ring-emerald-400/30"
                  : "border-white/25 hover:border-white/45"
              }`}
              onClick={() => setKeyboardOpen(true)}
            >
              <span
                className={`font-serif text-xl tracking-widest ${value ? "text-white font-bold" : "italic text-white/35"}`}
              >
                {value || "Enter reference number"}
              </span>
              {isFocused && (
                <span className="ml-0.5 inline-block h-6 w-0.5 animate-[blink_1s_step-end_infinite] bg-white" />
              )}
            </div>

            {/* Submit */}
            <Button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="mt-4 h-13 w-full rounded-2xl bg-white font-serif text-lg font-bold uppercase tracking-[0.12em] text-[#07484A] hover:bg-white/90 active:scale-[0.98] disabled:opacity-35 border-0  shadow-[0_4px_16px_rgba(0,0,0,0.15)]"
            >
              Submit
            </Button>
          </div>
        </div>
      </main>

      {/* ── Numpad Drawer ── */}
      <Drawer open={keyboardOpen} onOpenChange={setKeyboardOpen}>
        <DrawerContent className="border-white/20 bg-[#0e6b7a]/95 backdrop-blur-md">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle className="font-serif text-lg text-white">
              Enter Reference Number
            </DrawerTitle>
            <DrawerDescription className="font-serif text-white/70">
              13-digit GCash reference number
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-5 pb-5">
            {/* Preview */}
            <div className="mb-3 flex h-11 items-center rounded-xl border border-white/20 bg-white/10 px-4">
              <span className="font-serif text-lg tracking-widest text-white">
                {value || (
                  <span className="italic text-white/40">
                    Enter reference number
                  </span>
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
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .kiosk-kb { background: transparent; padding: 4px 0; }
        .kiosk-kb .hg-row { gap: 6px; margin-bottom: 6px; justify-content: center; }
        .kiosk-kb .hg-button {
          height: 52px; min-width: 44px; flex-grow: 1; border-radius: 10px;
          background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
          color: #fff; font-family: 'Playfair Display', serif; font-size: 1.05rem;
          font-weight: 500; box-shadow: 0 2px 6px rgba(0,0,0,0.18);
        }
        .kiosk-kb .hg-button:active { background: rgba(255,255,255,0.35); transform: scale(0.94); }
        .kiosk-kb .hg-button.hg-functionBtn {
          background: rgba(7,72,74,0.55); border-color: rgba(7,72,74,0.4);
          font-size: 0.9rem; min-width: 72px;
        }
        .kiosk-kb .hg-button[data-skbtn="{enter}"] {
          background: rgba(255,255,255,0.9); color: #07484A; font-weight: 700; min-width: 100px;
        }
      `}</style>
    </>
  );
};

export default GCashReferencePage;
