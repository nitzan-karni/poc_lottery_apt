"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { PRIORITY_LABELS, PRIORITY_WEIGHTS } from "@/lib/constants";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "";
}
function authFetch(url: string, opts: RequestInit = {}) {
  return fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts.headers as Record<string, string>) },
  });
}

interface Project {
  id: string;
  name: string;
  total_units: number;
  status: string;
}
interface LotteryResult {
  candidateId: string;
  lotteryNumber: number;
  status: string;
}
interface LotteryRecord {
  id: string;
  project_id: string;
  drawn_at: string;
  seed?: string;
  results: LotteryResult[];
}
interface CandidateSummary {
  id: string;
  first_name: string;
  last_name: string;
  priority: string;
  status: string;
  lottery_number?: number;
}

export default function LotteryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [approved, setApproved] = useState<CandidateSummary[]>([]);
  const [lotteries, setLotteries] = useState<LotteryRecord[]>([]);
  const [selectedLottery, setSelectedLottery] = useState<LotteryRecord | null>(null);
  const [lotteryResults, setLotteryResults] = useState<(LotteryResult & { candidate?: CandidateSummary })[]>([]);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState("");
  const [adminName, setAdminName] = useState("Admin");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  useEffect(() => {
    const a = localStorage.getItem("admin_info");
    if (a) setAdminName(JSON.parse(a).name || "Admin");
    authFetch(`${API_BASE}/api/projects`).then((r) => r.json()).then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    if (!projectId) return;
    authFetch(`${API_BASE}/api/admin/candidates?project_id=${projectId}&status=APPROVED&page_size=200`)
      .then((r) => r.json()).then(setApproved).catch(console.error);
    authFetch(`${API_BASE}/api/admin/lottery/project/${projectId}`)
      .then((r) => r.json()).then(setLotteries).catch(console.error);
  }, [projectId]);

  const project = projects.find((p) => p.id === projectId);

  const priorityBreakdown = Object.entries(PRIORITY_LABELS).map(([key, label]) => ({
    key, label,
    count: approved.filter((c) => c.priority === key).length,
    weight: PRIORITY_WEIGHTS[key],
  })).filter((p) => p.count > 0);

  async function runLottery() {
    if (!project) return;
    if (!confirm(`Run lottery for ${project.name}? This will send emails to all ${approved.length} approved candidates.`)) return;
    setRunning(true);
    try {
      const res = await authFetch(`${API_BASE}/api/admin/lottery/run`, {
        method: "POST",
        body: JSON.stringify({ project_id: projectId, drawn_by: adminName }),
      });
      if (!res.ok) throw new Error(await res.text());
      const record: LotteryRecord = await res.json();
      setSelectedLottery(record);
      setLotteries((prev) => [record, ...prev]);
      showToast(`Lottery drawn! ${record.results.filter((r) => r.status === "WINNER").length} winners selected.`);
      // Load candidate details for results display
      const candidateMap: Record<string, CandidateSummary> = {};
      approved.forEach((c) => { candidateMap[c.id] = c; });
      setLotteryResults(record.results.map((r) => ({ ...r, candidate: candidateMap[r.candidateId] })));
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Lottery failed");
    } finally {
      setRunning(false);
    }
  }

  async function viewLottery(lottery: LotteryRecord) {
    setSelectedLottery(lottery);
    const res = await authFetch(`${API_BASE}/api/admin/candidates?project_id=${projectId}&page_size=200`);
    const allCandidates: CandidateSummary[] = await res.json();
    const candidateMap: Record<string, CandidateSummary> = {};
    allCandidates.forEach((c) => { candidateMap[c.id] = c; });
    setLotteryResults(lottery.results.map((r) => ({ ...r, candidate: candidateMap[r.candidateId] })));
  }

  return (
    <div className="p-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#212121] text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">{toast}</div>
      )}

      <h1 className="text-2xl font-bold text-[#212121] mb-6">Lottery Engine</h1>

      {/* Project Selector */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
        <Select
          label="Select Project"
          options={projects.map((p) => ({ value: p.id, label: `${p.name} (${p.status})` }))}
          value={projectId}
          onChange={(e) => { setProjectId(e.target.value); setSelectedLottery(null); setLotteryResults([]); }}
          placeholder="Choose a project..."
        />
      </div>

      {projectId && project && !selectedLottery && (
        <>
          {/* Pre-Lottery Stats */}
          <div className="bg-white rounded-xl p-5 shadow-sm mb-6">
            <h2 className="font-semibold text-[#212121] mb-4">Pre-Lottery Overview — {project.name}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-[#E0F2F1] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[#00838F]">{approved.length}</div>
                <div className="text-xs text-[#546E7A]">Approved Candidates</div>
              </div>
              <div className="bg-[#FFF3E0] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[#EF6C00]">{project.total_units}</div>
                <div className="text-xs text-[#546E7A]">Available Units</div>
              </div>
              <div className="bg-[#E8F5E9] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[#2E7D32]">{Math.min(approved.length, project.total_units)}</div>
                <div className="text-xs text-[#546E7A]">Will Be Winners</div>
              </div>
              <div className="bg-[#EDE7F6] rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[#6A1B9A]">{Math.max(0, approved.length - project.total_units)}</div>
                <div className="text-xs text-[#546E7A]">Will Be Waitlisted</div>
              </div>
            </div>

            {priorityBreakdown.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[#546E7A] mb-2">Priority Breakdown</h3>
                <div className="flex flex-col gap-2">
                  {priorityBreakdown.map((p) => (
                    <div key={p.key} className="flex items-center gap-3 text-sm">
                      <span className="w-40 text-[#546E7A]">{p.label}</span>
                      <span className="font-mono text-[#212121] w-8">{p.count}×</span>
                      <span className="text-[#00838F]">weight {p.weight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {approved.length === 0 ? (
              <div className="mt-4 p-3 bg-[#FFF3E0] rounded-lg text-sm text-[#EF6C00]">
                No approved candidates found for this project. Approve candidates in the Document QA panel first.
              </div>
            ) : (
              <div className="mt-6">
                <Button variant="accent" size="lg" onClick={runLottery} loading={running} className="w-full">
                  🎲 Run Lottery Draw for {project.name}
                </Button>
                <p className="text-xs text-[#546E7A] text-center mt-2">
                  This will randomly select winners using priority-weighted sampling. All participants will be emailed automatically.
                </p>
              </div>
            )}
          </div>

          {/* Previous Lotteries */}
          {lotteries.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-[#212121] mb-3">Previous Draws</h2>
              <div className="flex flex-col gap-2">
                {lotteries.map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-3 border border-[#CFD8DC] rounded-lg">
                    <div>
                      <div className="text-sm font-medium">{new Date(l.drawn_at).toLocaleString()}</div>
                      <div className="text-xs text-[#546E7A]">{l.results.filter((r) => r.status === "WINNER").length} winners · Seed: {l.seed?.slice(0, 8)}...</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => viewLottery(l)}>View Results</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Results View */}
      {selectedLottery && lotteryResults.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[#212121]">Lottery Results</h2>
              <p className="text-xs text-[#546E7A]">
                Drawn: {new Date(selectedLottery.drawn_at).toLocaleString()} · Seed: {selectedLottery.seed?.slice(0, 16)}...
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => { setSelectedLottery(null); setLotteryResults([]); }}>← Back</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#CFD8DC] bg-[#F5F7FA]">
                  <th className="text-left px-3 py-2 font-semibold text-[#546E7A]">#</th>
                  <th className="text-left px-3 py-2 font-semibold text-[#546E7A]">Name</th>
                  <th className="text-left px-3 py-2 font-semibold text-[#546E7A]">Priority</th>
                  <th className="text-left px-3 py-2 font-semibold text-[#546E7A]">Result</th>
                </tr>
              </thead>
              <tbody>
                {lotteryResults.map((r) => (
                  <tr
                    key={r.candidateId}
                    className={`border-b border-[#CFD8DC] ${r.status === "WINNER" ? "bg-[#E8F5E9]" : ""}`}
                  >
                    <td className="px-3 py-2 font-bold text-[#EF6C00]">#{r.lotteryNumber}</td>
                    <td className="px-3 py-2">
                      {r.candidate ? `${r.candidate.first_name} ${r.candidate.last_name}` : r.candidateId.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2">
                      {r.candidate && <PriorityBadge priority={r.candidate.priority} />}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status === "WINNER" ? "WINNER" : "WAITLIST"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
