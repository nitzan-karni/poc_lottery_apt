import { useState, useMemo, useCallback } from "react";

// ─── Synthetic Data ───────────────────────────────────────────────
const PROJECTS = [
  { id: "P001", name: "Neve Ofer Towers", address: "12 Herzl St, Tel Aviv", units: 48, status: "active", deadline: "2026-04-15" },
  { id: "P002", name: "Florentin Gardens", address: "88 Florentin St, Tel Aviv", units: 32, status: "upcoming", deadline: "2026-06-01" },
];

const PRIORITY_TYPES = [
  { key: "disabled", label: "Disabled", weight: 5 },
  { key: "reserves", label: "Military Reserves", weight: 4 },
  { key: "local", label: "Local Resident", weight: 3 },
  { key: "young_couple", label: "Young Couple", weight: 2 },
  { key: "none", label: "Standard", weight: 1 },
];

const STATUSES = ["pending_review", "approved", "rejected", "needs_correction", "winner", "waitlist"];

const STATUS_LABELS = {
  pending_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  needs_correction: "Needs Correction",
  winner: "Winner",
  waitlist: "Waitlist",
};

const firstNames = ["Yael", "Noam", "Tamar", "Oren", "Shira", "Amit", "Dalia", "Eitan", "Maya", "Lior", "Noa", "Avi", "Michal", "Gal", "Roni", "Dana", "Idan", "Tali", "Ofir", "Shai", "Ella", "Rotem", "Yonatan", "Keren", "Omri", "Hila", "Alon", "Neta", "Uri", "Sapir"];
const lastNames = ["Cohen", "Levi", "Mizrahi", "Peretz", "Biton", "Dahan", "Avraham", "Friedman", "Shapiro", "Goldstein", "Ben-David", "Katz", "Azulay", "Malka", "Yosef", "Haim", "Ochana", "Hadad", "Sasson", "Amar"];

function generateID() {
  return String(Math.floor(100000000 + Math.random() * 900000000));
}

function generatePhone() {
  return `05${Math.floor(10000000 + Math.random() * 90000000)}`;
}

