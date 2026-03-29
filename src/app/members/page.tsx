"use client";

import { useAuthOrDemo, useFetch } from "@/lib/hooks";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { Member, DEPT_SUB_DISTRICTS, SUB_DISTRICT_GROUPS } from "@/types";
import { getDisplayName } from "@/lib/display-name";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";

const MEMBER_CLASS_OPTIONS = ["성도", "세례교인", "멤버가족", "집사", "안수집사", "권사", "장로", "교역자"];
const GROUP_ROLE_OPTIONS = ["구역장", "부구역장", "조장", "부조장", "조원", "반교사"];

type EditRow = Record<string, string>;

function MembersContent() {
  const { isAuthed, role, isDemo } = useAuthOrDemo();
  const router = useRouter();
  const demoSuffix = isDemo ? "?demo=true" : "";

  useEffect(() => {
    if (!isDemo && (!isAuthed || role !== "admin")) router.push("/");
  }, [isAuthed, role, isDemo, router]);

  const { data: members, loading, refetch } = useFetch<Member[]>("/api/members", DEMO_MEMBERS);

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterSubDist, setFilterSubDist] = useState("");
  const [filterGroup, setFilterGroup] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterBaptism, setFilterBaptism] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [includeFamily, setIncludeFamily] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "registered_date" | "last_contact" | "family">("name");
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Record<string, EditRow>>({});
  const [saving, setSaving] = useState(false);

  const subDistOptions = filterDept ? (DEPT_SUB_DISTRICTS[filterDept] || []) : [];
  const groupOptions = filterSubDist ? (SUB_DISTRICT_GROUPS[filterSubDist] || []) : [];

  const filtered = useMemo(() => {
    if (!members) return [];
    let list = [...members];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.startsWith(q) ||
          m.name_en.toLowerCase().startsWith(q) ||
          m.major.toLowerCase().includes(q) ||
          (m.company && m.company.toLowerCase().includes(q))
      );
    }

    if (filterDept || filterSubDist || filterGroup) {
      let directMatch = list;
      if (filterDept) directMatch = directMatch.filter((m) => m.department === filterDept);
      if (filterSubDist) directMatch = directMatch.filter((m) => m.sub_district === filterSubDist);
      if (filterGroup) directMatch = directMatch.filter((m) => m.group_name === filterGroup);

      if (includeFamily && (filterSubDist || filterGroup)) {
        const matchedTags = new Set(
          directMatch.filter((m) => m.family_tag).map((m) => m.family_tag)
        );
        list = list.filter((m) => {
          const ok =
            (filterDept ? m.department === filterDept : true) &&
            (filterSubDist ? m.sub_district === filterSubDist : true) &&
            (filterGroup ? m.group_name === filterGroup : true);
          return ok || (m.family_tag !== "" && matchedTags.has(m.family_tag));
        });
      } else {
        list = directMatch;
      }
    }

    if (filterRole) list = list.filter((m) => m.role === filterRole);
    if (filterStage) list = list.filter((m) => m.membership_stage === filterStage);
    if (filterBaptism) list = list.filter((m) => m.baptism === filterBaptism);
    if (filterStatus) list = list.filter((m) => m.status === filterStatus);

    if (sortBy === "family") {
      const ROLE_ORDER: Record<string, number> = { "남편": 0, "아내": 1, "본인": 2, "첫째": 3, "둘째": 4, "셋째": 5, "자녀": 6 };
      const familyInfo: Record<string, { headName: string; hasLeader: boolean }> = {};
      list.forEach((m) => {
        const tag = m.family_tag || `__solo_${m.name}`;
        if (!familyInfo[tag]) familyInfo[tag] = { headName: m.name, hasLeader: false };
        if (m.family_role === "남편" || (!familyInfo[tag].headName && m.family_role === "본인")) familyInfo[tag].headName = m.name;
        if (m.group_role === "구역장" || m.role === "구역장") familyInfo[tag].hasLeader = true;
      });
      list.sort((a, b) => {
        const tagA = a.family_tag || `__solo_${a.name}`;
        const tagB = b.family_tag || `__solo_${b.name}`;
        if (tagA !== tagB) {
          const infoA = familyInfo[tagA]; const infoB = familyInfo[tagB];
          if (infoA.hasLeader !== infoB.hasLeader) return infoA.hasLeader ? -1 : 1;
          return infoA.headName.localeCompare(infoB.headName, "ko");
        }
        return (ROLE_ORDER[a.family_role] ?? 99) - (ROLE_ORDER[b.family_role] ?? 99);
      });
    } else {
      list.sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name, "ko");
        if (sortBy === "registered_date") return b.registered_date.localeCompare(a.registered_date);
        return (b.last_contact || "").localeCompare(a.last_contact || "");
      });
    }

    return list;
  }, [members, search, filterDept, filterSubDist, filterGroup, includeFamily, filterRole, filterStage, filterBaptism, filterStatus, sortBy]);

  // Row key for edits/selection
  const rowKey = (m: Member) => `${m.name}::${m.phone}`;

  // Edit helpers
  const getEditVal = (m: Member, field: string) => edits[rowKey(m)]?.[field] ?? (m as unknown as Record<string, string>)[field] ?? "";
  const setEditVal = (m: Member, field: string, value: string) => {
    const key = rowKey(m);
    setEdits((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [field]: value },
    }));
  };
  const hasEdits = (m: Member) => {
    const e = edits[rowKey(m)];
    if (!e) return false;
    return Object.entries(e).some(([k, v]) => (m as unknown as Record<string, string>)[k] !== v);
  };

  // Save single row
  const saveRow = useCallback(async (m: Member) => {
    if (isDemo) return;
    const e = edits[rowKey(m)];
    if (!e) return;
    try {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalName: m.name, ...e }),
      });
      setEdits((prev) => { const n = { ...prev }; delete n[rowKey(m)]; return n; });
    } catch { alert("저장 실패"); }
  }, [isDemo, edits]);

  // Save all edited rows
  const saveAll = useCallback(async () => {
    if (isDemo) return;
    setSaving(true);
    const entries = Object.entries(edits);
    for (const [key, changes] of entries) {
      const name = key.split("::")[0];
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalName: name, ...changes }),
      });
    }
    setEdits({});
    await refetch();
    setSaving(false);
  }, [isDemo, edits, refetch]);

  // Batch update selected
  const batchUpdate = useCallback(async (field: string, value: string) => {
    if (selected.size === 0 || !value) return;
    const label = field === "sub_district" ? "소속" : field === "group_name" ? "소그룹" : field === "group_role" ? "역할" : field === "member_class" ? "신급" : field;
    if (!confirm(`${selected.size}명의 ${label}을(를) "${value}"(으)로 변경합니다. 계속?`)) return;
    setSaving(true);
    for (const key of Array.from(selected)) {
      const name = key.split("::")[0];
      const extra: Record<string, string> = { [field]: value };
      if (field === "sub_district") extra.group_name = "";
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalName: name, ...extra }),
      });
    }
    setSelected(new Set());
    await refetch();
    setSaving(false);
  }, [selected, refetch]);

  // Select all / none
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(rowKey)));
    }
  };

  // Email selected
  const selectedEmails = useMemo(() => {
    if (!members) return [];
    return members.filter((m) => selected.has(rowKey(m)) && m.email).map((m) => m.email);
  }, [members, selected]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>;
  }

  const editedCount = Object.keys(edits).length;

  return (
    <div className="max-w-full mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-800">성도 목록</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-navy-500">{filtered.length}명</span>
          {editedCount > 0 && (
            <button onClick={saveAll} disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
              {saving ? "저장 중..." : `${editedCount}건 저장`}
            </button>
          )}
          <button
            onClick={() => { setEditMode(!editMode); if (editMode) { setSelected(new Set()); setEdits({}); } }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              editMode ? "bg-navy-800 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {editMode ? "편집 완료" : "편집 모드"}
          </button>
        </div>
      </div>

      {/* Batch action bar */}
      {editMode && selected.size > 0 && (
        <div className="bg-navy-50 rounded-xl p-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-navy-700">{selected.size}명 선택</span>
          <select onChange={(e) => { if (e.target.value) batchUpdate("sub_district", e.target.value); e.target.value = ""; }} className="border rounded px-2 py-1 text-xs">
            <option value="">소속 일괄</option>
            {filterDept && (DEPT_SUB_DISTRICTS[filterDept] || []).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select onChange={(e) => { if (e.target.value) batchUpdate("group_name", e.target.value); e.target.value = ""; }} className="border rounded px-2 py-1 text-xs">
            <option value="">소그룹 일괄</option>
            {filterSubDist && (SUB_DISTRICT_GROUPS[filterSubDist] || []).map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select onChange={(e) => { if (e.target.value) batchUpdate("group_role", e.target.value); e.target.value = ""; }} className="border rounded px-2 py-1 text-xs">
            <option value="">역할 일괄</option>
            {GROUP_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select onChange={(e) => { if (e.target.value) batchUpdate("member_class", e.target.value); e.target.value = ""; }} className="border rounded px-2 py-1 text-xs">
            <option value="">신급 일괄</option>
            {MEMBER_CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {selectedEmails.length > 0 && (
            <a href={`mailto:?bcc=${encodeURIComponent(selectedEmails.join(","))}`}
              className="px-2 py-1 rounded bg-navy-800 text-white text-xs hover:bg-navy-700">
              이메일 보내기
            </a>
          )}
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-red-500">선택 해제</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <input type="text" placeholder="이름, 전공 검색..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300" />
        <div className="flex flex-wrap gap-2">
          <select value={filterDept} onChange={(e) => { setFilterDept(e.target.value); setFilterSubDist(""); setFilterGroup(""); setIncludeFamily(false); }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
            <option value="">부서 전체</option>
            {Object.keys(DEPT_SUB_DISTRICTS).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterSubDist} onChange={(e) => { setFilterSubDist(e.target.value); setFilterGroup(""); if (e.target.value) setSortBy("family"); }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" disabled={!subDistOptions.length}>
            <option value="">소속 전체</option>
            {subDistOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterGroup} onChange={(e) => { setFilterGroup(e.target.value); if (e.target.value) setSortBy("family"); }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" disabled={!groupOptions.length}>
            <option value="">소그룹 전체</option>
            {groupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          {(filterSubDist || filterGroup) && (
            <button onClick={() => setIncludeFamily(!includeFamily)} className={`rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${includeFamily ? "bg-navy-800 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>가족 포함</button>
          )}
          <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
            <option value="">멤버십 전체</option>
            {["Visitor", "Member", "Fellow", "Leader"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
            <option value="">상태 전체</option>
            {["활동", "확인필요", "Alumni"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterBaptism} onChange={(e) => setFilterBaptism(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
            <option value="">세례 전체</option>
            {["세례", "유아세례", "입교", ""].map((s) => <option key={s} value={s}>{s || "미세례"}</option>)}
          </select>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
            <option value="">직분 전체</option>
            {["전도사", "집사", "권사", "장로", "구역장", "리더"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
            <option value="name">이름순</option>
            <option value="registered_date">등록일순</option>
            <option value="last_contact">최근연락순</option>
            <option value="family">가족별</option>
          </select>
        </div>
      </div>

      {/* Table with horizontal scroll */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="text-sm min-w-[900px] w-full">
          <thead>
            <tr className="bg-navy-50 text-navy-700">
              {editMode && (
                <th className="px-2 py-3 sticky left-0 bg-navy-50 z-10 w-8">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded" />
                </th>
              )}
              <th className={`text-left px-3 py-3 font-semibold sticky ${editMode ? "left-8" : "left-0"} bg-navy-50 z-10 w-[140px]`}>이름</th>
              <th className="text-left px-2 py-3 font-semibold w-[90px]">소속</th>
              <th className="text-left px-2 py-3 font-semibold w-[90px]">소그룹</th>
              <th className="text-left px-2 py-3 font-semibold w-[70px]">역할</th>
              <th className="text-left px-2 py-3 font-semibold w-[70px]">멤버십</th>
              <th className="text-left px-2 py-3 font-semibold w-[120px]">연락처</th>
              <th className="text-left px-2 py-3 font-semibold w-[180px]">이메일</th>
              <th className="text-left px-2 py-3 font-semibold w-[110px]">생년월일</th>
              <th className="text-left px-2 py-3 font-semibold w-[90px]">신급</th>
              <th className="text-left px-2 py-3 font-semibold min-w-[150px]">메모</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((m, idx) => {
              const key = rowKey(m);
              const displayName = members ? getDisplayName(m, members) : m.name;
              const prevTag = idx > 0 ? (filtered[idx - 1].family_tag || "") : "";
              const curTag = m.family_tag || "";
              const familyBorder = sortBy === "family" && idx > 0 && curTag !== prevTag;
              const isSelected = selected.has(key);
              const dirty = hasEdits(m);
              const rowSubDistOpts = m.department ? (DEPT_SUB_DISTRICTS[m.department] || []) : [];
              const editSubDist = getEditVal(m, "sub_district");
              const rowGroupOpts = editSubDist ? (SUB_DISTRICT_GROUPS[editSubDist] || []) : [];
              const sel = "border border-gray-200 rounded px-1 py-0.5 text-xs";
              const inp = "border border-gray-200 rounded px-1 py-0.5 text-xs w-full";

              return (
              <tr key={`${key}-${idx}`} className={`hover:bg-navy-50/50 transition-colors${familyBorder ? " border-t-2 border-navy-200" : ""}${dirty ? " bg-yellow-50" : ""}`}>
                {editMode && (
                  <td className="px-2 py-2 sticky left-0 bg-white z-10">
                    <input type="checkbox" checked={isSelected} onChange={() => {
                      const next = new Set(selected);
                      if (isSelected) next.delete(key); else next.add(key);
                      setSelected(next);
                    }} className="rounded" />
                  </td>
                )}
                <td className={`px-3 py-2 sticky ${editMode ? "left-8" : "left-0"} bg-white z-10`}>
                  <Link href={`/members/${encodeURIComponent(m.name)}${demoSuffix}`} className="flex items-center gap-1.5 text-navy-700 hover:underline font-medium">
                    <Avatar name={m.name} photoUrl={m.photo_url} size="sm" />
                    <span className="truncate text-xs">{displayName}</span>
                  </Link>
                  {dirty && (
                    <button onClick={() => saveRow(m)} className="text-[10px] text-green-600 hover:underline ml-7">저장</button>
                  )}
                </td>
                <td className="px-2 py-2">
                  {editMode ? (
                    <select value={getEditVal(m, "sub_district")} onChange={(e) => { setEditVal(m, "sub_district", e.target.value); setEditVal(m, "group_name", ""); }} className={sel}>
                      <option value="">-</option>
                      {rowSubDistOpts.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : <span className="text-gray-600 text-xs">{m.sub_district}</span>}
                </td>
                <td className="px-2 py-2">
                  {editMode ? (
                    <select value={getEditVal(m, "group_name")} onChange={(e) => setEditVal(m, "group_name", e.target.value)} className={sel}>
                      <option value="">-</option>
                      {rowGroupOpts.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  ) : <span className="text-gray-600 text-xs">{m.group_name}</span>}
                </td>
                <td className="px-2 py-2">
                  {editMode ? (
                    <select value={getEditVal(m, "group_role")} onChange={(e) => setEditVal(m, "group_role", e.target.value)} className={sel}>
                      <option value="">-</option>
                      {GROUP_ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : <span className="text-gray-600 text-xs">{m.group_role}</span>}
                </td>
                <td className="px-2 py-2">
                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                    m.membership_stage === "Leader" ? "bg-purple-100 text-purple-700" :
                    m.membership_stage === "Fellow" ? "bg-blue-100 text-blue-700" :
                    m.membership_stage === "Member" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{m.membership_stage}</span>
                </td>
                <td className="px-2 py-2">
                  {editMode ? (
                    <input value={getEditVal(m, "phone")} onChange={(e) => setEditVal(m, "phone", e.target.value)} className={inp} />
                  ) : <span className="text-gray-500 text-xs">{m.phone}</span>}
                </td>
                <td className="px-2 py-2">
                  {editMode ? (
                    <input value={getEditVal(m, "email")} onChange={(e) => setEditVal(m, "email", e.target.value)} className={inp} />
                  ) : <span className="text-gray-500 text-xs">{m.email}</span>}
                </td>
                <td className="px-2 py-2">
                  {editMode ? (
                    <input type="date" value={getEditVal(m, "birthday")} onChange={(e) => setEditVal(m, "birthday", e.target.value)} className={inp} />
                  ) : <span className="text-gray-500 text-xs">{m.birthday}</span>}
                </td>
                <td className="px-2 py-2">
                  {editMode ? (
                    <select value={getEditVal(m, "member_class")} onChange={(e) => setEditVal(m, "member_class", e.target.value)} className={sel}>
                      <option value="">-</option>
                      {MEMBER_CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : <span className="text-gray-500 text-xs">{m.member_class}</span>}
                </td>
                <td className="px-2 py-2">
                  {editMode ? (
                    <input value={getEditVal(m, "memo")} onChange={(e) => setEditVal(m, "memo", e.target.value)} className={inp} title={m.memo} />
                  ) : <span className="text-gray-400 text-xs truncate block max-w-[150px]" title={m.memo}>{m.memo ? m.memo.slice(0, 30) + (m.memo.length > 30 ? "..." : "") : ""}</span>}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">검색 결과가 없습니다.</p>}
      </div>
    </div>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>}>
      <MembersContent />
    </Suspense>
  );
}
