import { os } from "@orpc/server";

export const base = os.$context<{ request: Request }>().errors({
  RATE_LIMITED: {
    message: "Too many requests. Please try again later.",
  },
  BAD_REQUEST: {
    message:
      "Your browser sent a request that this server could not understand.",
  },
  NOT_FOUND: {
    message: "The requested resource could not be found.",
  },
  FORBIDDEN: {
    message: "You do not have permission to access this resource.",
  },
  UNAUTHORIZED: {
    message: "Authentication is required to access this resource.",
  },
  INTERNAL_SERVER_ERROR: {
    message: "An unexpected error occurred. Please try again later.",
  },
});
