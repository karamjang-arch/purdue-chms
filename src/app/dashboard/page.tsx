"use client";

import { useAuthOrDemo, useFetch } from "@/lib/hooks";
import { DEMO_MEMBERS, DEMO_VISITATIONS } from "@/lib/demo-data";
import { Member, Visitation, DEPT_COLORS } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const FALLBACK_COLOR = "#D1D5DB";

function DashboardContent() {
  const { isAuthed, role, isDemo } = useAuthOrDemo();
  const router = useRouter();
  const demoSuffix = isDemo ? "?demo=true" : "";

  useEffect(() => {
    if (!isDemo && !isAuthed) router.push("/");
  }, [isAuthed, isDemo, router]);

  const { data: members, loading: ml } = useFetch<Member[]>("/api/members", DEMO_MEMBERS);
  const { data: visitations, loading: vl } = useFetch<Visitation[]>("/api/visitations", DEMO_VISITATIONS);

  const stats = useMemo(() => {
    if (!members) return null;
    const active = members.filter((m) => m.status === "활동").length;
    const total = members.length;
    const needCheck = members.filter((m) => m.status === "확인필요").length;
    const alumni = members.filter((m) => m.status === "Alumni").length;

    const visitor = members.filter((m) => m.membership_stage === "Visitor").length;
    const member = members.filter((m) => m.membership_stage === "Member").length;
    const fellow = members.filter((m) => m.membership_stage === "Fellow").length;
    const leader = members.filter((m) => m.membership_stage === "Leader").length;

    // Department pie
    const deptMap: Record<string, number> = {};
    members.filter((m) => m.status === "활동").forEach((m) => {
      const d = m.department || "미지정";
      deptMap[d] = (deptMap[d] || 0) + 1;
    });
    const deptPie = Object.entries(deptMap).map(([name, value]) => ({ name, value }));

    // District bar (장년부)
    const distMap: Record<string, number> = {};
    members.filter((m) => m.department === "장년부" && m.status === "활동").forEach((m) => {
      const d = m.district || "미지정";
      distMap[d] = (distMap[d] || 0) + 1;
    });
    const distBar = Object.entries(distMap)
      .sort((a, b) => a[0].localeCompare(b[0], "ko"))
      .map(([name, value]) => ({ name, value }));

    // Birthday this month — check both birthday and birth_month_day
    const now = new Date();
    const thisMonth = String(now.getMonth() + 1).padStart(2, "0");
    const birthdays = members.filter((m) => {
      if (m.status !== "활동") return false;
      if (m.birthday) {
        const parts = m.birthday.split("-");
        if (parts[1] === thisMonth) return true;
      }
      if (m.birth_month_day) {
        const parts = m.birth_month_day.split("-");
        if (parts[0] === thisMonth) return true;
      }
      return false;
    });

    // Last 90 days no contact
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const noContact = members.filter((m) => {
      if (m.status !== "활동") return false;
      if (!m.last_contact) return true;
      return new Date(m.last_contact) < ninetyDaysAgo;
    });

    return {
      active, total, needCheck, alumni,
      visitor, member, fellow, leader,
      deptPie, distBar, birthdays, noContact,
    };
  }, [members]);

  const followUpDue = useMemo(() => {
    if (!visitations) return [];
    const now = new Date();
    const weekLater = new Date();
    weekLater.setDate(now.getDate() + 7);
    return visitations.filter((v) => {
      if (!v.follow_up_date || v.follow_up_done === "완료") return false;
      const d = new Date(v.follow_up_date);
      return d <= weekLater;
    });
  }, [visitations]);

  const recentVisitations = useMemo(() => {
    if (!visitations) return [];
    return [...visitations].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [visitations]);

  if (ml || vl || !stats) {
    return <div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>;
  }

  if (role !== "admin" && !isDemo) {
    router.push("/newcomers" + demoSuffix);
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-navy-800">대시보드</h1>

      {/* Status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "활동 성도", value: stats.active, color: "bg-green-50 text-green-700" },
          { label: "전체 재적", value: stats.total, color: "bg-blue-50 text-blue-700" },
          { label: "확인필요", value: stats.needCheck, color: "bg-yellow-50 text-yellow-700" },
          { label: "Alumni", value: stats.alumni, color: "bg-gray-50 text-gray-600" },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl p-4 ${c.color}`}>
            <p className="text-sm font-medium">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Membership stage cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Visitor", value: stats.visitor },
          { label: "Member", value: stats.member },
          { label: "Fellow", value: stats.fellow },
          { label: "Leader", value: stats.leader },
        ].map((c) => (
          <div key={c.label} className="rounded-xl p-4 bg-navy-50 text-navy-700">
            <p className="text-sm font-medium">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-navy-700 mb-4">부서별 현황</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={stats.deptPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {stats.deptPie.map((entry, i) => (
                  <Cell key={i} fill={DEPT_COLORS[entry.name] || FALLBACK_COLOR} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {stats.distBar.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-navy-700 mb-4">장년부 구역별 현황</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.distBar}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#93C5FD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Lists */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-navy-700 mb-3">이번 달 생일</h2>
          {stats.birthdays.length === 0 ? (
            <p className="text-sm text-gray-400">이번 달 생일자가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {stats.birthdays.map((m) => (
                <li key={m.name} className="flex justify-between text-sm">
                  <Link href={`/members/${encodeURIComponent(m.name)}${demoSuffix}`} className="text-navy-700 hover:underline">
                    {m.name}
                  </Link>
                  <span className="text-gray-500">{m.birthday || m.birth_month_day}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-navy-700 mb-3">최근 활동</h2>
          {recentVisitations.length === 0 ? (
            <p className="text-sm text-gray-400">활동 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {recentVisitations.map((v) => (
                <li key={v.id} className="text-sm">
                  <span className="text-gray-500 mr-2">{v.date}</span>
                  <Link href={`/members/${encodeURIComponent(v.member_name)}${demoSuffix}`} className="text-navy-700 hover:underline font-medium">
                    {v.member_name}
                  </Link>
                  <span className="text-gray-400 ml-2">({v.visitation_type})</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-navy-700 mb-3">이번 주 후속 심방 필요</h2>
          {followUpDue.length === 0 ? (
            <p className="text-sm text-gray-400">예정된 후속 심방이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {followUpDue.map((v) => (
                <li key={v.id} className="text-sm">
                  <span className="text-red-500 mr-2">{v.follow_up_date}</span>
                  <Link href={`/members/${encodeURIComponent(v.member_name)}${demoSuffix}`} className="text-navy-700 hover:underline font-medium">
                    {v.member_name}
                  </Link>
                  <span className="text-gray-400 ml-2 block sm:inline">{v.follow_up}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-navy-700 mb-3">최근 3개월 미연락 성도</h2>
          {stats.noContact.length === 0 ? (
            <p className="text-sm text-gray-400">모든 활동 성도와 연락이 되었습니다.</p>
          ) : (
            <ul className="space-y-2">
              {stats.noContact.map((m) => (
                <li key={m.name} className="flex justify-between text-sm">
                  <Link href={`/members/${encodeURIComponent(m.name)}${demoSuffix}`} className="text-navy-700 hover:underline">
                    {m.name}
                  </Link>
                  <span className="text-gray-400">{m.last_contact || "기록 없음"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>}>
      <DashboardContent />
    </Suspense>
  );
}
