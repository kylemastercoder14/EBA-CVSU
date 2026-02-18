import KioskStatusBar from '@/components/kiosk/KioskStatusBar';
import { PageTransitionProvider } from "@/components/kiosk/PageTransitionProvider";

const KioskLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-linear-to-b from-[#ddebf7] via-[#9dc1e5] to-[#4a8ccf]">
      {/* Dot-grid texture */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.09) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -top-24 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute top-1/3 -right-16 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-pulse [animation-delay:2s]" />
      <div className="pointer-events-none absolute bottom-16 left-8 h-56 w-56 rounded-full bg-white/10 blur-3xl animate-pulse [animation-delay:4s]" />

      {/* Corner ornaments */}
      <svg className="absolute top-3 left-3 z-0 opacity-30" width="52" height="52" viewBox="0 0 52 52" fill="none">
        <path d="M2 2 L2 26 Q2 50 26 50 L50 50" stroke="white" strokeWidth="1.5" fill="none" />
        <circle cx="2" cy="2" r="3" fill="white" />
      </svg>
      <svg className="absolute top-3 right-3 z-0 scale-x-[-1] opacity-30" width="52" height="52" viewBox="0 0 52 52" fill="none">
        <path d="M2 2 L2 26 Q2 50 26 50 L50 50" stroke="white" strokeWidth="1.5" fill="none" />
        <circle cx="2" cy="2" r="3" fill="white" />
      </svg>
      <svg className="absolute bottom-3 left-3 z-0 scale-y-[-1] opacity-30" width="52" height="52" viewBox="0 0 52 52" fill="none">
        <path d="M2 2 L2 26 Q2 50 26 50 L50 50" stroke="white" strokeWidth="1.5" fill="none" />
        <circle cx="2" cy="2" r="3" fill="white" />
      </svg>
      <svg className="absolute right-3 bottom-3 z-0 scale-[-1] opacity-30" width="52" height="52" viewBox="0 0 52 52" fill="none">
        <path d="M2 2 L2 26 Q2 50 26 50 L50 50" stroke="white" strokeWidth="1.5" fill="none" />
        <circle cx="2" cy="2" r="3" fill="white" />
      </svg>

      <KioskStatusBar />

      <div className="relative z-10 flex-1 min-h-0">
        <PageTransitionProvider>{children}</PageTransitionProvider>
      </div>

      <footer className="relative z-10 flex w-full flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/20 px-8 py-3.5 backdrop-blur-md animate-[fadeUp_0.6s_ease_0.4s_both]">
        <span className="font-serif text-[0.7rem] uppercase tracking-[0.16em] text-white/55">
          External and Business Affairs Office
        </span>
        <span className="font-serif text-[0.7rem] uppercase tracking-[0.16em] text-white/55">
          Office Hours: Mon-Sat 8:00 AM-5:00 PM
        </span>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap');
        .font-serif { font-family: 'Playfair Display', 'Cormorant Garamond', serif; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default KioskLayout;
