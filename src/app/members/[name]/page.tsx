"use client";

import { useAuthOrDemo, useFetch, useDemoData } from "@/lib/hooks";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { Member, Visitation, TrainingRecord, MinistryRoster, Sacrament, MEMBER_HEADERS, DEPARTMENT_DISTRICTS } from "@/types";
import { getDisplayName } from "@/lib/display-name";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import PhotoCropper from "@/components/PhotoCropper";

const STAGES = ["Visitor", "Member", "Fellow", "Leader"];
const STAGE_FIELDS: Record<string, string> = {
  Visitor: "",
  Member: "welcome_table",
  Fellow: "fellow_table",
  Leader: "gospel_into_leadership",
};

const ACTIVITY_BADGE: Record<string, string> = {
  "심방": "bg-blue-100 text-blue-700",
  "교육": "bg-green-100 text-green-700",
  "봉사": "bg-orange-100 text-orange-700",
  "세례·임직": "bg-purple-100 text-purple-700",
  "행사": "bg-yellow-100 text-yellow-700",
};

interface TimelineItem {
  date: string;
  type: string;
  title: string;
  detail: string;
  sub?: string;
}

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

  const { data: members, refetch: refetchMembers } = useFetch<Member[]>("/api/members", DEMO_MEMBERS);
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

  // Baptism date from sacraments
  const baptismDate = useMemo(() => {
    const rec = memberSacraments.find((s) =>
      s.type === "세례" || s.type === "유아세례" || s.type === "입교"
    );
    return rec?.date || "";
  }, [memberSacraments]);

  // Unified timeline
  const [timelineFilter, setTimelineFilter] = useState("전체");
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];
    memberVisitations.forEach((v) => items.push({
      date: v.date, type: "심방", title: v.visitation_type, detail: v.summary,
      sub: v.prayer_requests ? `기도제목: ${v.prayer_requests}` : undefined,
    }));
    memberTraining.forEach((t) => items.push({
      date: t.completed_date, type: "교육", title: t.course, detail: t.notes,
    }));
    memberMinistry.forEach((m) => items.push({
      date: m.start_date, type: "봉사", title: m.department_ministry,
      detail: `${m.role_in_team} · ${m.period}`,
    }));
    memberSacraments.forEach((s) => items.push({
      date: s.date, type: "세례·임직", title: s.type, detail: s.detail,
    }));
    return items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [memberVisitations, memberTraining, memberMinistry, memberSacraments]);

  const filteredTimeline = useMemo(() => {
    if (timelineFilter === "전체") return timeline;
    return timeline.filter((t) => t.type === timelineFilter);
  }, [timeline, timelineFilter]);

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
      const res = await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalName: name, ...form }),
      });
      if (!res.ok) throw new Error("Save failed");
      setEditing(false);
      await refetchMembers();
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // Photo upload with crop
  const [uploadedPhoto, setUploadedPhoto] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string>("");

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isDemo) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropDone = async (blob: Blob) => {
    setCropSrc("");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", new File([blob], `${name}.jpg`, { type: "image/jpeg" }));
    fd.append("member_name", name);
    try {
      const res = await fetch("/api/members/photo", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        setUploadedPhoto(data.url);
        setForm((f) => ({ ...f, photo_url: data.url }));
      } else {
        alert("업로드 실패: " + (data.error || "알 수 없는 오류"));
      }
    } catch {
      alert("업로드 실패: 네트워크 오류");
    } finally {
      setUploading(false);
    }
  };

  if (!member) {
    return <div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>;
  }

  const currentStageIndex = STAGES.indexOf(member.membership_stage);

  const infoFields = [
    { label: "상태", key: "status" },
    { label: "성별", key: "gender" },
    { label: "생년월일", key: "birthday" },
    { label: "생일(월일)", key: "birth_month_day" },
    { label: "연락처", key: "phone" },
    { label: "이메일", key: "email" },
    { label: "주소", key: "address" },
    { label: "부서", key: "department" },
    { label: "구역", key: "district" },
    { label: "직분", key: "role" },
    { label: "세례", key: "baptism", suffix: baptismDate ? ` (${baptismDate})` : "" },
    { label: "봉사", key: "ministry" },
    { label: "소그룹", key: "group_name" },
    { label: "소그룹역할", key: "group_role" },
    { label: "등록일", key: "registered_date" },
    { label: "이전교회", key: "previous_church" },
    { label: "학교", key: "school" },
    { label: "학위", key: "grade" },
    { label: "전공", key: "major" },
    { label: "직장", key: "company" },
    { label: "졸업연도", key: "graduation_year" },
    { label: "가족태그", key: "family_tag" },
    { label: "가족역할", key: "family_role" },
    { label: "최근연락", key: "last_contact" },
    { label: "메모", key: "memo" },
  ];

  return (
    <>
    {cropSrc && (
      <PhotoCropper
        imageSrc={cropSrc}
        onCropDone={handleCropDone}
        onCancel={() => setCropSrc("")}
      />
    )}
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header with avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar name={member.name} photoUrl={uploadedPhoto || member.photo_url} size="lg" />
          {uploading && (
            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">...</span>
            </div>
          )}
          {editing && !uploading && (
            <label className="absolute bottom-0 right-0 bg-navy-800 text-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer text-xs hover:bg-navy-700">
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              +
            </label>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-navy-800">{members ? getDisplayName(member, members) : member.name}</h1>
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
          {infoFields.map((field) => {
            const isGroupNameDropdown = editing && field.key === "group_name";
            const isDistrictDropdown = editing && field.key === "district" && form.department && DEPARTMENT_DISTRICTS[form.department]?.length > 0;
            return (
            <div key={field.key} className="flex">
              <span className="w-24 shrink-0 text-gray-500">{field.label}</span>
              {editing ? (
                isGroupNameDropdown ? (
                  <select
                    value={form[field.key] || ""}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="flex-1 border border-gray-200 rounded px-2 py-0.5 text-sm"
                  >
                    <option value="">미배정</option>
                    {["1구역", "2구역", "3구역", "4구역", "5구역", "6구역", "7구역", "8구역", "9구역", "10구역", "11구역", "12구역", "13구역"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    <option disabled>──────</option>
                    {["영아부", "유아부", "유초등부", "중고등부"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                ) : isDistrictDropdown ? (
                  <select
                    value={form[field.key] || ""}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    className="flex-1 border border-gray-200 rounded px-2 py-0.5 text-sm"
                  >
                    <option value="">미배정</option>
                    {DEPARTMENT_DISTRICTS[form.department].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                ) : (
                <input
                  value={form[field.key] || ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="flex-1 border border-gray-200 rounded px-2 py-0.5 text-sm"
                />
                )
              ) : (
                <span className="text-navy-800">
                  {(member as unknown as Record<string, string>)[field.key] || "-"}
                  {"suffix" in field && field.suffix ? field.suffix : ""}
                </span>
              )}
            </div>
            );
          })}
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
                className="border border-gray-100 rounded-lg p-3 hover:bg-navy-50 transition-colors flex items-center gap-2"
              >
                <Avatar name={fm.name} photoUrl={fm.photo_url} size="sm" />
                <div>
                  <p className="font-medium text-navy-700 text-sm">{members ? getDisplayName(fm, members) : fm.name}</p>
                  <p className="text-xs text-gray-500">{fm.family_role} · {fm.department}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Unified Activity Timeline */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-navy-700">활동 기록</h2>
          <Link href={`/activities/new${demoSuffix}`} className="text-xs text-navy-500 hover:underline">+ 새 기록</Link>
        </div>
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1 mb-3">
          {["전체", "심방", "봉사", "교육", "세례·임직", "행사"].map((tab) => (
            <button
              key={tab}
              onClick={() => setTimelineFilter(tab)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                timelineFilter === tab ? "bg-navy-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {filteredTimeline.length === 0 ? (
          <p className="text-sm text-gray-400">활동 기록이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {filteredTimeline.map((item, i) => (
              <div key={i} className="border-l-2 border-navy-200 pl-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-navy-700">{item.date}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTIVITY_BADGE[item.type] || "bg-gray-100 text-gray-600"}`}>
                    {item.type}
                  </span>
                  <span className="text-gray-500">{item.title}</span>
                </div>
                {item.detail && <p className="text-sm text-gray-700 mt-1">{item.detail}</p>}
                {item.sub && <p className="text-xs text-gray-500 mt-1">{item.sub}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

export default function MemberDetailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>}>
      <MemberDetailContent />
    </Suspense>
  );
}
