import type { AuthenticatedUser } from "./auth-user";

export type AuthenticatedRequest = {
  headers: {
    authorization?: string;
  };
  user?: AuthenticatedUser;
};
