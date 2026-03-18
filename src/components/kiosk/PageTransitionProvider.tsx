"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type TransitionContextType = {
  navigate: (href: string) => void;
};

const TransitionContext = createContext<TransitionContextType>({
  navigate: () => {},
});

export const useTransitionNav = () => useContext(TransitionContext);
const normalizePath = (href: string) => href.split("#")[0].split("?")[0];
const TRANSITION_MS = 350;

export const PageTransitionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const currentPath = normalizePath(pathname);
  const [phase, setPhase] = useState<"idle" | "exiting" | "entering">("idle");
  const hasMountedRef = useRef(false);
  const pendingHrefRef = useRef<string | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useCallback(
    (href: string) => {
      const nextPath = normalizePath(href);
      if (nextPath === currentPath || phase === "exiting") return;

      pendingHrefRef.current = href;
      setPhase("exiting");

      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }

      exitTimerRef.current = setTimeout(() => {
        router.push(href);
      }, TRANSITION_MS);
    },
    [currentPath, phase, router]
  );

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (!pendingHrefRef.current) return;

    setPhase("entering");

    const enterTimer = setTimeout(() => {
      setPhase("idle");
      pendingHrefRef.current = null;
    }, TRANSITION_MS);

    return () => clearTimeout(enterTimer);
  }, [pathname]);

  const animationClass =
    phase === "exiting"
      ? "animate-[kioskPageSlideUpOut_0.35s_ease-in_both]"
      : phase === "entering"
        ? "animate-[kioskPageSlideUpIn_0.35s_cubic-bezier(0.22,1,0.36,1)_both]"
        : "";

  return (
    <TransitionContext.Provider value={{ navigate }}>
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        <div className={`flex h-full w-full flex-col overflow-hidden ${animationClass}`}>
          {children}
        </div>

        <style>{`
          @keyframes kioskPageSlideUpOut {
            from { transform: translateY(0); }
            to { transform: translateY(-100%); }
          }

          @keyframes kioskPageSlideUpIn {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </div>
    </TransitionContext.Provider>
  );
};
