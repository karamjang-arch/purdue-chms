"use client";

import { useAuthOrDemo, useFetch } from "@/lib/hooks";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { Member } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";

function AlumniContent() {
  const { isAuthed, role, isDemo } = useAuthOrDemo();
  const router = useRouter();
  const demoSuffix = isDemo ? "?demo=true" : "";

  useEffect(() => {
    if (!isDemo && (!isAuthed || role !== "admin")) router.push("/");
  }, [isAuthed, role, isDemo, router]);

  const { data: members, loading } = useFetch<Member[]>("/api/members", DEMO_MEMBERS);
  const [filterYear, setFilterYear] = useState("");

  const alumni = useMemo(() => {
    if (!members) return [];
    let list = members.filter((m) => m.status === "Alumni");
    if (filterYear) list = list.filter((m) => m.graduation_year === filterYear);
    return list.sort((a, b) => (b.graduation_year || "").localeCompare(a.graduation_year || ""));
  }, [members, filterYear]);

  const years = useMemo(() => {
    if (!members) return [];
    const set = new Set(members.filter((m) => m.status === "Alumni" && m.graduation_year).map((m) => m.graduation_year));
    return Array.from(set).sort().reverse();
  }, [members]);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-800">알럼나이</h1>
        <span className="text-sm text-navy-500">{alumni.length}명</span>
      </div>

      <div className="flex gap-2">
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">졸업연도 전체</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-50 text-navy-700">
              <th className="text-left px-4 py-3 font-semibold">이름</th>
              <th className="text-left px-4 py-3 font-semibold">전공</th>
              <th className="text-left px-4 py-3 font-semibold">졸업연도</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">마지막 연락</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {alumni.map((m) => (
              <tr key={m.name} className="hover:bg-navy-50/50">
                <td className="px-4 py-3">
                  <Link href={`/members/${encodeURIComponent(m.name)}${demoSuffix}`} className="text-navy-700 hover:underline font-medium">
                    {m.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{m.major}</td>
                <td className="px-4 py-3 text-gray-600">{m.graduation_year}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{m.last_contact || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {alumni.length === 0 && <p className="text-center text-gray-400 py-8">알럼나이가 없습니다.</p>}
      </div>
    </div>
  );
}

export default function AlumniPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>}>
      <AlumniContent />
    </Suspense>
  );
}
