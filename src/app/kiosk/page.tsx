"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useTransitionNav } from "@/components/kiosk/PageTransitionProvider";

const Page = () => {
  // useTransitionNav triggers the slide-out animation THEN navigates
  const { navigate } = useTransitionNav();

  return (
    <>
      {/* Main Content */}
      <main className="relative z-10 flex h-full flex-col items-center justify-center px-10 py-8">
        <div className="flex w-full flex-col items-center px-10 py-12 animate-[fadeUp_0.7s_ease_0.2s_both]">
          {/* Logo */}
          <div className="relative mb-7 flex size-50 items-center justify-center overflow-hidden rounded-full border-2 border-white/40 bg-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.4)] animate-[breathe_4s_ease-in-out_infinite]">
            <Image
              src="/logo.png"
              alt="CvSU Logo"
              fill
              priority
              className="object-contain p-2"
            />
          </div>

          {/* Top divider */}
          <div className="mb-6 flex w-4/5 items-center gap-3">
            <div className="h-px flex-1 bg-linear-to-r from-transparent to-white/40" />
            <span className="size-1.5 rounded-full bg-white/60" />
            <div className="h-px flex-1 bg-linear-to-l from-transparent to-white/40" />
          </div>

          {/* University name */}
          <h1 className="font-serif text-8xl font-extrabold leading-tight tracking-tight text-[#07484A] drop-shadow-[0_2px_20px_rgba(0,0,0,0.3)]">
            CvSU-Rosario
          </h1>

          {/* Subtitle */}
          <p className="mt-3 text-center font-serif text-3xl italic leading-snug tracking-wide text-[#07484A]/80">
            External and Business Affairs Office
          </p>

          {/* Middle divider */}
          <div className="my-7 flex w-3/5 items-center gap-3">
            <div className="h-px flex-1 bg-white/20" />
            <span className="font-serif text-sm uppercase tracking-[0.35em] text-white/60">
              Welcome
            </span>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          <Button
            onClick={() => navigate("/kiosk/sign-in")}
            variant="kioskDefault"
            className="h-20 w-full text-2xl font-bold uppercase tracking-[0.14em] font-serif"
          >
            START HERE
          </Button>

          <p className="mt-5 font-serif text-sm italic tracking-widest text-white/55">
            Tap to begin
          </p>
        </div>
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1);    opacity: 0.85; }
          50%       { transform: scale(1.04); opacity: 1;    }
        }
      `}</style>
    </>
  );
};

export default Page;
