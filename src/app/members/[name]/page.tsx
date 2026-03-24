"use client";

import { useAuthOrDemo, useFetch, useDemoData } from "@/lib/hooks";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { Member, Visitation, TrainingRecord, MinistryRoster, Sacrament, MEMBER_HEADERS } from "@/types";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";

const STAGES = ["Visitor", "Member", "Fellow", "Leader"];
const STAGE_FIELDS: Record<string, string> = {
  Visitor: "",
  Member: "welcome_table",
  Fellow: "fellow_table",
  Leader: "gospel_into_leadership",
};

function MemberDetailContent() {
  const { isAuthed, role, isDemo } = useAuthOrDemo();
  const router = useRouter();
  const params = useParams();
  const name = decodeURIComponent(params.name as string);
  const demoSuffix = isDemo ? "?demo=true" : "";
  const demo = useDemoData();

  useEffect(() => {
    if (!isDemo && (!isAuthed || role !== "admin")) router.push("/");
  }, [isAuthed, role, isDemo, router]);

  const { data: members } = useFetch<Member[]>("/api/members", DEMO_MEMBERS);
  const { data: visitations } = useFetch<Visitation[]>("/api/visitations", demo.visitations);
  const { data: training } = useFetch<TrainingRecord[]>("/api/sheets/training_records", demo.training);
  const { data: ministry } = useFetch<MinistryRoster[]>("/api/sheets/ministry_roster", demo.ministry);
  const { data: sacraments } = useFetch<Sacrament[]>("/api/sheets/sacraments", demo.sacraments);

  const member = useMemo(() => members?.find((m) => m.name === name), [members, name]);
  const familyMembers = useMemo(() => {
    if (!member?.family_tag || !members) return [];
    return members.filter((m) => m.family_tag === member.family_tag && m.name !== name);
  }, [members, member, name]);

  const memberVisitations = useMemo(
    () => visitations?.filter((v) => v.member_name === name).sort((a, b) => b.date.localeCompare(a.date)) || [],
    [visitations, name]
  );
  const memberTraining = useMemo(
    () => training?.filter((t) => t.member_name === name) || [],
    [training, name]
  );
  const memberMinistry = useMemo(
    () => ministry?.filter((m) => m.member_name === name) || [],
    [ministry, name]
  );
  const memberSacraments = useMemo(
    () => sacraments?.filter((s) => s.member_name === name) || [],
    [sacraments, name]
  );

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) {
      const obj: Record<string, string> = {};
      MEMBER_HEADERS.forEach((h) => { obj[h] = (member as unknown as Record<string, string>)[h] || ""; });
      setForm(obj);
    }
  }, [member]);

  const handleSave = async () => {
    if (isDemo) { setEditing(false); return; }
    setSaving(true);
    try {
      await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalName: name, ...form }),
      });
      setEditing(false);
      router.refresh();
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!member) {
    return <div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>;
  }

  const currentStageIndex = STAGES.indexOf(member.membership_stage);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">{member.name}</h1>
          <p className="text-navy-500 text-sm">{member.name_en}</p>
        </div>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-navy-800 text-white hover:bg-navy-700 disabled:opacity-50"
        >
          {saving ? "저장 중..." : editing ? "저장" : "편집"}
        </button>
      </div>

      {/* Section 1: Personal + Church Info */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold text-navy-700 mb-3">인적사항 / 교회 정보</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { label: "상태", key: "status" },
            { label: "성별", key: "gender" },
            { label: "생년월일", key: "birthday" },
            { label: "연락처", key: "phone" },
            { label: "이메일", key: "email" },
            { label: "주소", key: "address" },
            { label: "부서", key: "department" },
            { label: "구역", key: "district" },
            { label: "직분", key: "role" },
            { label: "세례", key: "baptism" },
            { label: "봉사", key: "ministry" },
            { label: "등록일", key: "registered_date" },
            { label: "이전교회", key: "previous_church" },
            { label: "학교", key: "school" },
            { label: "학위", key: "grade" },
            { label: "전공", key: "major" },
            { label: "졸업연도", key: "graduation_year" },
            { label: "가족태그", key: "family_tag" },
            { label: "가족역할", key: "family_role" },
            { label: "최근연락", key: "last_contact" },
            { label: "메모", key: "memo" },
          ].map((field) => (
            <div key={field.key} className="flex">
              <span className="w-24 shrink-0 text-gray-500">{field.label}</span>
              {editing ? (
                <input
                  value={form[field.key] || ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="flex-1 border border-gray-200 rounded px-2 py-0.5 text-sm"
                />
              ) : (
                <span className="text-navy-800">{(member as unknown as Record<string, string>)[field.key] || "-"}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Membership Progress */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold text-navy-700 mb-3">멤버십 진행 상황</h2>
        <div className="flex items-center gap-2 mb-3">
          {STAGES.map((stage, i) => (
            <div key={stage} className="flex-1">
              <div className={`h-2 rounded-full ${i <= currentStageIndex ? "bg-navy-600" : "bg-gray-200"}`} />
              <p className={`text-xs mt-1 text-center ${i <= currentStageIndex ? "text-navy-700 font-semibold" : "text-gray-400"}`}>
                {stage}
              </p>
              {STAGE_FIELDS[stage] && (member as unknown as Record<string, string>)[STAGE_FIELDS[stage]] && (
                <p className="text-xs text-center text-gray-400">
                  {(member as unknown as Record<string, string>)[STAGE_FIELDS[stage]]}
                </p>
              )}
            </div>
          ))}
        </div>
        {memberTraining.length > 0 && (
          <div className="mt-2 text-sm text-gray-600">
            <p className="font-medium mb-1">수료 과정:</p>
            {memberTraining.map((t) => (
              <span key={t.id} className="inline-block bg-navy-50 text-navy-600 px-2 py-0.5 rounded-full text-xs mr-2 mb-1">
                {t.course} ({t.completed_date})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Section 3: Family View */}
      {familyMembers.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-navy-700 mb-3">가족</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {familyMembers.map((fm) => (
              <Link
                key={fm.name}
                href={`/members/${encodeURIComponent(fm.name)}${demoSuffix}`}
                className="border border-gray-100 rounded-lg p-3 hover:bg-navy-50 transition-colors"
              >
                <p className="font-medium text-navy-700">{fm.name}</p>
                <p className="text-xs text-gray-500">{fm.family_role} · {fm.department}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Visitation History */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="font-semibold text-navy-700 mb-3">심방 기록</h2>
        {memberVisitations.length === 0 ? (
          <p className="text-sm text-gray-400">심방 기록이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {memberVisitations.map((v) => (
              <div key={v.id} className="border-l-2 border-navy-200 pl-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-navy-700">{v.date}</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{v.visitation_type}</span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{v.summary}</p>
                {v.prayer_requests && <p className="text-xs text-gray-500 mt-1">기도제목: {v.prayer_requests}</p>}
                {v.follow_up && (
                  <p className="text-xs text-gray-500 mt-1">
                    후속: {v.follow_up} {v.follow_up_date && `(${v.follow_up_date})`}
                    {v.follow_up_done === "완료" && <span className="text-green-600 ml-1">완료</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5: Training */}
      {memberTraining.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-navy-700 mb-3">양육과정 이력</h2>
          <div className="space-y-2">
            {memberTraining.map((t) => (
              <div key={t.id} className="flex justify-between text-sm">
                <span className="text-navy-700">{t.course}</span>
                <span className="text-gray-500">{t.completed_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 6: Ministry */}
      {memberMinistry.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-navy-700 mb-3">봉사 기록</h2>
          <div className="space-y-2">
            {memberMinistry.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="font-medium text-navy-700">{m.department_ministry}</span>
                <span className="text-gray-500 ml-2">{m.role_in_team} · {m.period}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 7: Sacraments */}
      {memberSacraments.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-navy-700 mb-3">세례/임직 이력</h2>
          <div className="space-y-2">
            {memberSacraments.map((s) => (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="text-navy-700">{s.type} — {s.detail}</span>
                <span className="text-gray-500">{s.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemberDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>}>
      <MemberDetailContent />
    </Suspense>
  );
}
