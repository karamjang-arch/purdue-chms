"use client";

import { useAuthOrDemo, useFetch } from "@/lib/hooks";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { Member, VISITATION_TYPES } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";

function VisitationFormContent() {
  const { isAuthed, role, isDemo } = useAuthOrDemo();
  const router = useRouter();
  const demoSuffix = isDemo ? "?demo=true" : "";

  useEffect(() => {
    if (!isDemo && (!isAuthed || role !== "admin")) router.push("/");
  }, [isAuthed, role, isDemo, router]);

  const { data: members } = useFetch<Member[]>("/api/members", DEMO_MEMBERS);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    member_name: "",
    date: today,
    visitation_type: "정기심방",
    pastor: "장가람",
    location: "",
    summary: "",
    prayer_requests: "",
    follow_up: "",
    follow_up_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    if (!nameQuery || !members) return [];
    const q = nameQuery.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 10);
  }, [nameQuery, members]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.member_name || !form.summary) {
      alert("성도 이름과 심방 내용을 입력해주세요.");
      return;
    }

    if (isDemo) {
      alert("데모 모드에서는 저장되지 않습니다.");
      router.push("/dashboard" + demoSuffix);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/visitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      router.push("/dashboard" + demoSuffix);
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-navy-800 mb-6">심방 기록 입력</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm space-y-4">
        {/* Member name autocomplete */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">성도 이름 *</label>
          <input
            type="text"
            value={form.member_name || nameQuery}
            onChange={(e) => {
              setNameQuery(e.target.value);
              handleChange("member_name", "");
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="이름 검색..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
          />
          {showSuggestions && suggestions.length > 0 && !form.member_name && (
            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((m) => (
                <li
                  key={m.name}
                  onClick={() => {
                    handleChange("member_name", m.name);
                    setNameQuery(m.name);
                    setShowSuggestions(false);
                  }}
                  className="px-3 py-2 text-sm hover:bg-navy-50 cursor-pointer"
                >
                  {m.name} <span className="text-gray-400">({m.department})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => handleChange("date", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">심방 유형</label>
          <select
            value={form.visitation_type}
            onChange={(e) => handleChange("visitation_type", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {VISITATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">담당 교역자</label>
          <input
            type="text"
            value={form.pastor}
            onChange={(e) => handleChange("pastor", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => handleChange("location", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">심방 내용 *</label>
          <textarea
            value={form.summary}
            onChange={(e) => handleChange("summary", e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">기도제목</label>
          <textarea
            value={form.prayer_requests}
            onChange={(e) => handleChange("prayer_requests", e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">후속 조치</label>
          <input
            type="text"
            value={form.follow_up}
            onChange={(e) => handleChange("follow_up", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">후속 날짜</label>
          <input
            type="date"
            value={form.follow_up_date}
            onChange={(e) => handleChange("follow_up_date", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-navy-800 text-white py-3 rounded-lg font-medium hover:bg-navy-700 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 rounded-lg font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

export default function VisitationNewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>}>
      <VisitationFormContent />
    </Suspense>
  );
}
