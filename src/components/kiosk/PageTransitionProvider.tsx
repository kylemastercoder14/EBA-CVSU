"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useRef, useState, useCallback, useEffect } from "react";

type TransitionContextType = {
  navigate: (href: string) => void;
};

const TransitionContext = createContext<TransitionContextType>({
  navigate: () => {},
});

export const useTransitionNav = () => useContext(TransitionContext);
const normalizePath = (href: string) => href.split("#")[0].split("?")[0];

export const PageTransitionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPath = normalizePath(pathname);
  const isLeaving = pendingPath !== null && currentPath !== pendingPath;

  const navigate = useCallback(
    (href: string) => {
      const nextPath = normalizePath(href);
      if (isLeaving || nextPath === currentPath) return;

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
      setPendingPath(nextPath);
      transitionTimerRef.current = setTimeout(() => {
        router.push(href);
        transitionTimerRef.current = null;
      }, 450);
    },
    [currentPath, isLeaving, router]
  );

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  return (
    <TransitionContext.Provider value={{ navigate }}>
      <div
        className={`flex h-full w-full flex-col overflow-hidden ${
          isLeaving
            ? "animate-[slideOut_0.45s_cubic-bezier(0.4,0,0.2,1)_forwards]"
            : ""
        }`}
      >
        {children}
      </div>

      <style>{`
        @keyframes slideOut {
          0%   { opacity: 1;   transform: translateX(0)      scale(1);    }
          30%  { opacity: 1;   transform: translateX(-10px)  scale(0.98); }
          100% { opacity: 0;   transform: translateX(-60px)  scale(0.96); }
        }
        @keyframes slideIn {
          0%   { opacity: 0;   transform: translateX(60px)   scale(0.96); }
          100% { opacity: 1;   transform: translateX(0)      scale(1);    }
        }
      `}</style>
    </TransitionContext.Provider>
  );
};
