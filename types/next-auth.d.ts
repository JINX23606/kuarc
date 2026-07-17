// Type augmentation so session.user.id / session.user.role are typed
// everywhere (they are added in the callbacks in lib/auth.ts).

import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  // The user object handed to the jwt callback on sign-in
  // (comes from the Prisma adapter, so it has our extra columns).
  interface User {
    role: Role;
  }
}

// Note: "next-auth/jwt" just re-exports "@auth/core/jwt", so the
// augmentation must target "@auth/core/jwt" to actually merge.
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
  }
}
