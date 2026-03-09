"use client";
import { useState, useEffect } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : ""; }
function authFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts.headers as Record<string, string>) } });
}

interface Project { id: string; name: string; total_units: number; }
interface Summary { total_registrants: number; by_status: Record<string, number>; total_apartments: number; taken_apartments: number; available_apartments: number; }
interface WinnerReport { lottery_number: number; id: string; first_name: string; last_name: string; id_number: string; priority: string; status: string; apartment_chosen_id?: string; email: string; }
interface ApartmentGrid { id: string; number: string; floor: number; rooms: number; sqm: number; price: number; taken: boolean; }

export default function ReportsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [winners, setWinners] = useState<WinnerReport[]>([]);
  const [apartments, setApartments] = useState<ApartmentGrid[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch(`${API_BASE}/api/projects`).then((r) => r.json()).then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const pid = projectId || undefined;
    const q = pid ? `?project_id=${pid}` : "";
    Promise.all([
      authFetch(`${API_BASE}/api/admin/reports/summary${q}`).then((r) => r.json()),
      authFetch(`${API_BASE}/api/admin/reports/winners${q}`).then((r) => r.json()),
      pid ? authFetch(`${API_BASE}/api/admin/apartments?project_id=${pid}`).then((r) => r.json()) : Promise.resolve([]),
    ])
      .then(([s, w, a]) => { setSummary(s); setWinners(w); setApartments(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  function exportCsv() {
    const q = projectId ? `?project_id=${projectId}` : "";
    window.open(`${API_BASE}/api/admin/reports/export/csv${q}`, "_blank");
  }

  const stats = summary?.by_status || {};

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#212121]">Reports & Analytics</h1>
        <Button variant="primary" onClick={exportCsv}>⬇ Export CSV</Button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <Select
          label=""
          options={[{ value: "", label: "All Projects" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#546E7A]">Loading reports...</div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Registrants" value={summary?.total_registrants || 0} icon="👥" color="#00838F" />
            <StatCard label="Approved" value={stats.APPROVED || 0} icon="✅" color="#2E7D32" />
            <StatCard label="Winners" value={(stats.WINNER || 0) + (stats.APARTMENT_CHOSEN || 0)} icon="🏆" color="#EF6C00" />
            <StatCard label="Waitlisted" value={stats.WAITLIST || 0} icon="📋" color="#6A1B9A" />
            <StatCard label="Pending Review" value={stats.PENDING_REVIEW || 0} icon="🕐" color="#546E7A" />
            <StatCard label="Needs Correction" value={stats.NEEDS_CORRECTION || 0} icon="⚠️" color="#F57F17" />
            <StatCard label="Rejected" value={stats.REJECTED || 0} icon="❌" color="#C62828" />
            <StatCard label="Available Apts" value={summary?.available_apartments || 0} icon="🏠" color="#00838F" />
          </div>

          {/* Winners Table */}
          {winners.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm mb-6">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#CFD8DC]">
                <h2 className="font-semibold text-[#212121]">Winner Status Report ({winners.length})</h2>
                <Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F5F7FA] border-b border-[#CFD8DC]">
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">ID (masked)</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Email</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Apartment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winners.map((w) => (
                      <tr key={w.id} className="border-b border-[#CFD8DC] hover:bg-[#F5F7FA]">
                        <td className="px-4 py-3 font-bold text-[#EF6C00]">#{w.lottery_number}</td>
                        <td className="px-4 py-3 font-medium">{w.first_name} {w.last_name}</td>
                        <td className="px-4 py-3 font-mono text-[#546E7A]">{w.id_number}</td>
                        <td className="px-4 py-3 text-[#546E7A]">{w.email}</td>
                        <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                        <td className="px-4 py-3 text-sm">
                          {w.apartment_chosen_id ? "✅ Assigned" : <span className="text-[#F57F17]">Pending</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Apartment Grid */}
          {apartments.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-[#212121] mb-4">Apartment Occupancy Grid</h2>
              <div className="flex gap-4 mb-3 text-sm">
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#00838F]" /> Assigned</div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#CFD8DC]" /> Available</div>
              </div>
              <div className="grid grid-cols-8 md:grid-cols-12 gap-1.5">
                {apartments.map((apt) => (
                  <div
                    key={apt.id}
                    title={`Apt ${apt.number} | Floor ${apt.floor} | ${apt.rooms} rooms | ${apt.sqm}m² | ₪${apt.price.toLocaleString()}`}
                    className="rounded aspect-square flex items-center justify-center text-xs font-bold cursor-help transition-transform hover:scale-110"
                    style={{ background: apt.taken ? "#00838F" : "#CFD8DC", color: apt.taken ? "white" : "#546E7A" }}
                  >
                    {apt.number}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-[#546E7A]">
                {apartments.filter((a) => a.taken).length} / {apartments.length} apartments assigned
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
