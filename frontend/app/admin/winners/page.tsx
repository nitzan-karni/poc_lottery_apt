"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
function getToken() { return typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : ""; }
function authFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts.headers as Record<string, string>) } });
}

interface Apartment { id: string; project_id: string; number: string; floor: number; rooms: number; sqm: number; price: number; taken: boolean; }
interface Candidate { id: string; first_name: string; last_name: string; id_number: string; priority: string; status: string; lottery_number?: number; apartment_chosen_id?: string; }
interface Project { id: string; name: string; }

export default function WinnersPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [winners, setWinners] = useState<Candidate[]>([]);
  const [waitlist, setWaitlist] = useState<Candidate[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [assignModal, setAssignModal] = useState<Candidate | null>(null);
  const [toast, setToast] = useState("");
  const [promoting, setPromoting] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    authFetch(`${API_BASE}/api/projects`).then((r) => r.json()).then(setProjects).catch(console.error);
  }, []);

  const loadData = useCallback(() => {
    if (!projectId) return;
    authFetch(`${API_BASE}/api/admin/candidates?project_id=${projectId}&status=WINNER&page_size=200`)
      .then((r) => r.json()).then(setWinners).catch(console.error);
    authFetch(`${API_BASE}/api/admin/candidates?project_id=${projectId}&status=WAITLIST&page_size=200`)
      .then((r) => r.json()).then(setWaitlist).catch(console.error);
    authFetch(`${API_BASE}/api/admin/apartments?project_id=${projectId}`)
      .then((r) => r.json()).then(setApartments).catch(console.error);
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function assignApartment(apartmentId: string, candidateId: string) {
    try {
      await authFetch(`${API_BASE}/api/admin/apartments/${apartmentId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ candidate_id: candidateId }),
      });
      showToast("Apartment assigned successfully!");
      setAssignModal(null);
      loadData();
    } catch {
      showToast("Failed to assign apartment");
    }
  }

  async function promoteNext() {
    if (!projectId) return;
    setPromoting(true);
    try {
      const res = await authFetch(`${API_BASE}/api/admin/apartments/waitlist/promote?project_id=${projectId}`, { method: "POST" });
      const data = await res.json();
      if (data.reevaluation_required) {
        alert(`⚠️ ${data.message}`);
      }
      showToast("Candidate promoted to winner!");
      loadData();
    } catch {
      showToast("Failed to promote candidate");
    } finally {
      setPromoting(false);
    }
  }

  const availableApartments = apartments.filter((a) => !a.taken);

  return (
    <div className="p-6">
      {toast && <div className="fixed top-4 right-4 bg-[#212121] text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">{toast}</div>}

      <h1 className="text-2xl font-bold text-[#212121] mb-6">Winner & Apartment Management</h1>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <Select
          label="Select Project"
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="Choose a project..."
        />
      </div>

      {projectId && (
        <>
          {/* Winners Table */}
          <div className="bg-white rounded-xl shadow-sm mb-6">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#CFD8DC]">
              <h2 className="font-semibold text-[#212121]">Winners ({winners.length})</h2>
              <span className="text-sm text-[#546E7A]">{availableApartments.length} apartments available</span>
            </div>
            {winners.length === 0 ? (
              <div className="text-center py-12 text-[#546E7A]">No winners yet. Run the lottery first.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F5F7FA] border-b border-[#CFD8DC]">
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Priority</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Status</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Apartment</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winners.sort((a, b) => (a.lottery_number || 0) - (b.lottery_number || 0)).map((c) => (
                      <tr key={c.id} className="border-b border-[#CFD8DC] bg-[#E8F5E9]/30">
                        <td className="px-4 py-3 font-bold text-[#EF6C00]">#{c.lottery_number}</td>
                        <td className="px-4 py-3 font-medium">{c.first_name} {c.last_name}</td>
                        <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-3 text-sm text-[#546E7A]">
                          {c.apartment_chosen_id ? "✅ Assigned" : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {!c.apartment_chosen_id && availableApartments.length > 0 && (
                            <Button size="sm" variant="primary" onClick={() => setAssignModal(c)}>
                              Assign Apt
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Also show APARTMENT_CHOSEN */}
          <div className="bg-white rounded-xl shadow-sm mb-6">
            <div className="px-5 py-4 border-b border-[#CFD8DC]">
              <h2 className="font-semibold text-[#212121]">Waitlist ({waitlist.length})</h2>
            </div>
            <div className="p-4 flex items-center justify-between">
              <p className="text-sm text-[#546E7A]">Promote the next waitlisted candidate to winner status</p>
              <Button variant="accent" onClick={promoteNext} loading={promoting} disabled={waitlist.length === 0}>
                Promote Next →
              </Button>
            </div>
            {waitlist.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F5F7FA] border-b border-[#CFD8DC]">
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Position</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {waitlist.sort((a, b) => (a.lottery_number || 0) - (b.lottery_number || 0)).map((c) => (
                      <tr key={c.id} className="border-b border-[#CFD8DC]">
                        <td className="px-4 py-3 font-bold text-[#6A1B9A]">#{c.lottery_number}</td>
                        <td className="px-4 py-3">{c.first_name} {c.last_name}</td>
                        <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Assign Apartment Modal */}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title={`Assign Apartment — ${assignModal?.first_name} ${assignModal?.last_name}`} maxWidth="max-w-3xl">
        {assignModal && (
          <div>
            <p className="text-sm text-[#546E7A] mb-4">{availableApartments.length} apartments available. Click to assign.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableApartments.map((apt) => (
                <div
                  key={apt.id}
                  className="border-2 border-[#CFD8DC] rounded-xl p-4 cursor-pointer hover:border-[#00838F] hover:bg-[#E0F2F1] transition-all"
                  onClick={() => assignApartment(apt.id, assignModal.id)}
                >
                  <div className="font-bold text-[#00838F] text-lg">Apt {apt.number}</div>
                  <div className="text-xs text-[#546E7A] mt-1">Floor {apt.floor}</div>
                  <div className="text-sm font-medium mt-1">{apt.rooms} rooms · {apt.sqm}m²</div>
                  <div className="text-[#EF6C00] font-semibold mt-1">₪{apt.price.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
