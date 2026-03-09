"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SearchResult {
  found: boolean;
  name: string;
  lottery_position?: number;
  status: string;
  project_id: string;
  apartment_assigned: boolean;
}

export default function SearchPage() {
  const [idNumber, setIdNumber] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!idNumber || idNumber.length !== 9) {
      setError("Please enter a 9-digit ID number");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/search?id=${idNumber}`);
      if (res.status === 404) {
        setError("No results found. Please verify your ID number.");
        return;
      }
      if (!res.ok) throw new Error("Search failed");
      setResult(await res.json());
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🔍</div>
          <h1 className="text-2xl font-bold text-[#212121]">Check Lottery Status</h1>
          <p className="text-[#546E7A] mt-2">Enter your ID number to check your lottery position</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <Input
              label="ID Number (ת.ז)"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, "").slice(0, 9))}
              placeholder="Enter 9-digit ID number"
              hint="Your Israeli Teudat Zehut"
              maxLength={9}
            />
            {error && <p className="text-sm text-[#C62828] bg-[#FFEBEE] px-3 py-2 rounded-lg">{error}</p>}
            <Button type="submit" variant="primary" loading={loading} className="w-full">
              Search
            </Button>
          </form>
        </div>

        {result && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-[#212121] mb-4 pb-2 border-b border-[#CFD8DC]">
              Your Lottery Status
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#546E7A]">Name</span>
                <span className="font-medium text-[#212121]">{result.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#546E7A]">Status</span>
                <StatusBadge status={result.status} />
              </div>
              {result.lottery_position && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#546E7A]">Lottery Position</span>
                  <span className="font-bold text-2xl text-[#EF6C00]">#{result.lottery_position}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#546E7A]">Apartment</span>
                <span className="text-sm font-medium">
                  {result.apartment_assigned ? "✅ Assigned" : "Not yet assigned"}
                </span>
              </div>
            </div>

            {result.status === "WINNER" && !result.apartment_assigned && (
              <div className="mt-4 p-3 bg-[#E0F2F1] rounded-lg">
                <p className="text-sm text-[#00695C]">
                  🎉 Congratulations! You are a winner. Please check your email for apartment tour invitation details.
                </p>
              </div>
            )}
            {result.status === "WAITLIST" && (
              <div className="mt-4 p-3 bg-[#EDE7F6] rounded-lg">
                <p className="text-sm text-[#4527A0]">
                  You are on the waitlist at position #{result.lottery_position}. You will be notified if a spot opens up.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="text-center mt-6">
          <Link href="/register" className="text-sm text-[#00838F] hover:underline">
            Not registered yet? Register here →
          </Link>
        </div>
      </div>
    </div>
  );
}
