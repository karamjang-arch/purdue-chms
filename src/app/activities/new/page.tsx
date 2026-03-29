"use client";

import { useAuthOrDemo, useFetch } from "@/lib/hooks";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import {
  Member, ACTIVITY_TYPES, VISITATION_TYPES, TRAINING_COURSES,
  SACRAMENT_TYPES, MINISTRY_DEPARTMENTS, ActivityType,
} from "@/types";
import { getDisplayName } from "@/lib/display-name";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, Suspense } from "react";

function ActivityFormContent() {
  const { isAuthed, role, isDemo } = useAuthOrDemo();
  const router = useRouter();
  const demoSuffix = isDemo ? "?demo=true" : "";

  useEffect(() => {
    if (!isDemo && (!isAuthed || role !== "admin")) router.push("/");
  }, [isAuthed, role, isDemo, router]);

  const { data: members } = useFetch<Member[]>("/api/members", DEMO_MEMBERS);

  const today = new Date().toISOString().split("T")[0];
  const [activityType, setActivityType] = useState<ActivityType>("심방");
  const [form, setForm] = useState({
    member_name: "", date_start: today, date_end: "", summary: "", detail: "",
    // 심방
    visitation_type: "정기심방", pastor: "장가람", location: "",
    prayer_requests: "", follow_up: "", follow_up_date: "",
    // 봉사
    department_ministry: "", team: "", role_in_team: "",
    // 교육
    course: "웰컴테이블",
    // 세례·임직
    sacrament_type: "세례",
  });
  const [saving, setSaving] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Multi-select for events
  const [selectedNames, setSelectedNames] = useState<string[]>([]);

  const suggestions = useMemo(() => {
    if (!nameQuery || !members) return [];
    const q = nameQuery.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 10);
  }, [nameQuery, members]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addName = (name: string) => {
    if (!selectedNames.includes(name)) {
      setSelectedNames([...selectedNames, name]);
    }
    setNameQuery("");
    setShowSuggestions(false);
  };

  const removeName = (name: string) => {
    setSelectedNames(selectedNames.filter((n) => n !== name));
  };

  const isMultiSelect = activityType !== "심방";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const names = isMultiSelect ? selectedNames : [form.member_name];
    if (names.length === 0 || (names.length === 1 && !names[0])) {
      if (activityType !== "행사") {
        alert("성도를 선택해주세요.");
        return;
      }
    }
    if (!form.summary) { alert("내용을 입력해주세요."); return; }

    if (isDemo) {
      alert("데모 모드에서는 저장되지 않습니다.");
      router.push("/dashboard" + demoSuffix);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          activity_type: activityType,
          member_names: names,
        }),
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
      <h1 className="text-2xl font-bold text-navy-800 mb-6">활동 기록 입력</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm space-y-4">
        {/* Activity type pills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">활동 유형</label>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActivityType(t)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activityType === t
                    ? "bg-navy-800 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Member name — single or multi */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            성도 {isMultiSelect ? "(복수 선택 가능)" : ""} *
          </label>
          {isMultiSelect && selectedNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedNames.map((n) => (
                <span key={n} className="inline-flex items-center bg-navy-50 text-navy-700 px-2 py-0.5 rounded-full text-xs">
                  {n}
                  <button type="button" onClick={() => removeName(n)} className="ml-1 text-navy-400 hover:text-red-500">&times;</button>
                </span>
              ))}
            </div>
          )}
          <input
            type="text"
            value={isMultiSelect ? nameQuery : (form.member_name || nameQuery)}
            onChange={(e) => {
              setNameQuery(e.target.value);
              if (!isMultiSelect) handleChange("member_name", "");
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="이름 검색..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
          />
          {showSuggestions && suggestions.length > 0 && (isMultiSelect || !form.member_name) && (
            <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((m) => (
                <li
                  key={m.name}
                  onClick={() => {
                    if (isMultiSelect) {
                      addName(m.name);
                    } else {
                      handleChange("member_name", m.name);
                      setNameQuery(m.name);
                      setShowSuggestions(false);
                    }
                  }}
                  className="px-3 py-2 text-sm hover:bg-navy-50 cursor-pointer"
                >
                  {getDisplayName(m, members || [])} <span className="text-gray-400">({m.department})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜 *</label>
            <input type="date" value={form.date_start} onChange={(e) => handleChange("date_start", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          {(activityType === "봉사" || activityType === "행사") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
              <input type="date" value={form.date_end} onChange={(e) => handleChange("date_end", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          )}
        </div>

        {/* Summary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">내용 *</label>
          <textarea value={form.summary} onChange={(e) => handleChange("summary", e.target.value)}
            rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300" />
        </div>

        {/* ── 심방 전용 ── */}
        {activityType === "심방" && (
          <div className="space-y-3 border-t pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">심방 유형</label>
                <select value={form.visitation_type} onChange={(e) => handleChange("visitation_type", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {VISITATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">담당</label>
                <input type="text" value={form.pastor} onChange={(e) => handleChange("pastor", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
              <input type="text" value={form.location} onChange={(e) => handleChange("location", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">기도제목</label>
              <textarea value={form.prayer_requests} onChange={(e) => handleChange("prayer_requests", e.target.value)}
                rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">후속 조치</label>
                <input type="text" value={form.follow_up} onChange={(e) => handleChange("follow_up", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">후속 날짜</label>
                <input type="date" value={form.follow_up_date} onChange={(e) => handleChange("follow_up_date", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
        )}

        {/* ── 봉사 전용 ── */}
        {activityType === "봉사" && (
          <div className="space-y-3 border-t pt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">부서/사역</label>
              <select value={form.department_ministry} onChange={(e) => handleChange("department_ministry", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">선택</option>
                {MINISTRY_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">팀</label>
                <input type="text" value={form.team} onChange={(e) => handleChange("team", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                <select value={form.role_in_team} onChange={(e) => handleChange("role_in_team", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">선택</option>
                  {["부장", "팀장", "부팀장", "팀원"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── 교육 전용 ── */}
        {activityType === "교육" && (
          <div className="space-y-3 border-t pt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">과정</label>
              <select value={form.course} onChange={(e) => handleChange("course", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {TRAINING_COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ── 세례·임직 전용 ── */}
        {activityType === "세례·임직" && (
          <div className="space-y-3 border-t pt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
              <select value={form.sacrament_type} onChange={(e) => handleChange("sacrament_type", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {SACRAMENT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="pt-4 flex gap-3">
          <button type="submit" disabled={saving}
            className="flex-1 bg-navy-800 text-white py-3 rounded-lg font-medium hover:bg-navy-700 disabled:opacity-50">
            {saving ? "저장 중..." : "저장"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-6 py-3 rounded-lg font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ActivityNewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>}>
      <ActivityFormContent />
    </Suspense>
  );
}
