"use client";

import { useAuthOrDemo, useFetch } from "@/lib/hooks";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { MinistryRoster, Member, MINISTRY_DEPARTMENTS } from "@/types";
import { getDisplayName } from "@/lib/display-name";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, Suspense, useCallback } from "react";
import { usePersistedState } from "@/lib/use-persisted-state";
import Link from "next/link";
import Avatar from "@/components/Avatar";

const DEMO_ROSTER: MinistryRoster[] = [];

function MinistryContent() {
  const { isAuthed, role, isDemo } = useAuthOrDemo();
  const router = useRouter();
  const demoSuffix = isDemo ? "?demo=true" : "";

  useEffect(() => {
    if (!isDemo && (!isAuthed || role !== "admin")) router.push("/");
  }, [isAuthed, role, isDemo, router]);

  const { data: roster, loading: rl, refetch } = useFetch<MinistryRoster[]>(
    "/api/sheets/ministry_roster", DEMO_ROSTER
  );
  const { data: members } = useFetch<Member[]>("/api/members", DEMO_MEMBERS);

  const [search, setSearch] = usePersistedState("chms-ministry-search", "");
  const [expandedList, setExpandedList] = usePersistedState<string[]>("chms-ministry-expanded", []);
  const expandedDepts = useMemo(() => new Set(expandedList), [expandedList]);
  const setExpandedDepts = useCallback((fn: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    if (typeof fn === "function") {
      setExpandedList((prev) => Array.from(fn(new Set(prev))));
    } else {
      setExpandedList(Array.from(fn));
    }
  }, [setExpandedList]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ member_name: "", department_ministry: "", team: "", role_in_team: "" });
  const [addQuery, setAddQuery] = useState("");
  const [addSaving, setAddSaving] = useState(false);

  const memberMap = useMemo(() => {
    const map: Record<string, Member> = {};
    members?.forEach((m) => { map[m.name] = m; });
    return map;
  }, [members]);

  const tree = useMemo(() => {
    if (!roster) return {};
    const t: Record<string, Record<string, MinistryRoster[]>> = {};
    let filtered = roster;
    if (search) {
      const q = search.toLowerCase();
      filtered = roster.filter((r) =>
        r.member_name.toLowerCase().includes(q) ||
        r.department_ministry.toLowerCase().includes(q) ||
        r.team.toLowerCase().includes(q)
      );
    }
    filtered.forEach((r) => {
      const dept = r.department_ministry || "기타";
      const team = r.team || "(전체)";
      if (!t[dept]) t[dept] = {};
      if (!t[dept][team]) t[dept][team] = [];
      t[dept][team].push(r);
    });
    return t;
  }, [roster, search]);

  const deptOrder = ["위원회", "교구부", "선교부", "예배부", "교육부", "재정부"];
  const sortedDepts = useMemo(() => {
    const keys = Object.keys(tree);
    return keys.sort((a, b) => {
      const ai = deptOrder.indexOf(a);
      const bi = deptOrder.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [tree]);

  const toggleDept = (dept: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept); else next.add(dept);
      return next;
    });
  };

  const expandAll = () => setExpandedDepts(new Set(sortedDepts));
  const collapseAll = () => setExpandedDepts(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Delete selected
  const deleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    // Find team info for confirmation message
    const items = roster?.filter((r) => selectedIds.has(r.id)) || [];
    const teams = Array.from(new Set(items.map((r) => r.team || r.department_ministry))).join(", ");
    if (!confirm(`${selectedIds.size}명을 ${teams}에서 삭제합니다. 계속?`)) return;

    for (const id of Array.from(selectedIds)) {
      await fetch("/api/sheets/ministry_roster", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    }
    setSelectedIds(new Set());
    await refetch();
  }, [selectedIds, roster, refetch]);

  // Add member
  const handleAdd = async () => {
    if (!addForm.member_name || !addForm.department_ministry) return;
    setAddSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const nextId = `M${String((roster?.length || 0) + 1).padStart(3, "0")}`;
    await fetch("/api/sheets/ministry_roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        values: [nextId, addForm.department_ministry, addForm.team, "", addForm.member_name, addForm.role_in_team, today, "", ""],
      }),
    });
    setAddForm({ member_name: "", department_ministry: "", team: "", role_in_team: "" });
    setAddQuery("");
    setShowAddModal(false);
    setAddSaving(false);
    await refetch();
  };

  // Email helpers
  const selectedEmails = useMemo(() => {
    if (!roster || !members) return [];
    return roster
      .filter((r) => selectedIds.has(r.id))
      .map((r) => memberMap[r.member_name]?.email)
      .filter(Boolean) as string[];
  }, [roster, members, selectedIds, memberMap]);

  const copyEmails = useCallback(async () => {
    await navigator.clipboard.writeText(selectedEmails.join(", "));
    alert(`${selectedEmails.length}개 이메일 복사 완료`);
  }, [selectedEmails]);

  const addSuggestions = useMemo(() => {
    if (!addQuery || !members) return [];
    const q = addQuery.toLowerCase();
    return members.filter((m) => m.name.startsWith(q)).slice(0, 8);
  }, [addQuery, members]);

  if (rl) return <div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-800">봉사명부</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-navy-500">{roster?.length || 0}건</span>
          <button onClick={() => setShowAddModal(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-navy-800 text-white hover:bg-navy-700">
            + 봉사자 추가
          </button>
        </div>
      </div>

      {/* Search + Actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <input type="text" placeholder="이름, 부서, 팀 검색..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300" />
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={expandAll} className="text-xs text-navy-500 hover:underline">전체 펼치기</button>
          <button onClick={collapseAll} className="text-xs text-navy-500 hover:underline">전체 접기</button>
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-navy-600 font-medium">{selectedIds.size}명 선택</span>
              <button onClick={deleteSelected} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">선택 삭제</button>
              {selectedEmails.length > 0 && (
                <>
                  <a href={`mailto:?bcc=${encodeURIComponent(selectedEmails.join(","))}`} className="text-xs bg-navy-800 text-white px-2 py-1 rounded hover:bg-navy-700">이메일 보내기</a>
                  <button onClick={copyEmails} className="text-xs border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">이메일 복사</button>
                </>
              )}
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-gray-400 hover:text-red-500">선택 해제</button>
            </>
          )}
        </div>
      </div>

      {/* Tree View */}
      <div className="space-y-3">
        {sortedDepts.map((dept) => {
          const teams = tree[dept];
          const totalCount = Object.values(teams).reduce((s, t) => s + t.length, 0);
          const isExpanded = expandedDepts.has(dept);
          return (
            <div key={dept} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button onClick={() => toggleDept(dept)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-navy-50 transition-colors">
                <div className="flex items-center gap-2">
                  <svg className={`w-4 h-4 text-navy-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-semibold text-navy-800">{dept}</span>
                </div>
                <span className="text-sm text-navy-400">{totalCount}명</span>
              </button>
              {isExpanded && (
                <div className="border-t border-gray-100">
                  {Object.entries(teams).sort().map(([team, teamMembers]) => (
                    <div key={team} className="border-b border-gray-50 last:border-0">
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                        <span className="text-sm font-medium text-navy-600">{team}</span>
                        <span className="text-xs text-gray-400">{teamMembers.length}명</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {teamMembers.map((r) => {
                          const m = memberMap[r.member_name];
                          return (
                            <div key={r.id} className="flex items-center gap-3 px-4 py-2 hover:bg-navy-50/30">
                              <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} className="rounded border-gray-300" />
                              {m && <Avatar name={r.member_name} photoUrl={m.photo_url} size="sm" />}
                              <div className="flex-1 min-w-0">
                                <Link href={`/members/${encodeURIComponent(r.member_name)}${demoSuffix}`} className="text-sm text-navy-700 hover:underline font-medium">
                                  {m ? getDisplayName(m, members || []) : r.member_name}
                                </Link>
                                <span className="text-xs text-gray-400 ml-2">{r.role_in_team}</span>
                              </div>
                              <span className="text-xs text-gray-400 hidden sm:block">{m?.phone || ""}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-navy-800">봉사자 추가</h2>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">성도 *</label>
              <input type="text" value={addForm.member_name || addQuery} onChange={(e) => { setAddQuery(e.target.value); setAddForm((f) => ({ ...f, member_name: "" })); }}
                placeholder="이름 검색..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              {addSuggestions.length > 0 && !addForm.member_name && (
                <ul className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto">
                  {addSuggestions.map((m) => (
                    <li key={m.name + m.phone} onClick={() => { setAddForm((f) => ({ ...f, member_name: m.name })); setAddQuery(m.name); }}
                      className="px-3 py-2 text-sm hover:bg-navy-50 cursor-pointer">{m.name} <span className="text-gray-400">({m.department})</span></li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">부서/사역 *</label>
              <select value={addForm.department_ministry} onChange={(e) => setAddForm((f) => ({ ...f, department_ministry: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">선택</option>
                {MINISTRY_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">팀</label>
                <input type="text" value={addForm.team} onChange={(e) => setAddForm((f) => ({ ...f, team: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                <select value={addForm.role_in_team} onChange={(e) => setAddForm((f) => ({ ...f, role_in_team: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">선택</option>
                  {["부장", "팀장", "부팀장", "팀원"].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleAdd} disabled={addSaving || !addForm.member_name || !addForm.department_ministry}
                className="flex-1 bg-navy-800 text-white py-2 rounded-lg font-medium hover:bg-navy-700 disabled:opacity-50">
                {addSaving ? "추가 중..." : "추가"}
              </button>
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MinistryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>}>
      <MinistryContent />
    </Suspense>
  );
}
