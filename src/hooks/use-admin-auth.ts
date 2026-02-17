"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { orpc } from "@/lib/orpc";

export const useAuth = () => {
  const router = useRouter();

  useEffect(() => {
    const validateSession = async () => {
      const accessKey = localStorage.getItem("eba_access_key");

      if (!accessKey) {
        router.replace("/admin");
        return;
      }

      try {
        const session = await orpc.auth.session.call({ accessKey });

        if (!session.loggedIn || !session.staff) {
          localStorage.removeItem("eba_access_key");
          localStorage.removeItem("eba_staff_session");
          router.replace("/admin");
          return;
        }

        localStorage.setItem("eba_staff_session", JSON.stringify(session.staff));
      } catch {
        localStorage.removeItem("eba_access_key");
        localStorage.removeItem("eba_staff_session");
        router.replace("/admin");
      }
    };

    validateSession();
  }, [router]);

  const logout = () => {
    localStorage.removeItem("eba_access_key");
    localStorage.removeItem("eba_staff_session");
    router.replace("/admin");
  };

  return { logout };
};
