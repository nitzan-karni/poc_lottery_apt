"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/qa", label: "Document QA", icon: "🔍" },
  { href: "/admin/lottery", label: "Lottery", icon: "🎲" },
  { href: "/admin/winners", label: "Winners", icon: "🏆" },
  { href: "/admin/reports", label: "Reports", icon: "📈" },
  { href: "/rules", label: "Rules", icon: "📋" },
];

const publicItems = [
  { href: "/register", label: "Register", icon: "✍️" },
  { href: "/search", label: "Check Status", icon: "🔎" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 min-h-screen flex flex-col text-white"
      style={{ background: "linear-gradient(180deg, #004D54 0%, #00838F 100%)" }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="text-xl font-bold leading-tight">עזרה ובצרון</div>
        <div className="text-xs text-white/70 mt-0.5">Affordable Housing Lottery</div>
        <div className="text-xs text-white/50 mt-0.5">Tel Aviv-Yafo Municipality</div>
      </div>

      {/* Admin Nav */}
      <nav className="flex-1 py-4">
        <div className="px-4 py-2">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider px-2 mb-2">Admin</div>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5
                  ${active
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="px-4 py-2 mt-2">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-wider px-2 mb-2">Public</div>
          {publicItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5
                  ${active
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <div className="text-xs text-white/50">e-b.co.il • v1.0.0</div>
      </div>
    </aside>
  );
}
