"use client";

import { useAuthOrDemo, useFetch } from "@/lib/hooks";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { Member } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, Suspense } from "react";
import Link from "next/link";

function NewcomersContent() {
  const { isAuthed, role, isDemo } = useAuthOrDemo();
  const router = useRouter();
  const demoSuffix = isDemo ? "?demo=true" : "";

  useEffect(() => {
    if (!isDemo && (!isAuthed || (role !== "admin" && role !== "newcomer_team"))) {
      router.push("/");
    }
  }, [isAuthed, role, isDemo, router]);

  const { data: members, loading } = useFetch<Member[]>("/api/members", DEMO_MEMBERS);

  const newcomers = useMemo(() => {
    if (!members) return [];
    return members
      .filter((m) => m.membership_stage === "Visitor" || m.membership_stage === "Member")
      .sort((a, b) => (b.registered_date || "").localeCompare(a.registered_date || ""));
  }, [members]);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-800">새가족 명단</h1>
        <Link
          href={"/members/new" + demoSuffix}
          className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-700"
        >
          새가족 등록
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-50 text-navy-700">
              <th className="text-left px-4 py-3 font-semibold">이름</th>
              <th className="text-left px-4 py-3 font-semibold">부서</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">구역</th>
              <th className="text-left px-4 py-3 font-semibold">등록일</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">연락처</th>
              <th className="text-left px-4 py-3 font-semibold">단계</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {newcomers.map((m) => (
              <tr key={m.name} className="hover:bg-navy-50/50">
                <td className="px-4 py-3">
                  <Link href={`/members/${encodeURIComponent(m.name)}${demoSuffix}`} className="text-navy-700 hover:underline font-medium">
                    {m.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">{m.department}</td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{m.district}</td>
                <td className="px-4 py-3 text-gray-600">{m.registered_date}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{m.phone}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    m.membership_stage === "Visitor" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-700"
                  }`}>
                    {m.membership_stage}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {newcomers.length === 0 && <p className="text-center text-gray-400 py-8">새가족이 없습니다.</p>}
      </div>
    </div>
  );
}

export default function NewcomersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>}>
      <NewcomersContent />
    </Suspense>
  );
}