function generateEmail(first, last) {
  return `${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(Math.random() * 99)}@gmail.com`;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCandidates(count) {
  const candidates = [];
  for (let i = 0; i < count; i++) {
    const first = randomFrom(firstNames);
    const last = randomFrom(lastNames);
    const priority = randomFrom(PRIORITY_TYPES);
    const statusPool = i < 8 ? ["approved"] : i < 12 ? ["winner"] : i < 18 ? ["waitlist"] : STATUSES;
    const status = randomFrom(statusPool);
    const lotteryNumber = status === "winner" ? Math.floor(Math.random() * 20) + 1 : status === "waitlist" ? Math.floor(Math.random() * 30) + 20 : null;
    candidates.push({
      id: `C${String(i + 1).padStart(4, "0")}`,
      firstName: first,
      lastName: last,
      idNumber: generateID(),
      phone: generatePhone(),
      email: generateEmail(first, last),
      projectId: randomFrom(PROJECTS).id,
      priority: priority.key,
      priorityLabel: priority.label,
      status,
      lotteryNumber,
      documents: [
        { type: "ID Card", filename: `id_${first.toLowerCase()}.pdf`, verified: Math.random() > 0.2, uploadDate: "2026-02-" + String(Math.floor(Math.random() * 28) + 1).padStart(2, "0") },
        { type: "Eligibility Certificate", filename: `elig_${first.toLowerCase()}.pdf`, verified: Math.random() > 0.3, uploadDate: "2026-02-" + String(Math.floor(Math.random() * 28) + 1).padStart(2, "0") },
        ...(priority.key === "disabled" ? [{ type: "Disability Certificate", filename: `dis_${first.toLowerCase()}.pdf`, verified: Math.random() > 0.25, uploadDate: "2026-03-01" }] : []),
        ...(priority.key === "reserves" ? [{ type: "Military Service Proof", filename: `mil_${first.toLowerCase()}.pdf`, verified: Math.random() > 0.2, uploadDate: "2026-03-02" }] : []),
      ],
      registrationDate: `2026-0${Math.floor(Math.random() * 2) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, "0")}`,
      apartmentChosen: status === "winner" && Math.random() > 0.4 ? `Apt ${Math.floor(Math.random() * 48) + 1}` : null,
      notes: "",
      appealDeadline: status === "rejected" ? "2026-03-15" : null,
    });
  }
  return candidates;
}

const initialCandidates = generateCandidates(50);

const APARTMENTS = Array.from({ length: 48 }, (_, i) => ({
  id: `APT-${i + 1}`,
  number: `${Math.floor(i / 4) + 1}${String.fromCharCode(65 + (i % 4))}`,
  floor: Math.floor(i / 4) + 1,
  rooms: [2.5, 3, 3.5, 4, 4.5][Math.floor(Math.random() * 5)],
  sqm: Math.floor(55 + Math.random() * 60),
  price: Math.floor(1200000 + Math.random() * 800000),
  taken: i < 6,
  takenBy: i < 6 ? initialCandidates.filter(c => c.status === "winner")[i]?.id || null : null,
}));

// ─── Styles (CSS-in-JS matching e-b.co.il) ───────────────────────
const colors = {
  primary: "#00838F",
  primaryDark: "#006064",
  primaryLight: "#4DB6AC",
  accent: "#EF6C00",
  accentLight: "#FF9800",
  bg: "#F5F7FA",
  surface: "#FFFFFF",
  surfaceAlt: "#E0F2F1",
  text: "#212121",
  textSecondary: "#546E7A",
  border: "#CFD8DC",
  success: "#2E7D32",
  error: "#C62828",
  warning: "#F57F17",
};

// ─── Components ───────────────────────────────────────────────────

function Badge({ type, children }) {
  const badgeColors = {
    pending_review: { bg: "#FFF3E0", color: "#E65100" },
    approved: { bg: "#E8F5E9", color: "#2E7D32" },
    rejected: { bg: "#FFEBEE", color: "#C62828" },
    needs_correction: { bg: "#FFF8E1", color: "#F57F17" },
    winner: { bg: "#E0F2F1", color: "#00695C" },
    waitlist: { bg: "#E3F2FD", color: "#1565C0" },
    verified: { bg: "#E8F5E9", color: "#2E7D32" },
    unverified: { bg: "#FFEBEE", color: "#C62828" },
    priority: { bg: "#FCE4EC", color: "#AD1457" },
    info: { bg: "#E3F2FD", color: "#1565C0" },
  };
  const c = badgeColors[type] || badgeColors.info;
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: c.bg, color: c.color, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background: colors.surface, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 16, borderLeft: `4px solid ${color || colors.primary}` }}>
      <div style={{ fontSize: 28, width: 44, height: 44, borderRadius: 10, background: `${color || colors.primary}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color: colors.text, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", disabled, style: extraStyle }) {
  const base = { border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, transition: "all 0.15s", opacity: disabled ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 6 };
  const sizes = { sm: { padding: "6px 14px", fontSize: 12 }, md: { padding: "9px 20px", fontSize: 13 }, lg: { padding: "12px 28px", fontSize: 15 } };
  const variants = {
    primary: { background: colors.primary, color: "#fff" },
    accent: { background: colors.accent, color: "#fff" },
    outline: { background: "transparent", color: colors.primary, border: `1.5px solid ${colors.primary}` },
    ghost: { background: "transparent", color: colors.textSecondary },
    danger: { background: colors.error, color: "#fff" },
    success: { background: colors.success, color: "#fff" },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...sizes[size], ...variants[variant], ...extraStyle }}>{children}</button>;
}

function Input({ value, onChange, placeholder, style: s, type = "text" }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ padding: "9px 14px", border: `1.5px solid ${colors.border}`, borderRadius: 8, fontSize: 13, outline: "none", width: "100%", transition: "border 0.15s", ...s }} onFocus={e => (e.target.style.borderColor = colors.primary)} onBlur={e => (e.target.style.borderColor = colors.border)} />;
}

function Select({ value, onChange, options, style: s }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ padding: "9px 14px", border: `1.5px solid ${colors.border}`, borderRadius: 8, fontSize: 13, outline: "none", background: "#fff", cursor: "pointer", ...s }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Modal({ open, onClose, title, children, width = 600 }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width, maxWidth: "92vw", maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: `1px solid ${colors.border}` }}>
          <h3 style={{ margin: 0, fontSize: 17, color: colors.primaryDark }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: colors.textSecondary, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Pages ────────────────────────────────────────────────────────

function Dashboard({ candidates, apartments }) {
  const stats = useMemo(() => {
    const total = candidates.length;
    const approved = candidates.filter(c => c.status === "approved").length;
    const winners = candidates.filter(c => c.status === "winner").length;
    const waitlist = candidates.filter(c => c.status === "waitlist").length;
    const pending = candidates.filter(c => c.status === "pending_review").length;
    const needsCorrection = candidates.filter(c => c.status === "needs_correction").length;
    const aptTaken = apartments.filter(a => a.taken).length;
    const priorityBreakdown = PRIORITY_TYPES.map(p => ({ ...p, count: candidates.filter(c => c.priority === p.key).length }));
    return { total, approved, winners, waitlist, pending, needsCorrection, aptTaken, aptTotal: apartments.length, priorityBreakdown };
  }, [candidates, apartments]);

  return (
    <div>
      <h2 style={{ fontSize: 22, color: colors.primaryDark, marginBottom: 20, fontWeight: 700 }}>Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Registrants" value={stats.total} icon="👥" color={colors.primary} />
        <StatCard label="Approved" value={stats.approved} icon="✓" color={colors.success} />
        <StatCard label="Winners" value={stats.winners} icon="🏆" color={colors.accent} />
        <StatCard label="Waitlisted" value={stats.waitlist} icon="⏳" color="#1565C0" />
        <StatCard label="Pending Review" value={stats.pending} icon="📋" color={colors.warning} />
        <StatCard label="Needs Correction" value={stats.needsCorrection} icon="⚠" color={colors.error} />
        <StatCard label="Apts Chosen" value={`${stats.aptTaken}/${stats.aptTotal}`} icon="🏠" color={colors.primaryLight} />
      </div>
      <div style={{ background: colors.surface, borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <h3 style={{ fontSize: 15, color: colors.primaryDark, marginBottom: 14 }}>Priority Breakdown</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {stats.priorityBreakdown.map(p => (
            <div key={p.key} style={{ flex: "1 1 130px", background: colors.surfaceAlt, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: colors.primaryDark }}>{p.count}</div>
              <div style={{ fontSize: 12, color: colors.textSecondary }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: colors.surface, borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginTop: 16 }}>
        <h3 style={{ fontSize: 15, color: colors.primaryDark, marginBottom: 14 }}>Active Projects</h3>
        {PROJECTS.map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${colors.border}` }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: colors.textSecondary }}>{p.address}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{p.units} units</div>
              <Badge type={p.status === "active" ? "approved" : "pending_review"}>{p.status}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Registration({ candidates, setCandidates }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", idNumber: "", phone: "", email: "", priority: "none", projectId: PROJECTS[0].id });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!form.firstName || !form.lastName || !form.idNumber || !form.email) return;
    const priority = PRIORITY_TYPES.find(p => p.key === form.priority);
    const newCandidate = {
      id: `C${String(candidates.length + 1).padStart(4, "0")}`,
      ...form,
      priorityLabel: priority.label,
      status: "pending_review",
      lotteryNumber: null,
      documents: [
        { type: "ID Card", filename: `id_upload.pdf`, verified: false, uploadDate: "2026-03-09" },
        { type: "Eligibility Certificate", filename: `elig_upload.pdf`, verified: false, uploadDate: "2026-03-09" },
      ],
      registrationDate: "2026-03-09",
      apartmentChosen: null,
      notes: "",
      appealDeadline: null,
    };
    setCandidates(prev => [...prev, newCandidate]);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setForm({ firstName: "", lastName: "", idNumber: "", phone: "", email: "", priority: "none", projectId: PROJECTS[0].id });
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, color: colors.primaryDark, marginBottom: 6, fontWeight: 700 }}>Registration Portal</h2>
      <p style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 20 }}>Public-facing registration form for lottery candidates</p>
      {submitted && <div style={{ background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 10, padding: "14px 20px", marginBottom: 16, color: colors.success, fontWeight: 600, fontSize: 14 }}>✓ Registration submitted successfully. Documents will be reviewed within 3 business days.</div>}
      <div style={{ background: colors.surface, borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", maxWidth: 640 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: 4 }}>First Name *</label><Input value={form.firstName} onChange={v => setForm(f => ({ ...f, firstName: v }))} placeholder="Yael" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: 4 }}>Last Name *</label><Input value={form.lastName} onChange={v => setForm(f => ({ ...f, lastName: v }))} placeholder="Cohen" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: 4 }}>ID Number (ת.ז) *</label><Input value={form.idNumber} onChange={v => setForm(f => ({ ...f, idNumber: v }))} placeholder="123456789" /></div>
          <div><label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: 4 }}>Phone</label><Input value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="0501234567" /></div>
          <div style={{ gridColumn: "span 2" }}><label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: 4 }}>Email *</label><Input value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="email@example.com" type="email" /></div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: 4 }}>Priority Category</label>
            <Select value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} options={PRIORITY_TYPES.map(p => ({ value: p.key, label: p.label }))} style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: 4 }}>Project</label>
            <Select value={form.projectId} onChange={v => setForm(f => ({ ...f, projectId: v }))} options={PROJECTS.map(p => ({ value: p.id, label: p.name }))} style={{ width: "100%" }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
          {[
            { icon: "🪪", label: "ID Card (ת.ז)", hint: "Front & back of your national ID" },
            { icon: "📄", label: "Approval / Eligibility Form", hint: "Official eligibility certificate (טופס זכאות)" },
          ].map(({ icon, label, hint }) => (
            <label key={label} style={{ border: `2px dashed ${colors.border}`, borderRadius: 10, padding: "20px 14px", textAlign: "center", background: colors.bg, cursor: "pointer", display: "block", transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = colors.primary}
              onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} />
              <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 11, color: colors.textSecondary }}>{hint}</div>
              <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>PDF, JPG, PNG — max 10MB</div>
            </label>
          ))}
        </div>
        <div style={{ background: "#FFF8E1", borderRadius: 8, padding: "10px 16px", marginBottom: 18, fontSize: 12, color: "#795548" }}>
          ⚠ By submitting, you confirm all information is true. False information may result in disqualification and criminal proceedings per municipal regulations.
        </div>
        <Btn onClick={handleSubmit} variant="accent" size="lg" style={{ width: "100%" }}>Submit Registration</Btn>
      </div>
    </div>
  );
}

