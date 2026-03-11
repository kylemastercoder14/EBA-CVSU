"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext } from "react";

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
  const currentPath = normalizePath(pathname);

  const navigate = useCallback(
    (href: string) => {
      const nextPath = normalizePath(href);
      if (nextPath === currentPath) return;
      router.push(href);
    },
    [currentPath, router]
  );

  return (
    <TransitionContext.Provider value={{ navigate }}>
      <div className="flex h-full w-full flex-col overflow-hidden">{children}</div>
    </TransitionContext.Provider>
  );
};
