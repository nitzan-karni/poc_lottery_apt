"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Rule {
  id: string;
  category: string;
  title: string;
  content: string;
  order: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Eligibility: "#00838F",
  Documents: "#1565C0",
  Appeals: "#6A1B9A",
  Penalties: "#C62828",
  "Waiting List": "#E65100",
  General: "#546E7A",
  Priority: "#2E7D32",
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/rules`).then((r) => r.json()),
      fetch(`${API_BASE}/api/rules/categories`).then((r) => r.json()),
    ])
      .then(([r, c]) => { setRules(r); setCategories(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = rules.filter((r) => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.content.toLowerCase().includes(search.toLowerCase());
    const matchCat = !activeCategory || r.category === activeCategory;
    return matchSearch && matchCat;
  });

  const grouped = categories.reduce<Record<string, Rule[]>>((acc, cat) => {
    acc[cat] = filtered.filter((r) => r.category === cat);
    return acc;
  }, {});

  function highlight(text: string, query: string) {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
        : part
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">📋</div>
          <h1 className="text-2xl font-bold text-[#212121]">Rules & Regulations</h1>
          <p className="text-[#546E7A] mt-1">Affordable Housing Lottery — Ezra VaBitaron</p>
        </div>

        <div className="mb-4">
          <Input
            label=""
            placeholder="Search rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              !activeCategory ? "bg-[#00838F] text-white" : "bg-white text-[#546E7A] hover:bg-[#E0F2F1]"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat ? "text-white" : "bg-white text-[#546E7A] hover:bg-[#E0F2F1]"
              }`}
              style={activeCategory === cat ? { background: CATEGORY_COLORS[cat] || "#00838F" } : {}}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#546E7A]">Loading rules...</div>
        ) : (
          Object.entries(grouped).map(([category, categoryRules]) =>
            categoryRules.length === 0 ? null : (
              <div key={category} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: CATEGORY_COLORS[category] || "#00838F" }}
                  />
                  <h2 className="font-bold text-[#212121]">{category}</h2>
                </div>
                <div className="flex flex-col gap-3">
                  {categoryRules.map((rule) => (
                    <div key={rule.id} className="bg-white rounded-xl p-5 shadow-sm border-l-4"
                      style={{ borderColor: CATEGORY_COLORS[rule.category] || "#00838F" }}>
                      <h3 className="font-semibold text-[#212121] mb-2">{highlight(rule.title, search)}</h3>
                      <p className="text-sm text-[#546E7A] leading-relaxed">{highlight(rule.content, search)}</p>
                      <div className="mt-2">
                        <Badge type="info">{rule.category}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )
        )}

        <div className="text-center mt-8">
          <Link href="/register" className="text-sm text-[#00838F] hover:underline">
            Ready to apply? Register for the lottery →
          </Link>
        </div>
      </div>
    </div>
  );
}
