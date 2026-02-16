"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const useAuth = () => {
  const router = useRouter();

  useEffect(() => {
    const accessKey = localStorage.getItem("eba_access_key");

    if (accessKey !== "EBA-2026-KIOSK") {
      router.push("/admin");
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem("eba_access_key");
    router.push("/admin");
  };

  return { logout };
};
