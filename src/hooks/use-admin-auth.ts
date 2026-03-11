"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { orpc } from "@/lib/orpc";

// TEMP: Disable admin session guard while bootstrapping a fresh database.
const ADMIN_AUTH_DISABLED = false;

export const useAuth = () => {
  const router = useRouter();

  useEffect(() => {
    if (ADMIN_AUTH_DISABLED) {
      return;
    }

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
      } catch (error) {
        // Avoid forcing logout on transient/network errors.
        // We only clear session when the API explicitly returns loggedOut.
        console.error("Failed to validate admin session:", error);
      }
    };

    validateSession();
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem("eba_access_key");
    localStorage.removeItem("eba_staff_session");
    router.replace("/admin");
  }, [router]);

  return { logout };
};

export const useAdminLogout = () => {
  const router = useRouter();

  const logout = useCallback(() => {
    localStorage.removeItem("eba_access_key");
    localStorage.removeItem("eba_staff_session");
    router.replace("/admin");
  }, [router]);

  return { logout };
};
