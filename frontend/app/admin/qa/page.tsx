"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { StatusBadge, PriorityBadge, Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DOCUMENT_TYPE_LABELS, STATUS_LABELS, PRIORITY_LABELS } from "@/lib/constants";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "";
}

function authFetch(url: string, options: RequestInit = {}) {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers as Record<string, string>),
    },
  });
}

interface Document {
  id: string;
  type: string;
  filename: string;
  verified: boolean;
  uploaded_at: string;
  mime_type: string;
}

interface VerificationResult {
  overall_pass: boolean;
  id_number_matches_card?: boolean;
  name_matches_card?: boolean;
  id_numbers_consistent?: boolean;
  names_consistent?: boolean;
  form_date_valid?: boolean;
  has_proper_stamp?: boolean;
  eligibility_number?: string;
  is_apartmentless?: boolean;
  raw_ai_response?: { confidence_notes?: string };
}

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  id_number: string;
  email: string;
  phone?: string;
  project_id: string;
  priority: string;
  status: string;
  lottery_number?: number;
  registration_date: string;
  appeal_deadline?: string;
  notes?: string;
  documents: Document[];
  verification_result?: VerificationResult;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const VERIFICATION_CHECKS = [
  { key: "id_number_matches_card", label: "ID number matches card" },
  { key: "name_matches_card", label: "Name matches card" },
  { key: "id_numbers_consistent", label: "ID numbers consistent across docs" },
  { key: "names_consistent", label: "Names consistent across docs" },
  { key: "form_date_valid", label: "Eligibility form date valid" },
  { key: "has_proper_stamp", label: "Official stamp present" },
  { key: "is_apartmentless", label: "Apartment-free status confirmed" },
  { key: "two_distinct_ids", label: "Two distinct IDs uploaded" },
];

function maskId(id: string) {
  return id.slice(0, 3) + "•••" + id.slice(-3);
}

