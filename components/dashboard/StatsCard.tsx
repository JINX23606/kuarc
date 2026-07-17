// Small numeric stat card used on the dashboard.

const ACCENT_CLASSES = {
  gray: "text-gray-900",
  green: "text-green-600",
  blue: "text-blue-600",
  yellow: "text-yellow-600",
  red: "text-red-600",
} as const;

export default function StatsCard({
  label,
  value,
  accent = "gray",
}: {
  label: string;
  value: number;
  accent?: keyof typeof ACCENT_CLASSES;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${ACCENT_CLASSES[accent]}`}>{value}</p>
    </div>
  );
}
