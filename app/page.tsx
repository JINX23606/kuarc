// Landing page — points visitors to the public radio list,
// and members to the login page.
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-4xl font-bold text-gray-900">KUARC RadioTrack</h1>
      <p className="mt-3 max-w-md text-center text-gray-600">
        ระบบยืม–คืนวิทยุสื่อสาร ชมรมวิทยุสมัครเล่น มหาวิทยาลัยเกษตรศาสตร์
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/radios"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow transition hover:bg-blue-700"
        >
          ดูรายการวิทยุ
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          เข้าสู่ระบบ (สมาชิก)
        </Link>
      </div>
    </main>
  );
}
