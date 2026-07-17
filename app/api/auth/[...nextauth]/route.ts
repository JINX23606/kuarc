// NextAuth route handler — all /api/auth/* requests land here.
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
