// Site-wide navigation bar (server component — reads the session directly).
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function SiteHeader() {
  const session = await auth();

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-gray-900">
            KUARC RadioTrack
          </Link>
          <Link href="/radios" className="text-sm text-gray-600 hover:text-gray-900">
            รายการวิทยุ
          </Link>
          {session?.user && (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                แดชบอร์ด
              </Link>
              <Link
                href="/my-borrows"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                การยืมของฉัน
              </Link>
            </>
          )}
          {session?.user?.role === "ADMIN" && (
            <>
              <Link
                href="/admin/borrows"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                คำขอยืม–คืน
              </Link>
              <Link
                href="/admin/radios"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                จัดการวิทยุ
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <span className="hidden text-sm text-gray-500 sm:inline">
                {session.user.name}
                {session.user.role === "ADMIN" && " (แอดมิน)"}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ออกจากระบบ
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
