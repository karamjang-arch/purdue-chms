"use client";

import { useAuthOrDemo, useFetch } from "@/lib/hooks";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { Member, DEPARTMENT_DISTRICTS } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";

function MembersContent() {
  const { isAuthed, role, isDemo } = useAuthOrDemo();
  const router = useRouter();
  const demoSuffix = isDemo ? "?demo=true" : "";

  useEffect(() => {
    if (!isDemo && (!isAuthed || role !== "admin")) router.push("/");
  }, [isAuthed, role, isDemo, router]);

  const { data: members, loading } = useFetch<Member[]>("/api/members", DEMO_MEMBERS);

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterBaptism, setFilterBaptism] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "registered_date" | "last_contact">("name");

  const districtOptions = filterDept ? (DEPARTMENT_DISTRICTS[filterDept] || []) : [];

  const filtered = useMemo(() => {
    if (!members) return [];
    let list = [...members];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.name_en.toLowerCase().includes(q) ||
          m.major.toLowerCase().includes(q)
      );
    }
    if (filterDept) list = list.filter((m) => m.department === filterDept);
    if (filterDistrict) list = list.filter((m) => m.district === filterDistrict);
    if (filterRole) list = list.filter((m) => m.role === filterRole);
    if (filterStage) list = list.filter((m) => m.membership_stage === filterStage);
    if (filterBaptism) list = list.filter((m) => m.baptism === filterBaptism);
    if (filterStatus) list = list.filter((m) => m.status === filterStatus);

    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name, "ko");
      if (sortBy === "registered_date") return b.registered_date.localeCompare(a.registered_date);
      return (b.last_contact || "").localeCompare(a.last_contact || "");
    });

    return list;
  }, [members, search, filterDept, filterDistrict, filterRole, filterStage, filterBaptism, filterStatus, sortBy]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-800">성도 목록</h1>
        <span className="text-sm text-navy-500">{filtered.length}명</span>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <input
          type="text"
          placeholder="이름, 전공 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
        />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <select value={filterDept} onChange={(e) => { setFilterDept(e.target.value); setFilterDistrict(""); }} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
            <option value="">부서 전체</option>
            {Object.keys(DEPARTMENT_DISTRICTS).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" disabled={!districtOptions.length}>
            <option value="">구역 전체</option>
            {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
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
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-50 text-navy-700">
              <th className="text-left px-4 py-3 font-semibold">이름</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">부서</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">구역</th>
              <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">직분</th>
              <th className="text-left px-4 py-3 font-semibold">멤버십</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">연락처</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((m) => (
              <tr key={m.name + m.email} className="hover:bg-navy-50/50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/members/${encodeURIComponent(m.name)}${demoSuffix}`} className="text-navy-700 hover:underline font-medium">
                    {m.name}
                  </Link>
                  <span className="text-gray-400 text-xs ml-1 hidden sm:inline">{m.name_en}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-600">{m.department}</td>
                <td className="px-4 py-3 hidden md:table-cell text-gray-600">{m.district}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-gray-600">{m.role}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    m.membership_stage === "Leader" ? "bg-purple-100 text-purple-700" :
                    m.membership_stage === "Fellow" ? "bg-blue-100 text-blue-700" :
                    m.membership_stage === "Member" ? "bg-green-100 text-green-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {m.membership_stage}
                  </span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell text-gray-500 text-xs">{m.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">검색 결과가 없습니다.</p>
        )}
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
