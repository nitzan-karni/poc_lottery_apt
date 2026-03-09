"use client";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
}

export function StatCard({ label, value, icon, color = "#00838F" }: StatCardProps) {
  return (
    <div
      className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-4"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div
        className="text-2xl w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: `${color}18` }}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-[#212121]">{value}</div>
        <div className="text-sm text-[#546E7A]">{label}</div>
      </div>
    </div>
  );
}
