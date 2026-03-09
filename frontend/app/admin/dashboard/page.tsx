"use client";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Summary {
  total_registrants: number;
  by_status: Record<string, number>;
  total_apartments: number;
  taken_apartments: number;
  available_apartments: number;
}

export default function DashboardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<{ name: string; email: string; role: string } | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("auth_token");
    const a = localStorage.getItem("admin_info");
    if (t && a) {
      setToken(t);
      setAdmin(JSON.parse(a));
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE}/api/admin/reports/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      localStorage.setItem("auth_token", data.access_token);
      localStorage.setItem("admin_info", JSON.stringify({
        name: data.admin_name,
        email: data.admin_email,
        role: data.admin_role,
      }));
      setToken(data.access_token);
      setAdmin({ name: data.admin_name, email: data.admin_email, role: data.admin_role });
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    }
  }

  function handleLogout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("admin_info");
    setToken(null);
    setAdmin(null);
    setSummary(null);
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA]">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">🏠</div>
            <h1 className="text-xl font-bold text-[#212121]">Admin Login</h1>
            <p className="text-sm text-[#546E7A] mt-1">Ezra VaBitaron — Housing Lottery</p>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-[#212121] block mb-1">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                className="border border-[#CFD8DC] rounded-lg px-3 py-2 text-sm w-full focus:border-[#00838F] outline-none"
                placeholder="admin@e-b.co.il"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#212121] block mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                className="border border-[#CFD8DC] rounded-lg px-3 py-2 text-sm w-full focus:border-[#00838F] outline-none"
                required
              />
            </div>
            {loginError && (
              <p className="text-sm text-[#C62828] bg-[#FFEBEE] px-3 py-2 rounded-lg">{loginError}</p>
            )}
            <Button type="submit" variant="primary" className="w-full">Login</Button>
          </form>
          <p className="text-xs text-[#546E7A] text-center mt-4">
            Demo: super_admin@e-b.co.il / admin123
          </p>
        </div>
      </div>
    );
  }

  const stats = summary?.by_status || {};

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#212121]">Dashboard</h1>
          <p className="text-sm text-[#546E7A]">Welcome back, {admin?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-right">
            <div className="font-medium text-[#212121]">{admin?.email}</div>
            <div className="text-[#546E7A] capitalize">{admin?.role?.replace("_", " ").toLowerCase()}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#546E7A]">Loading stats...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard label="Total Registrants" value={summary?.total_registrants || 0} icon="👥" color="#00838F" />
            <StatCard label="Approved" value={stats.APPROVED || 0} icon="✅" color="#2E7D32" />
            <StatCard label="AI Verified" value={stats.AI_VERIFIED || 0} icon="🤖" color="#1565C0" />
            <StatCard label="Needs Correction" value={stats.NEEDS_CORRECTION || 0} icon="⚠️" color="#F57F17" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Pending Review" value={stats.PENDING_REVIEW || 0} icon="🕐" color="#546E7A" />
            <StatCard label="Winners" value={(stats.WINNER || 0) + (stats.APARTMENT_CHOSEN || 0)} icon="🏆" color="#EF6C00" />
            <StatCard label="Waitlisted" value={stats.WAITLIST || 0} icon="📋" color="#6A1B9A" />
            <StatCard label="Available Apts" value={summary?.available_apartments || 0} icon="🏠" color="#00838F" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm md:col-span-2">
              <h3 className="font-semibold text-[#212121] mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => window.location.href = "/admin/qa"}>Review Documents</Button>
                <Button variant="accent" onClick={() => window.location.href = "/admin/lottery"}>Run Lottery</Button>
                <Button variant="outline" onClick={() => window.location.href = "/admin/winners"}>Manage Winners</Button>
                <Button variant="ghost" onClick={() => window.open("/register", "_blank")}>Registration Form</Button>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-[#212121] mb-3">Apartment Occupancy</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#546E7A]">Total</span>
                  <span className="font-medium">{summary?.total_apartments || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#546E7A]">Assigned</span>
                  <span className="font-medium text-[#2E7D32]">{summary?.taken_apartments || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#546E7A]">Available</span>
                  <span className="font-medium text-[#EF6C00]">{summary?.available_apartments || 0}</span>
                </div>
                {summary && summary.total_apartments > 0 && (
                  <div className="mt-2">
                    <div className="bg-[#E0F2F1] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#00838F] h-2 rounded-full"
                        style={{ width: `${(summary.taken_apartments / summary.total_apartments) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-[#546E7A] mt-1">
                      {Math.round((summary.taken_apartments / summary.total_apartments) * 100)}% occupied
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
