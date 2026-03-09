"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { validateIsraeliId } from "@/lib/validators";
import { PRIORITY_LABELS } from "@/lib/constants";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Project {
  id: string;
  name: string;
  address: string;
  deadline: string;
}

const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }));
const DOCUMENT_TYPE_OPTIONS = [
  { value: "ID_CARD", label: "ID Card" },
  { value: "ELIGIBILITY_CERTIFICATE", label: "Eligibility Certificate" },
  { value: "DISABILITY_CERTIFICATE", label: "Disability Certificate" },
  { value: "MILITARY_SERVICE_PROOF", label: "Military Service Proof" },
  { value: "RESIDENCY_PROOF", label: "Residency Proof" },
  { value: "FINANCIAL_DOCUMENT", label: "Financial Document" },
  { value: "OTHER", label: "Other" },
];

interface ExtraFile {
  file: File;
  type: string;
}

export default function RegisterPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState({
    first_name: "", last_name: "", id_number: "", email: "",
    phone: "", project_id: "", priority: "STANDARD",
  });
  const [idCard, setIdCard] = useState<File | null>(null);
  const [eligibilityCert, setEligibilityCert] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<ExtraFile[]>([]);
  const [disclaimer, setDisclaimer] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ message: string; reference: string } | null>(null);

  const idCardRef = useRef<HTMLInputElement>(null);
  const eligRef = useRef<HTMLInputElement>(null);
  const extraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/projects/open`)
      .then((r) => r.json())
      .then(setProjects)
      .catch(console.error);
  }, []);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.first_name.trim()) errs.first_name = "Required";
    if (!form.last_name.trim()) errs.last_name = "Required";
    if (!validateIsraeliId(form.id_number)) errs.id_number = "Invalid Israeli ID (must be 9 digits with valid checksum)";
    if (!form.email.includes("@")) errs.email = "Invalid email";
    if (!form.project_id) errs.project_id = "Please select a project";
    if (!idCard) errs.id_card = "ID Card is required";
    if (!eligibilityCert) errs.eligibility = "Eligibility Certificate is required";
    if (!disclaimer) errs.disclaimer = "You must accept the disclaimer";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("id_card", idCard!);
      fd.append("eligibility_certificate", eligibilityCert!);
      extraFiles.forEach((ef) => fd.append("extra_files", ef.file));
      fd.append("extra_types", extraFiles.map((ef) => ef.type).join(","));

      const res = await fetch(`${API_BASE}/api/register`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
      setSuccess({ message: data.message, reference: data.reference });
    } catch (err: unknown) {
      setErrors({ submit: err instanceof Error ? err.message : "Submission failed" });
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-[#2E7D32] mb-2">Registration Submitted!</h2>
          <p className="text-[#546E7A] mb-4">{success.message}</p>
          <div className="bg-[#E0F2F1] rounded-xl p-4 mb-6">
            <p className="text-sm text-[#546E7A]">Your reference number</p>
            <p className="text-2xl font-bold text-[#00838F] font-mono">{success.reference}</p>
          </div>
          <p className="text-sm text-[#546E7A] mb-4">
            Your documents are being verified. You will receive an email with the result.
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/search"}>Check Your Status</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏠</div>
          <h1 className="text-3xl font-bold text-[#00838F]">Housing Lottery Registration</h1>
          <p className="text-[#546E7A] mt-2">Ezra VaBitaron — Tel Aviv-Yafo Municipality</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-6">
          {/* Personal Info */}
          <div>
            <h2 className="font-semibold text-[#212121] mb-4 pb-2 border-b border-[#CFD8DC]">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="First Name" value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} error={errors.first_name} required />
              <Input label="Last Name" value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} error={errors.last_name} required />
              <Input label="ID Number (ת.ז)" value={form.id_number} onChange={(e) => setForm((f) => ({ ...f, id_number: e.target.value.replace(/\D/g, "").slice(0, 9) }))} error={errors.id_number} hint="9-digit Israeli Teudat Zehut" required />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} type="tel" />
              <div className="sm:col-span-2">
                <Input label="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} type="email" error={errors.email} required />
              </div>
            </div>
          </div>

          {/* Project & Priority */}
          <div>
            <h2 className="font-semibold text-[#212121] mb-4 pb-2 border-b border-[#CFD8DC]">Project & Priority</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Project"
                options={projects.map((p) => ({ value: p.id, label: `${p.name} — Deadline: ${new Date(p.deadline).toLocaleDateString()}` }))}
                value={form.project_id}
                onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))}
                placeholder="Select a project"
                error={errors.project_id}
                required
              />
              <Select
                label="Priority Category"
                options={PRIORITY_OPTIONS}
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Required Documents */}
          <div>
            <h2 className="font-semibold text-[#212121] mb-4 pb-2 border-b border-[#CFD8DC]">Required Documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[#212121] block mb-1">
                  ID Card <span className="text-[#C62828]">*</span>
                </label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-[#00838F] transition-colors"
                  style={{ borderColor: errors.id_card ? "#C62828" : idCard ? "#2E7D32" : "#CFD8DC" }}
                  onClick={() => idCardRef.current?.click()}
                >
                  <input ref={idCardRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setIdCard(e.target.files?.[0] || null)} />
                  {idCard ? (
                    <p className="text-sm text-[#2E7D32] font-medium">✅ {idCard.name}</p>
                  ) : (
                    <p className="text-sm text-[#546E7A]">Click or drag to upload ID Card</p>
                  )}
                </div>
                {errors.id_card && <p className="text-xs text-[#C62828] mt-1">{errors.id_card}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-[#212121] block mb-1">
                  Eligibility Certificate <span className="text-[#C62828]">*</span>
                </label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-[#00838F] transition-colors"
                  style={{ borderColor: errors.eligibility ? "#C62828" : eligibilityCert ? "#2E7D32" : "#CFD8DC" }}
                  onClick={() => eligRef.current?.click()}
                >
                  <input ref={eligRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setEligibilityCert(e.target.files?.[0] || null)} />
                  {eligibilityCert ? (
                    <p className="text-sm text-[#2E7D32] font-medium">✅ {eligibilityCert.name}</p>
                  ) : (
                    <p className="text-sm text-[#546E7A]">Click or drag to upload Certificate</p>
                  )}
                </div>
                {errors.eligibility && <p className="text-xs text-[#C62828] mt-1">{errors.eligibility}</p>}
              </div>
            </div>
          </div>

          {/* Optional Documents */}
          <div>
            <h2 className="font-semibold text-[#212121] mb-4 pb-2 border-b border-[#CFD8DC]">Additional Documents (Optional)</h2>
            {extraFiles.map((ef, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="text-sm text-[#546E7A] flex-1 truncate">{ef.file.name}</span>
                <select
                  value={ef.type}
                  onChange={(e) => setExtraFiles((prev) => prev.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}
                  className="border border-[#CFD8DC] rounded px-2 py-1 text-xs"
                >
                  {DOCUMENT_TYPE_OPTIONS.filter((o) => o.value !== "ID_CARD" && o.value !== "ELIGIBILITY_CERTIFICATE").map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button type="button" onClick={() => setExtraFiles((prev) => prev.filter((_, j) => j !== i))} className="text-[#C62828] text-sm">✕</button>
              </div>
            ))}
            <input ref={extraRef} type="file" className="hidden" multiple accept="image/*,application/pdf"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setExtraFiles((prev) => [...prev, ...files.map((f) => ({ file: f, type: "OTHER" }))]);
              }}
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => extraRef.current?.click()}>
              + Add Document
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="bg-[#FFF8E1] border border-[#F57F17] rounded-xl p-4">
            <p className="text-sm text-[#212121] mb-3">
              <strong>Legal Disclaimer:</strong> Providing false or misleading information at any stage may result in disqualification,
              exclusion from future projects (temporarily or permanently), criminal proceedings, and charges of{" "}
              <strong>₪5,000/month</strong> (+ prime rate + 6.5% interest) for each month of actual occupancy if discovered
              after a rental contract is signed.
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={disclaimer} onChange={(e) => setDisclaimer(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm font-medium text-[#212121]">I confirm that all information provided is accurate and complete.</span>
            </label>
            {errors.disclaimer && <p className="text-xs text-[#C62828] mt-2">{errors.disclaimer}</p>}
          </div>

          {errors.submit && (
            <div className="bg-[#FFEBEE] border border-[#C62828] rounded-lg p-3 text-sm text-[#C62828]">
              {errors.submit}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
            Submit Registration
          </Button>
        </form>
      </div>
    </div>
  );
}
