"use client";

import { useState } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";

import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type ActiveField = "name" | "mobile" | "studentNumber";
type FormState = { name: string; mobile: string; studentNumber: string };

const mobileMaxLength = 11;
const studentNumberMaxLength = 12;
const kioskSignInStorageKey = "kiosk-sign-in";

const nameLayout = {
  default: [
    "q w e r t y u i o p",
    "a s d f g h j k l",
    "{shift} z x c v b n m {bksp}",
    "{space} {enter}",
  ],
  shift: [
    "Q W E R T Y U I O P",
    "A S D F G H J K L",
    "{shift} Z X C V B N M {bksp}",
    "{space} {enter}",
  ],
};

const numberLayout = {
  default: ["1 2 3", "4 5 6", "7 8 9", "{bksp} 0 {enter}"],
};

const keyboardDisplay = {
  "{bksp}": "BKSP",
  "{enter}": "Done",
  "{shift}": "SHIFT",
  "{space}": "Space",
};

const fieldMax: Record<ActiveField, number> = {
  name: 80,
  mobile: mobileMaxLength,
  studentNumber: studentNumberMaxLength,
};

const FIELDS: {
  key: ActiveField;
  label: string;
  placeholder: string;
  numeric?: boolean;
  optional?: boolean;
}[] = [
  { key: "name", label: "Full Name", placeholder: "Enter your full name" },
  {
    key: "mobile",
    label: "Mobile Number",
    placeholder: "11-digit mobile number",
    numeric: true,
  },
  {
    key: "studentNumber",
    label: "Student Number",
    placeholder: "Enter your student number",
    numeric: true,
    optional: true,
  },
];