function DocumentQA({ candidates, setCandidates }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [emailBody, setEmailBody] = useState("");
  const [generatingEmail, setGeneratingEmail] = useState(false);

  const generateTourEmail = async (candidate) => {
    setGeneratingEmail(true);
    const project = PROJECTS.find(p => p.id === candidate.projectId);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Write a professional email inviting ${candidate.firstName} ${candidate.lastName} to schedule an apartment tour at ${project?.name || "the project"} (${project?.address || ""}). They are a lottery winner (position #${candidate.lotteryNumber || "TBD"}) in the Tel Aviv-Yafo affordable housing lottery. The email should:
- Open with warm congratulations on their lottery win
- Invite them to schedule a tour to select their apartment unit
- Mention available tour slots: Sun-Thu 9:00–16:00, Fri 9:00–13:00
- Ask them to confirm by replying or calling 03-XXXX-XXXX within 7 days or their position may be forfeited
- Sign off as Ezra VaBitaron Housing Team — Tel Aviv-Yafo Municipality
Return only the email body text (no subject line, no markdown).`
          }]
        })
      });
      const data = await res.json();
      setEmailBody(data.content?.[0]?.text || "");
    } catch {
      setEmailBody(`Dear ${candidate.firstName} ${candidate.lastName},\n\nCongratulations on being selected in the affordable housing lottery for ${project?.name}!\n\nWe invite you to schedule an apartment tour at your earliest convenience to choose your unit. Tours are available Sun–Thu 9:00–16:00 and Fri 9:00–13:00.\n\nPlease reply to this email or call 03-XXXX-XXXX within 7 business days to confirm your appointment. Failure to respond may result in forfeiture of your lottery position.\n\nBest regards,\nEzra VaBitaron Housing Team\nTel Aviv-Yafo Municipality`);
    }
    setGeneratingEmail(false);
  };

  const openEmailModal = (c) => { setEmailModal(c); setEmailBody(""); };

  const filtered = useMemo(() => {
    if (filter === "all") return candidates;
    return candidates.filter(c => c.status === filter);
  }, [candidates, filter]);

  const updateStatus = (id, newStatus) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status: newStatus, appealDeadline: newStatus === "rejected" ? "2026-03-15" : c.appealDeadline } : c));
  };

  const verifyDoc = (candidateId, docIdx) => {
    setCandidates(prev => prev.map(c => {
      if (c.id !== candidateId) return c;
      const docs = [...c.documents];
      docs[docIdx] = { ...docs[docIdx], verified: true };
      return { ...c, documents: docs };
    }));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22, color: colors.primaryDark, fontWeight: 700, margin: 0 }}>Document QA & Review</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[{ v: "all", l: "All" }, { v: "pending_review", l: "Pending" }, { v: "needs_correction", l: "Needs Fix" }, { v: "approved", l: "Approved" }, { v: "rejected", l: "Rejected" }].map(f => (
            <Btn key={f.v} variant={filter === f.v ? "primary" : "outline"} size="sm" onClick={() => setFilter(f.v)}>{f.l}</Btn>
          ))}
        </div>
      </div>
      <div style={{ background: colors.surface, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: colors.primaryDark, color: "#fff" }}>
                {["Name", "ID Number", "Priority", "Project", "Docs", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 25).map((c, i) => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${colors.border}`, background: i % 2 === 0 ? "#fff" : colors.bg }}>
                  <td style={{ padding: "10px 14px", fontWeight: 500 }}>{c.firstName} {c.lastName}</td>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>{c.idNumber}</td>
                  <td style={{ padding: "10px 14px" }}><Badge type="priority">{c.priorityLabel}</Badge></td>
                  <td style={{ padding: "10px 14px", fontSize: 12 }}>{PROJECTS.find(p => p.id === c.projectId)?.name}</td>
                  <td style={{ padding: "10px 14px" }}>
                    {c.documents.map((d, di) => (
                      <span key={di} style={{ marginRight: 4 }}><Badge type={d.verified ? "verified" : "unverified"}>{d.type.slice(0, 8)}</Badge></span>
                    ))}
                  </td>
                  <td style={{ padding: "10px 14px" }}><Badge type={c.status}>{STATUS_LABELS[c.status]}</Badge></td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn size="sm" variant="ghost" onClick={() => setSelected(c)}>👁</Btn>
                      {c.status === "pending_review" && <Btn size="sm" variant="success" onClick={() => updateStatus(c.id, "approved")}>✓</Btn>}
                      {c.status === "pending_review" && <Btn size="sm" variant="danger" onClick={() => updateStatus(c.id, "needs_correction")}>✗</Btn>}
                      <Btn size="sm" variant="ghost" onClick={() => openEmailModal(c)}>✉</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.firstName} ${selected.lastName} — Details` : ""} width={650}>
        {selected && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div><span style={{ fontSize: 11, color: colors.textSecondary }}>ID Number</span><div style={{ fontFamily: "monospace" }}>{selected.idNumber}</div></div>
              <div><span style={{ fontSize: 11, color: colors.textSecondary }}>Phone</span><div>{selected.phone}</div></div>
              <div><span style={{ fontSize: 11, color: colors.textSecondary }}>Email</span><div>{selected.email}</div></div>
              <div><span style={{ fontSize: 11, color: colors.textSecondary }}>Priority</span><div><Badge type="priority">{selected.priorityLabel}</Badge></div></div>
              <div><span style={{ fontSize: 11, color: colors.textSecondary }}>Registered</span><div>{selected.registrationDate}</div></div>
              <div><span style={{ fontSize: 11, color: colors.textSecondary }}>Status</span><div><Badge type={selected.status}>{STATUS_LABELS[selected.status]}</Badge></div></div>
            </div>
            <h4 style={{ fontSize: 14, color: colors.primaryDark, marginBottom: 10 }}>Documents</h4>
            {selected.documents.map((d, di) => (
              <div key={di} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: colors.bg, borderRadius: 8, marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{d.type}</div>
                  <div style={{ fontSize: 11, color: colors.textSecondary }}>{d.filename} — uploaded {d.uploadDate}</div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge type={d.verified ? "verified" : "unverified"}>{d.verified ? "Verified" : "Unverified"}</Badge>
                  {!d.verified && <Btn size="sm" variant="success" onClick={() => { verifyDoc(selected.id, di); setSelected(s => ({ ...s, documents: s.documents.map((dd, ddi) => ddi === di ? { ...dd, verified: true } : dd) })); }}>Verify</Btn>}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <Btn variant="success" onClick={() => { updateStatus(selected.id, "approved"); setSelected(null); }}>Approve</Btn>
              <Btn variant="danger" onClick={() => { updateStatus(selected.id, "rejected"); setSelected(null); }}>Reject</Btn>
              <Btn variant="outline" onClick={() => { updateStatus(selected.id, "needs_correction"); setSelected(null); }}>Request Correction</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!emailModal} onClose={() => setEmailModal(null)} title="Send Email Notification" width={500}>
        {emailModal && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: 4 }}>To</label>
              <div style={{ padding: "9px 14px", background: colors.bg, borderRadius: 8, fontSize: 13 }}>{emailModal.email}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary, display: "block", marginBottom: 4 }}>Subject</label>
              <Input value={`Invitation to Schedule Apartment Tour — ${PROJECTS.find(p => p.id === emailModal.projectId)?.name || "Housing Project"}`} onChange={() => {}} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: colors.textSecondary }}>Message</label>
                <Btn size="sm" variant="primary" onClick={() => generateTourEmail(emailModal)} disabled={generatingEmail}>
                  {generatingEmail ? "⏳ Generating…" : "✨ Auto-generate with AI"}
                </Btn>
              </div>
              {generatingEmail ? (
                <div style={{ padding: 24, textAlign: "center", background: colors.bg, borderRadius: 8, color: colors.textSecondary, fontSize: 13 }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>✨</div>
                  Crafting a personalised tour invitation…
                </div>
              ) : (
                <textarea
                  key={emailBody}
                  style={{ width: "100%", minHeight: 180, padding: 12, border: `1.5px solid ${colors.border}`, borderRadius: 8, fontSize: 13, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                  defaultValue={emailBody || `Dear ${emailModal.firstName} ${emailModal.lastName},\n\nPlease click "Auto-generate with AI" to create a personalised tour invitation, or write your message here.\n\nBest regards,\nEzra VaBitaron Housing Team`}
                />
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="accent" onClick={() => setEmailModal(null)}>📨 Send Email</Btn>
              <Btn variant="outline" onClick={() => setEmailModal(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function LotteryEngine({ candidates, setCandidates }) {
  const [projectId, setProjectId] = useState(PROJECTS[0].id);
  const [lotteryRun, setLotteryRun] = useState(false);
  const [results, setResults] = useState([]);

  const eligible = useMemo(() => candidates.filter(c => c.projectId === projectId && c.status === "approved"), [candidates, projectId]);

  const runLottery = () => {
    const sorted = [...eligible].sort((a, b) => {
      const aw = PRIORITY_TYPES.find(p => p.key === a.priority)?.weight || 0;
      const bw = PRIORITY_TYPES.find(p => p.key === b.priority)?.weight || 0;
      if (bw !== aw) return bw - aw;
      return Math.random() - 0.5;
    });
    const project = PROJECTS.find(p => p.id === projectId);
    const winnerCount = Math.min(sorted.length, project?.units || 10);
    const newResults = sorted.map((c, i) => ({
      ...c,
      lotteryNumber: i + 1,
      status: i < winnerCount ? "winner" : "waitlist",
    }));
    setResults(newResults);
    setCandidates(prev => {
      const resultMap = new Map(newResults.map(r => [r.id, r]));
      return prev.map(c => resultMap.has(c.id) ? { ...c, status: resultMap.get(c.id).status, lotteryNumber: resultMap.get(c.id).lotteryNumber } : c);
    });
    setLotteryRun(true);
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, color: colors.primaryDark, marginBottom: 6, fontWeight: 700 }}>Lottery Engine</h2>
      <p style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 20 }}>Run priority-weighted lottery draws for approved candidates</p>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <Select value={projectId} onChange={setProjectId} options={PROJECTS.map(p => ({ value: p.id, label: p.name }))} />
        <div style={{ fontSize: 13, color: colors.textSecondary }}>{eligible.length} eligible candidates</div>
        <Btn variant="accent" onClick={runLottery} disabled={eligible.length === 0}>🎲 Run Lottery</Btn>
      </div>
      <div style={{ background: colors.surface, borderRadius: 10, padding: 18, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <h4 style={{ fontSize: 13, color: colors.primaryDark, marginBottom: 10 }}>Priority Weights</h4>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PRIORITY_TYPES.map(p => (
            <div key={p.key} style={{ background: colors.surfaceAlt, borderRadius: 8, padding: "8px 14px", fontSize: 12 }}>
              <strong>{p.label}</strong>: weight {p.weight}
            </div>
          ))}
        </div>
      </div>
      {lotteryRun && (
        <div style={{ background: colors.surface, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ background: "#E8F5E9", padding: "12px 20px", fontSize: 14, fontWeight: 600, color: colors.success }}>✓ Lottery completed — {results.filter(r => r.status === "winner").length} winners, {results.filter(r => r.status === "waitlist").length} waitlisted</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: colors.primaryDark, color: "#fff" }}>
                {["#", "Name", "ID", "Priority", "Result"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}`, background: r.status === "winner" ? "#F1F8E9" : i % 2 === 0 ? "#fff" : colors.bg }}>
                  <td style={{ padding: "9px 14px", fontWeight: 700, color: colors.accent }}>{r.lotteryNumber}</td>
                  <td style={{ padding: "9px 14px" }}>{r.firstName} {r.lastName}</td>
                  <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: 12 }}>{r.idNumber}</td>
                  <td style={{ padding: "9px 14px" }}><Badge type="priority">{r.priorityLabel}</Badge></td>
                  <td style={{ padding: "9px 14px" }}><Badge type={r.status}>{r.status === "winner" ? "🏆 Winner" : "⏳ Waitlist"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WinnerManagement({ candidates, setCandidates, apartments, setApartments }) {
  const winners = useMemo(() => candidates.filter(c => c.status === "winner").sort((a, b) => (a.lotteryNumber || 999) - (b.lotteryNumber || 999)), [candidates]);
  const waitlist = useMemo(() => candidates.filter(c => c.status === "waitlist").sort((a, b) => (a.lotteryNumber || 999) - (b.lotteryNumber || 999)), [candidates]);
  const available = useMemo(() => apartments.filter(a => !a.taken), [apartments]);
  const [assignModal, setAssignModal] = useState(null);

  const assignApartment = (candidateId, aptId) => {
    const apt = apartments.find(a => a.id === aptId);
    setApartments(prev => prev.map(a => a.id === aptId ? { ...a, taken: true, takenBy: candidateId } : a));
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, apartmentChosen: apt.number } : c));
    setAssignModal(null);
  };

  const promoteWaitlist = () => {
    const next = waitlist[0];
    if (next) {
      setCandidates(prev => prev.map(c => c.id === next.id ? { ...c, status: "winner" } : c));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 22, color: colors.primaryDark, fontWeight: 700, margin: 0 }}>Winner & Apartment Management</h2>
        <Btn variant="accent" onClick={promoteWaitlist} disabled={waitlist.length === 0}>Promote Next from Waitlist</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <StatCard label="Winners" value={winners.length} icon="🏆" color={colors.accent} />
        <StatCard label="Available Apartments" value={available.length} icon="🏠" color={colors.primary} />
      </div>
      <div style={{ background: colors.surface, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 20 }}>
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${colors.border}`, fontWeight: 600, color: colors.primaryDark, fontSize: 14 }}>Winners</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: colors.bg }}>
              {["#", "Name", "ID", "Priority", "Apartment", "Action"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 12, color: colors.textSecondary }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {winners.map((w, i) => (
              <tr key={w.id} style={{ borderBottom: `1px solid ${colors.border}`, background: i % 2 === 0 ? "#fff" : colors.bg }}>
                <td style={{ padding: "9px 14px", fontWeight: 700, color: colors.accent }}>{w.lotteryNumber || "—"}</td>
                <td style={{ padding: "9px 14px", fontWeight: 500 }}>{w.firstName} {w.lastName}</td>
                <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: 12 }}>{w.idNumber}</td>
                <td style={{ padding: "9px 14px" }}><Badge type="priority">{w.priorityLabel}</Badge></td>
                <td style={{ padding: "9px 14px" }}>{w.apartmentChosen ? <Badge type="approved">{w.apartmentChosen}</Badge> : <span style={{ color: colors.textSecondary }}>—</span>}</td>
                <td style={{ padding: "9px 14px" }}>
                  {!w.apartmentChosen && <Btn size="sm" variant="primary" onClick={() => setAssignModal(w)}>Assign Apt</Btn>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {waitlist.length > 0 && (
        <div style={{ background: colors.surface, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${colors.border}`, fontWeight: 600, color: "#1565C0", fontSize: 14 }}>Waiting List ({waitlist.length})</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: colors.bg }}>{["#", "Name", "Priority"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 12, color: colors.textSecondary }}>{h}</th>)}</tr></thead>
            <tbody>
              {waitlist.slice(0, 10).map((w, i) => (
                <tr key={w.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <td style={{ padding: "9px 14px", fontWeight: 600 }}>{w.lotteryNumber || i + 1}</td>
                  <td style={{ padding: "9px 14px" }}>{w.firstName} {w.lastName}</td>
                  <td style={{ padding: "9px 14px" }}><Badge type="priority">{w.priorityLabel}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title={assignModal ? `Assign Apartment — ${assignModal.firstName} ${assignModal.lastName}` : ""} width={550}>
        {assignModal && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
              {available.map(apt => (
                <button key={apt.id} onClick={() => assignApartment(assignModal.id, apt.id)} style={{ padding: "14px 10px", border: `1.5px solid ${colors.border}`, borderRadius: 10, background: "#fff", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }} onMouseEnter={e => { e.target.style.borderColor = colors.primary; e.target.style.background = colors.surfaceAlt; }} onMouseLeave={e => { e.target.style.borderColor = colors.border; e.target.style.background = "#fff"; }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: colors.primaryDark }}>{apt.number}</div>
                  <div style={{ fontSize: 11, color: colors.textSecondary }}>Floor {apt.floor} • {apt.rooms} rooms</div>
                  <div style={{ fontSize: 11, color: colors.textSecondary }}>{apt.sqm}m² • ₪{apt.price.toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SearchPortal({ candidates }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  const search = () => {
    const q = query.trim();
    const found = candidates.find(c => c.idNumber === q || c.id === q || `${c.firstName} ${c.lastName}`.toLowerCase().includes(q.toLowerCase()));
    setResult(found || null);
    setSearched(true);
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, color: colors.primaryDark, marginBottom: 6, fontWeight: 700 }}>Lottery Position Search</h2>
      <p style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 20 }}>Public search — look up lottery placement by ID number</p>
      <div style={{ background: colors.surface, borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", maxWidth: 540 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Input value={query} onChange={setQuery} placeholder="Enter ID number (ת.ז) or name..." style={{ flex: 1 }} />
          <Btn variant="accent" onClick={search}>Search</Btn>
        </div>
        {searched && !result && <div style={{ padding: 20, textAlign: "center", color: colors.textSecondary }}>No results found. Please check the ID number and try again.</div>}
        {result && (
          <div style={{ border: `1.5px solid ${colors.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ background: colors.primaryDark, color: "#fff", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 600 }}>{result.firstName} {result.lastName}</div>
              <Badge type={result.status}>{STATUS_LABELS[result.status]}</Badge>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div><span style={{ fontSize: 11, color: colors.textSecondary }}>ID</span><div style={{ fontFamily: "monospace" }}>{result.idNumber}</div></div>
                <div><span style={{ fontSize: 11, color: colors.textSecondary }}>Priority</span><div><Badge type="priority">{result.priorityLabel}</Badge></div></div>
                <div><span style={{ fontSize: 11, color: colors.textSecondary }}>Lottery Position</span><div style={{ fontSize: 20, fontWeight: 700, color: result.lotteryNumber ? colors.accent : colors.textSecondary }}>{result.lotteryNumber || "N/A"}</div></div>
                <div><span style={{ fontSize: 11, color: colors.textSecondary }}>Apartment</span><div>{result.apartmentChosen || "Not yet assigned"}</div></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RulesEngine() {
  const [query, setQuery] = useState("");
  const rules = [
    { category: "Eligibility", title: "Registration Requirements", text: "Only candidates meeting all eligibility criteria as detailed in project registration booklets may participate. The municipality may request additional documents or accept alternatives at its sole discretion." },
    { category: "Eligibility", title: "Late Registration", text: "Late online registrations are automatically disqualified. Ensure submission before the published deadline." },
    { category: "Documents", title: "Original Documents", text: "Candidates must keep original documents until the process ends. If requested, originals must be submitted to Ezra VaBitaron within 5 business days; failure results in disqualification." },
    { category: "Appeals", title: "Appeal Process", text: "Candidates found ineligible may submit a written, reasoned appeal within 3 calendar days to tlv4less@e-b.co.il. The appeals committee's decision is final and sent by email." },
    { category: "Penalties", title: "False Information", text: "Providing false/misleading information at any stage can result in disqualification, exclusion from future projects (temporarily or permanently), and criminal proceedings." },
    { category: "Penalties", title: "Post-Contract Discovery", text: "If false information is discovered after a rental contract is signed, the municipality can terminate the contract and charge ₪5,000/month (+ prime + 6.5% interest) for each month of actual occupancy." },
    { category: "Waiting List", title: "Validity Period", text: "Waiting lists are valid for the period stated in the registration booklet." },
    { category: "Waiting List", title: "Re-evaluation", text: "If a waiting-list candidate is contacted 6+ months after the lottery, eligibility is re-evaluated at that time. Candidates must remain apartment-free throughout the entire process." },
    { category: "General", title: "Regulation Changes", text: "The municipality may change the regulations at any time without prior notice." },
    { category: "General", title: "Jurisdiction", text: "Exclusive jurisdiction: Tel Aviv-Yafo courts, under Israeli law." },
    { category: "Priority", title: "Priority Categories", text: "Lottery draws are weighted by priority: Disabled (weight 5), Military Reserves (4), Local Residents (3), Young Couples (2), Standard (1). Higher weight = higher chance of selection." },
  ];

  const filtered = query.trim() ? rules.filter(r => r.title.toLowerCase().includes(query.toLowerCase()) || r.text.toLowerCase().includes(query.toLowerCase()) || r.category.toLowerCase().includes(query.toLowerCase())) : rules;
  const categories = [...new Set(filtered.map(r => r.category))];

  return (
    <div>
      <h2 style={{ fontSize: 22, color: colors.primaryDark, marginBottom: 6, fontWeight: 700 }}>Rules & Regulations Search</h2>
      <p style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 20 }}>Search all lottery rules, procedures, and policies</p>
      <div style={{ marginBottom: 20 }}>
        <Input value={query} onChange={setQuery} placeholder="Search rules, regulations, policies..." />
      </div>
      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: colors.primary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{cat}</div>
          {filtered.filter(r => r.category === cat).map((r, i) => (
            <div key={i} style={{ background: colors.surface, borderRadius: 10, padding: "14px 18px", marginBottom: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", borderLeft: `3px solid ${colors.primary}` }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: colors.primaryDark }}>{r.title}</div>
              <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.5 }}>{r.text}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Reports({ candidates, apartments }) {
  const winners = candidates.filter(c => c.status === "winner");
  const chosen = winners.filter(w => w.apartmentChosen);
  const unchosen = winners.filter(w => !w.apartmentChosen);
  const waitlist = candidates.filter(c => c.status === "waitlist");

  return (
    <div>
      <h2 style={{ fontSize: 22, color: colors.primaryDark, marginBottom: 6, fontWeight: 700 }}>Reports</h2>
      <p style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 20 }}>Winner status and periodic reporting</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Winners" value={winners.length} icon="🏆" color={colors.accent} />
        <StatCard label="Apartments Chosen" value={chosen.length} icon="✓" color={colors.success} />
        <StatCard label="Awaiting Selection" value={unchosen.length} icon="⏳" color={colors.warning} />
        <StatCard label="On Waitlist" value={waitlist.length} icon="📋" color="#1565C0" />
      </div>
      <div style={{ background: colors.surface, borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, color: colors.primaryDark, marginBottom: 14 }}>Winner Status Report — {new Date().toLocaleDateString("en-IL")}</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
              {["#", "Name", "ID", "Priority", "Apartment", "Status"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, fontSize: 12, color: colors.textSecondary }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {winners.sort((a, b) => (a.lotteryNumber || 999) - (b.lotteryNumber || 999)).map((w, i) => (
              <tr key={w.id} style={{ borderBottom: `1px solid ${colors.border}`, background: i % 2 === 0 ? "#fff" : colors.bg }}>
                <td style={{ padding: "8px 12px", fontWeight: 600 }}>{w.lotteryNumber || "—"}</td>
                <td style={{ padding: "8px 12px" }}>{w.firstName} {w.lastName}</td>
                <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 12 }}>{w.idNumber}</td>
                <td style={{ padding: "8px 12px" }}><Badge type="priority">{w.priorityLabel}</Badge></td>
                <td style={{ padding: "8px 12px" }}>{w.apartmentChosen || "—"}</td>
                <td style={{ padding: "8px 12px" }}><Badge type={w.apartmentChosen ? "approved" : "pending_review"}>{w.apartmentChosen ? "Chosen" : "Pending"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ background: colors.surface, borderRadius: 12, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <h3 style={{ fontSize: 15, color: colors.primaryDark, marginBottom: 14 }}>Apartment Occupancy</h3>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {apartments.map(apt => (
            <div key={apt.id} style={{ width: 44, height: 44, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, background: apt.taken ? colors.primaryLight : colors.bg, color: apt.taken ? "#fff" : colors.textSecondary, border: apt.taken ? "none" : `1px solid ${colors.border}` }} title={`${apt.number} — ${apt.taken ? "Taken" : "Available"}`}>
              {apt.number}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: colors.textSecondary }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: colors.primaryLight, display: "inline-block" }} /> Taken</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: colors.bg, border: `1px solid ${colors.border}`, display: "inline-block" }} /> Available</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "register", label: "Registration", icon: "📝" },
  { key: "qa", label: "Document QA", icon: "📋" },
  { key: "lottery", label: "Lottery", icon: "🎲" },
  { key: "winners", label: "Winners", icon: "🏆" },
  { key: "search", label: "Search", icon: "🔍" },
  { key: "rules", label: "Rules", icon: "📖" },
  { key: "reports", label: "Reports", icon: "📈" },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [candidates, setCandidates] = useState(initialCandidates);
  const [apartments, setApartments] = useState(APARTMENTS);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard candidates={candidates} apartments={apartments} />;
      case "register": return <Registration candidates={candidates} setCandidates={setCandidates} />;
      case "qa": return <DocumentQA candidates={candidates} setCandidates={setCandidates} />;
      case "lottery": return <LotteryEngine candidates={candidates} setCandidates={setCandidates} />;
      case "winners": return <WinnerManagement candidates={candidates} setCandidates={setCandidates} apartments={apartments} setApartments={setApartments} />;
      case "search": return <SearchPortal candidates={candidates} />;
      case "rules": return <RulesEngine />;
      case "reports": return <Reports candidates={candidates} apartments={apartments} />;
      default: return <Dashboard candidates={candidates} apartments={apartments} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif", background: colors.bg, color: colors.text }}>
      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 230 : 60, background: "linear-gradient(180deg, #004D54 0%, #00838F 100%)", transition: "width 0.2s", flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: sidebarOpen ? "20px 18px" : "20px 10px", borderBottom: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setSidebarOpen(s => !s)}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🏛</div>
          {sidebarOpen && (
            <div style={{ overflow: "hidden" }}>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>Ezra VaBitaron</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, whiteSpace: "nowrap" }}>Affordable Housing Lottery</div>
            </div>
          )}
        </div>
        <nav style={{ padding: "12px 8px", flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <button key={item.key} onClick={() => setPage(item.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: sidebarOpen ? "10px 14px" : "10px 0", background: page === item.key ? "rgba(255,255,255,0.18)" : "transparent", border: "none", borderRadius: 8, cursor: "pointer", color: page === item.key ? "#fff" : "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: page === item.key ? 600 : 400, marginBottom: 2, transition: "all 0.12s", justifyContent: sidebarOpen ? "flex-start" : "center" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
            </button>
          ))}
        </nav>
        {sidebarOpen && (
          <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(255,255,255,0.12)", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
            MVP v1.0 • Tel Aviv-Yafo Municipality
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <header style={{ background: "#fff", padding: "14px 28px", borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 13, color: colors.textSecondary }}>
            <span style={{ color: colors.primary, fontWeight: 600 }}>{NAV_ITEMS.find(n => n.key === page)?.icon}</span>{" "}
            {NAV_ITEMS.find(n => n.key === page)?.label}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: colors.textSecondary }}>Admin Panel</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: colors.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>A</div>
          </div>
        </header>
        <main style={{ padding: 28 }}>{renderPage()}</main>
      </div>
    </div>
  );
}