export default function QAPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [docUrl, setDocUrl] = useState<{ url: string; mime: string; name: string } | null>(null);
  const [correctionModal, setCorrectionModal] = useState(false);
  const [correctionText, setCorrectionText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadCandidates = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);
    authFetch(`${API_BASE}/api/admin/candidates?${params}`)
      .then((r) => r.json())
      .then(setCandidates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, search]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  async function updateStatus(candidateId: string, status: string) {
    setActionLoading(true);
    try {
      await authFetch(`${API_BASE}/api/admin/candidates/${candidateId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      showToast(`Status updated to ${STATUS_LABELS[status] || status}`);
      loadCandidates();
      if (selected?.id === candidateId) setSelected((s) => s ? { ...s, status } : s);
    } catch {
      showToast("Failed to update status");
    } finally {
      setActionLoading(false);
    }
  }

  async function sendCorrection() {
    if (!selected || !correctionText.trim()) return;
    setActionLoading(true);
    try {
      await authFetch(`${API_BASE}/api/admin/candidates/${selected.id}/email`, {
        method: "POST",
        body: JSON.stringify({
          to: selected.email,
          subject: "Affordable Housing Lottery — Document Correction Required",
          body: `<div style="font-family:Arial,sans-serif"><p>Dear ${selected.first_name} ${selected.last_name},</p><p>The following corrections are required:</p><div style="background:#FFF8E1;border-left:4px solid #F57F17;padding:12px;margin:12px 0">${correctionText}</div><p>Please resubmit the corrected documents. Contact: tlv4less@e-b.co.il</p></div>`,
          type: "CORRECTION_REQUEST",
        }),
      });
      showToast("Correction email sent");
      setCorrectionModal(false);
      setCorrectionText("");
      loadCandidates();
    } catch {
      showToast("Failed to send email");
    } finally {
      setActionLoading(false);
    }
  }

  async function viewDocument(docId: string) {
    if (!selected) return;
    try {
      const res = await authFetch(`${API_BASE}/api/admin/candidates/${selected.id}/document/${docId}/url`);
      const data = await res.json();
      setDocUrl({ url: data.url, mime: data.mime_type, name: data.filename });
    } catch {
      showToast("Failed to load document");
    }
  }

  async function rerunVerification() {
    if (!selected) return;
    setActionLoading(true);
    try {
      await authFetch(`${API_BASE}/api/admin/candidates/${selected.id}/verify`, { method: "POST" });
      showToast("Verification job enqueued");
    } catch {
      showToast("Failed to enqueue verification");
    } finally {
      setActionLoading(false);
    }
  }

  const vr = selected?.verification_result;

  return (
    <div className="p-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#212121] text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">{toast}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#212121]">Document QA</h1>
        <span className="text-sm text-[#546E7A]">{candidates.length} candidates</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48">
          <Input placeholder="Search name, ID, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-w-40"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-20 text-[#546E7A]">Loading candidates...</div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-20 text-[#546E7A]">No candidates found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#CFD8DC] bg-[#F5F7FA]">
                  <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">AI Check</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#546E7A]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#CFD8DC] hover:bg-[#F5F7FA] cursor-pointer"
                    onClick={() => setSelected(c)}
                  >
                    <td className="px-4 py-3 font-medium text-[#00838F]">
                      {c.first_name} {c.last_name}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#546E7A]">{maskId(c.id_number)}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                    <td className="px-4 py-3">
                      {c.verification_result ? (
                        c.verification_result.overall_pass
                          ? <span className="text-[#2E7D32]">✅ Pass</span>
                          : <span className="text-[#C62828]">❌ Fail</span>
                      ) : (
                        <span className="text-[#546E7A]">⏳ Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button size="sm" variant="success" onClick={() => updateStatus(c.id, "APPROVED")} loading={actionLoading}>✓</Button>
                        <Button size="sm" variant="danger" onClick={() => updateStatus(c.id, "REJECTED")} loading={actionLoading}>✕</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`${selected.first_name} ${selected.last_name}`} maxWidth="max-w-4xl">
          <div className="flex flex-col gap-6">
            {/* Candidate Info */}
            <div>
              <h3 className="font-semibold text-[#212121] mb-3">Candidate Information</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["ID Number", selected.id_number],
                  ["Email", selected.email],
                  ["Phone", selected.phone || "—"],
                  ["Priority", PRIORITY_LABELS[selected.priority] || selected.priority],
                  ["Status", STATUS_LABELS[selected.status] || selected.status],
                  ["Registered", new Date(selected.registration_date).toLocaleDateString()],
                  ...(selected.appeal_deadline
                    ? [["Appeal Deadline", new Date(selected.appeal_deadline).toLocaleDateString()]]
                    : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-[#546E7A]">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Verification */}
            {vr && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-semibold text-[#212121]">AI Verification Results</h3>
                  <Badge type={vr.overall_pass ? "APPROVED" : "REJECTED"}>
                    {vr.overall_pass ? "✅ PASS" : "❌ FAIL"}
                  </Badge>
                </div>
                <div className="flex flex-col gap-2">
                  {VERIFICATION_CHECKS.map(({ key, label }) => {
                    const val = (vr as unknown as Record<string, boolean | undefined>)[key];
                    return (
                      <div key={key} className="flex items-center justify-between text-sm py-1.5 border-b border-[#F5F7FA]">
                        <span className="text-[#546E7A]">{label}</span>
                        <span>
                          {val === true ? "✅" : val === false ? "❌" : "—"}
                        </span>
                      </div>
                    );
                  })}
                  {vr.eligibility_number && (
                    <div className="flex justify-between text-sm py-1.5">
                      <span className="text-[#546E7A]">Eligibility #</span>
                      <span className="font-mono">{vr.eligibility_number}</span>
                    </div>
                  )}
                  {vr.raw_ai_response?.confidence_notes && (
                    <div className="mt-2 bg-[#F5F7FA] rounded-lg p-3 text-xs text-[#546E7A]">
                      <strong>Notes:</strong> {vr.raw_ai_response.confidence_notes}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Documents */}
            <div>
              <h3 className="font-semibold text-[#212121] mb-3">Documents</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selected.documents.map((doc) => (
                  <div key={doc.id} className="border border-[#CFD8DC] rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{DOCUMENT_TYPE_LABELS[doc.type] || doc.type}</span>
                      <Badge type={doc.verified ? "verified" : "unverified"}>
                        {doc.verified ? "Verified" : "Unverified"}
                      </Badge>
                    </div>
                    <span className="text-xs text-[#546E7A] truncate">{doc.filename}</span>
                    <Button size="sm" variant="outline" onClick={() => viewDocument(doc.id)}>
                      View Document
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-[#CFD8DC]">
              <Button variant="success" onClick={() => { updateStatus(selected.id, "APPROVED"); setSelected(null); }} loading={actionLoading}>
                ✓ Approve
              </Button>
              <Button variant="danger" onClick={() => { updateStatus(selected.id, "REJECTED"); setSelected(null); }} loading={actionLoading}>
                ✕ Reject
              </Button>
              <Button variant="accent" onClick={() => setCorrectionModal(true)}>
                ⚠ Send Correction
              </Button>
              <Button variant="ghost" onClick={rerunVerification} loading={actionLoading}>
                🤖 Re-run AI Verification
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Document Viewer */}
      <Modal open={!!docUrl} onClose={() => setDocUrl(null)} title={docUrl?.name || "Document"} maxWidth="max-w-4xl">
        {docUrl && (
          <div className="flex flex-col gap-4">
            {docUrl.mime === "application/pdf" ? (
              <iframe src={docUrl.url} className="w-full h-[60vh] rounded-lg border border-[#CFD8DC]" />
            ) : (
              <img src={docUrl.url} alt="Document" className="max-w-full rounded-lg border border-[#CFD8DC]" />
            )}
            <a href={docUrl.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">Open in New Tab</Button>
            </a>
          </div>
        )}
      </Modal>

      {/* Correction Email Modal */}
      <Modal open={correctionModal} onClose={() => setCorrectionModal(false)} title="Send Correction Request">
        <div className="flex flex-col gap-4">
          <div className="text-sm text-[#546E7A]">
            To: <strong>{selected?.email}</strong>
          </div>
          <div className="text-sm text-[#546E7A]">
            Subject: <strong>Affordable Housing Lottery — Document Correction Required</strong>
          </div>
          <div>
            <label className="text-sm font-medium text-[#212121] block mb-1">
              Describe what needs to be corrected <span className="text-[#C62828]">*</span>
            </label>
            <textarea
              value={correctionText}
              onChange={(e) => setCorrectionText(e.target.value)}
              rows={5}
              placeholder="e.g., Your ID card image is blurry. Please re-upload a clear scan. Your eligibility certificate appears expired — please obtain an updated one."
              className="w-full border border-[#CFD8DC] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00838F] resize-none"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="accent" onClick={sendCorrection} loading={actionLoading} disabled={!correctionText.trim()}>
              Send Email
            </Button>
            <Button variant="ghost" onClick={() => setCorrectionModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
