// Login page — club members sign in with Google.
// External borrowers never log in; they use the public /borrow-request form.
//
// Next.js 16 note: `searchParams` is a Promise and must be awaited.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  // Already signed in? Go straight to where they were headed.
  const session = await auth();
  if (session?.user) {
    redirect(callbackUrl ?? "/radios");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
        <h1 className="text-center text-2xl font-bold text-gray-900">
          KUARC RadioTrack
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          เข้าสู่ระบบสำหรับสมาชิกชมรม (บัญชี @ku.th หรือ Gmail)
        </p>

        {/* Server action: start the Google OAuth flow */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl ?? "/radios" });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            เข้าสู่ระบบด้วย Google
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          บุคคลภายนอก ไม่ต้องเข้าสู่ระบบ —{" "}
          <Link href="/radios" className="text-blue-600 hover:underline">
            ดูรายการวิทยุ
          </Link>{" "}
          ได้เลย
        </p>
      </div>
    </main>
  );
}
