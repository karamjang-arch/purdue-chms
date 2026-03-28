"use client";

import { useAuthOrDemo, useFetch } from "@/lib/hooks";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { MinistryRoster, Member } from "@/types";
import { getDisplayName } from "@/lib/display-name";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, Suspense, useCallback } from "react";
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

  const { data: roster, loading: rl } = useFetch<MinistryRoster[]>(
    "/api/sheets/ministry_roster", DEMO_ROSTER
  );
  const { data: members } = useFetch<Member[]>("/api/members", DEMO_MEMBERS);

  const [search, setSearch] = useState("");
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // Build member lookup
  const memberMap = useMemo(() => {
    const map: Record<string, Member> = {};
    members?.forEach((m) => { map[m.name] = m; });
    return map;
  }, [members]);

  // Group roster by department → team
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
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const expandAll = () => setExpandedDepts(new Set(sortedDepts));
  const collapseAll = () => setExpandedDepts(new Set());

  // Email selection
  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const selectTeamEmails = (teamMembers: MinistryRoster[]) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      teamMembers.forEach((r) => {
        const m = memberMap[r.member_name];
        if (m?.email) next.add(m.email);
      });
      return next;
    });
  };

  const copyEmails = useCallback(async () => {
    const emails = Array.from(selectedEmails).join(", ");
    await navigator.clipboard.writeText(emails);
    alert(`${selectedEmails.size}개 이메일 복사 완료`);
  }, [selectedEmails]);

  const mailtoLink = useMemo(() => {
    const emails = Array.from(selectedEmails).join(",");
    return `mailto:?bcc=${encodeURIComponent(emails)}`;
  }, [selectedEmails]);

  if (rl) return <div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-800">봉사명부</h1>
        <span className="text-sm text-navy-500">{roster?.length || 0}건</span>
      </div>

      {/* Search + Actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <input
          type="text"
          placeholder="이름, 부서, 팀 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
        />
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={expandAll} className="text-xs text-navy-500 hover:underline">전체 펼치기</button>
          <button onClick={collapseAll} className="text-xs text-navy-500 hover:underline">전체 접기</button>
          {selectedEmails.size > 0 && (
            <>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-navy-600 font-medium">{selectedEmails.size}명 선택</span>
              <a href={mailtoLink} className="text-xs bg-navy-800 text-white px-2 py-1 rounded hover:bg-navy-700">
                이메일 보내기
              </a>
              <button onClick={copyEmails} className="text-xs border border-gray-200 px-2 py-1 rounded hover:bg-gray-50">
                이메일 복사
              </button>
              <button onClick={() => setSelectedEmails(new Set())} className="text-xs text-gray-400 hover:text-red-500">
                선택 해제
              </button>
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
              <button
                onClick={() => toggleDept(dept)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-navy-50 transition-colors"
              >
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
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{teamMembers.length}명</span>
                          <button
                            onClick={() => selectTeamEmails(teamMembers)}
                            className="text-xs text-navy-500 hover:underline"
                          >
                            전체 선택
                          </button>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {teamMembers.map((r, i) => {
                          const m = memberMap[r.member_name];
                          const hasEmail = !!m?.email;
                          const isSelected = hasEmail && selectedEmails.has(m!.email);

                          return (
                            <div key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-navy-50/30">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!hasEmail}
                                onChange={() => hasEmail && toggleEmail(m!.email)}
                                className="rounded border-gray-300"
                              />
                              {m && <Avatar name={r.member_name} photoUrl={m.photo_url} size="sm" />}
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={`/members/${encodeURIComponent(r.member_name)}${demoSuffix}`}
                                  className="text-sm text-navy-700 hover:underline font-medium"
                                >
                                  {m ? getDisplayName(m, members || []) : r.member_name}
                                </Link>
                                <span className="text-xs text-gray-400 ml-2">{r.role_in_team}</span>
                                {!hasEmail && <span className="text-xs text-red-300 ml-2">이메일 미등록</span>}
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