const SignInPage = () => {
  const { navigate } = useTransitionNav();

  const [form, setForm] = useState<FormState>({
    name: "",
    mobile: "",
    studentNumber: "",
  });
  const [activeField, setActiveField] = useState<ActiveField>("name");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [layoutName, setLayoutName] = useState<"default" | "shift">("default");

  const setFieldValue = (field: ActiveField, value: string) => {
    setForm((prev) => {
      const max = fieldMax[field];
      if (field === "name") return { ...prev, name: value.slice(0, max) };
      const normalized = value.replace(/\D/g, "").slice(0, max);
      return { ...prev, [field]: normalized };
    });
  };

  const appendKey = (field: ActiveField, key: string) => {
    const current = form[field];
    if (current.length >= fieldMax[field]) return;
    if (field !== "name" && !/^\d$/.test(key)) return;
    setFieldValue(field, current + key);
  };

  const handleKeyboardPress = (key: string) => {
    if (key === "{shift}") {
      setLayoutName((p) => (p === "default" ? "shift" : "default"));
      return;
    }
    if (key === "{bksp}") {
      setFieldValue(activeField, form[activeField].slice(0, -1));
      return;
    }
    if (key === "{space}") {
      if (activeField === "name") appendKey(activeField, " ");
      return;
    }
    if (key === "{enter}") {
      setKeyboardOpen(false);
      return;
    }
    appendKey(activeField, key);
    if (layoutName === "shift") setLayoutName("default");
  };

  const canProceed =
    form.name.trim().length > 0 && form.mobile.length === mobileMaxLength;

  const handleProceed = () => {
    if (!canProceed) return;

    const payload = {
      fullName: form.name.trim(),
      mobileNumber: form.mobile,
      studentNumber: form.studentNumber.trim() || null,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(kioskSignInStorageKey, JSON.stringify(payload));
    navigate("/kiosk/action");
  };

  return (
    <>
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-8">
        <div className="flex w-full flex-col items-center px-10 animate-[fadeUp_0.7s_ease_0.2s_both]">
          {/* Top divider */}
          <div className="mb-6 flex w-4/5 items-center gap-3">
            <div className="h-px flex-1 bg-linear-to-r from-transparent to-white/40" />
            <span className="size-1.5 rounded-full bg-white/60" />
            <div className="h-px flex-1 bg-linear-to-l from-transparent to-white/40" />
          </div>

          {/* Heading */}
          <h1 className="font-serif text-6xl font-extrabold leading-tight tracking-tight text-[#07484A] drop-shadow-[0_2px_20px_rgba(0,0,0,0.3)]">
            Sign In
          </h1>
          <p className="mt-3 text-center font-serif text-2xl italic leading-snug tracking-wide text-[#07484A]/80">
            Please enter your details to continue
          </p>

          {/* Middle divider */}
          <div className="my-7 flex w-3/5 items-center gap-3">
            <div className="h-px flex-1 bg-white/20" />
            <span className="font-serif text-sm uppercase tracking-[0.35em] text-white/60">
              Your Information
            </span>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          {/* Form fields */}
          <div className="w-full space-y-4">
            {FIELDS.map(({ key, label, placeholder, optional }) => {
              const isFocused = activeField === key && keyboardOpen;
              return (
                <div key={key} className="w-full">
                  <label className="mb-2 flex items-baseline gap-2">
                    <span className="font-serif text-xl font-semibold text-[#07484A]">
                      {label}
                    </span>
                    {optional && (
                      <span className="font-serif text-sm font-normal italic text-[#07484A]/55">
                        (Optional)
                      </span>
                    )}
                  </label>
                  <div
                    className={`flex h-16 w-full cursor-pointer items-center rounded-2xl border-2 bg-white/70 px-5 backdrop-blur-sm  duration-200 ${
                      isFocused
                        ? "border-[#07484A]/70 ring-4 ring-[#07484A]/15 shadow-[0_4px_24px_rgba(7,72,74,0.15)]"
                        : "border-white/40 hover:border-white/70 hover:bg-white/80"
                    }`}
                    onClick={() => {
                      setActiveField(key);
                      setKeyboardOpen(true);
                    }}
                  >
                    {form[key] ? (
                      <span className="font-serif text-xl text-[#07484A]">
                        {form[key]}
                      </span>
                    ) : (
                      <span className="font-serif text-lg italic text-[#07484A]/35">
                        {placeholder}
                      </span>
                    )}
                    {isFocused && (
                      <span className="ml-0.5 inline-block h-6 w-0.5 animate-[blink_1s_step-end_infinite] bg-[#07484A]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="mt-8 flex w-full gap-4">
            <Button
              onClick={() => navigate("/kiosk")}
              variant="kioskDefault"
              className="h-16 w-1/3 font-serif text-lg font-semibold uppercase tracking-[0.16em] opacity-80"
            >
              &larr; Back
            </Button>
            <Button
              onClick={handleProceed}
              type="button"
              disabled={!canProceed}
              variant="kioskDefault"
              className="h-16 flex-1 font-serif text-xl font-bold uppercase tracking-[0.14em] disabled:opacity-40"
            >
              Proceed &rarr;
            </Button>
          </div>

          <p className="mt-5 font-serif text-sm italic tracking-widest text-white/55">
            Tap a field to type
          </p>
        </div>
      </main>

      {/* On-screen Keyboard Drawer */}
      <Drawer open={keyboardOpen} onOpenChange={setKeyboardOpen}>
        <DrawerContent className="border-white/20 bg-[#0e6b7a]/95 backdrop-blur-md">
          <DrawerHeader className="pb-2 text-left">
            <DrawerTitle className="font-serif text-lg text-white">
              On-screen Keyboard
            </DrawerTitle>
            <DrawerDescription className="font-serif text-white/70">
              {activeField === "name"
                ? "Typing your name"
                : "Enter numeric details"}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-5 pb-5">
            {/* Field switcher tabs */}
            <div className="mb-3 flex gap-2">
              {FIELDS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveField(key)}
                  className={`rounded-lg px-4 py-2 font-serif text-sm uppercase tracking-[0.14em]  duration-150 ${
                    activeField === key
                      ? "bg-white text-[#07484A] shadow-md font-bold"
                      : "bg-white/15 text-white/70 hover:bg-white/25"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Current value preview */}
            <div className="mb-3 flex h-11 items-center rounded-xl border border-white/20 bg-white/10 px-4">
              <span className="font-serif text-lg text-white">
                {form[activeField] || (
                  <span className="italic text-white/40">
                    {FIELDS.find((f) => f.key === activeField)?.placeholder}
                  </span>
                )}
              </span>
              <span className="ml-0.5 inline-block h-5 w-0.5 animate-[blink_1s_step-end_infinite] bg-white" />
            </div>

            <Keyboard
              layoutName={activeField === "name" ? layoutName : "default"}
              layout={activeField === "name" ? nameLayout : numberLayout}
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
        .kiosk-kb {
          background: transparent;
          padding: 4px 0;
        }
        .kiosk-kb .hg-row {
          gap: 6px;
          margin-bottom: 6px;
          justify-content: center;
        }
        .kiosk-kb .hg-button {
          height: 52px;
          min-width: 44px;
          flex-grow: 1;
          border-radius: 10px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          font-family: 'Playfair Display', 'Cormorant Garamond', serif;
          font-size: 1.05rem;
          font-weight: 500;
          box-shadow: 0 2px 6px rgba(0,0,0,0.18);
        }
        .kiosk-kb .hg-button:active {
          background: rgba(255,255,255,0.35);
          transform: scale(0.94);
        }
        .kiosk-kb .hg-button.hg-functionBtn {
          background: rgba(7,72,74,0.55);
          border-color: rgba(7,72,74,0.4);
          font-size: 0.9rem;
          letter-spacing: 0.05em;
          min-width: 72px;
        }
        .kiosk-kb .hg-button.hg-functionBtn:active {
          background: rgba(7,72,74,0.8);
        }
        .kiosk-kb .hg-button[data-skbtn="{space}"] {
          min-width: 200px;
          flex-grow: 3;
        }
        .kiosk-kb .hg-button[data-skbtn="{enter}"] {
          background: rgba(255,255,255,0.9);
          color: #07484A;
          font-weight: 700;
          min-width: 100px;
        }
      `}</style>
    </>
  );
};

export default SignInPage;
