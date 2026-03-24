"use client";

import { useAuthOrDemo } from "@/lib/hooks";
import { DEPARTMENT_DISTRICTS } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

const INITIAL_FORM = {
  name: "", name_en: "", gender: "", birthday: "", phone: "", email: "",
  address: "", department: "", district: "", baptism: "", previous_church: "",
  school: "", grade: "", major: "", graduation_year: "",
  family_tag: "", family_role: "",
};

function NewMemberContent() {
  const { isAuthed, role, isDemo } = useAuthOrDemo();
  const router = useRouter();
  const demoSuffix = isDemo ? "?demo=true" : "";

  useEffect(() => {
    if (!isDemo && (!isAuthed || (role !== "admin" && role !== "newcomer_team"))) {
      router.push("/");
    }
  }, [isAuthed, role, isDemo, router]);

  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const districtOptions = form.department ? (DEPARTMENT_DISTRICTS[form.department] || []) : [];

  const handleChange = (key: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "department") next.district = "";
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { alert("이름을 입력해주세요."); return; }

    if (isDemo) {
      alert("데모 모드에서는 저장되지 않습니다.");
      router.push("/members" + demoSuffix);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      router.push("/members" + demoSuffix);
    } catch {
      alert("등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-navy-800 mb-6">새가족 등록</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="이름 *" value={form.name} onChange={(v) => handleChange("name", v)} />
          <Field label="영문 이름" value={form.name_en} onChange={(v) => handleChange("name_en", v)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
            <select value={form.gender} onChange={(e) => handleChange("gender", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">선택</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
          </div>
          <Field label="생년월일" value={form.birthday} onChange={(v) => handleChange("birthday", v)} type="date" />
          <Field label="연락처" value={form.phone} onChange={(v) => handleChange("phone", v)} type="tel" />
          <Field label="이메일" value={form.email} onChange={(v) => handleChange("email", v)} type="email" />
          <div className="sm:col-span-2">
            <Field label="주소" value={form.address} onChange={(v) => handleChange("address", v)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부서</label>
            <select value={form.department} onChange={(e) => handleChange("department", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">선택</option>
              {Object.keys(DEPARTMENT_DISTRICTS).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">구역</label>
            <select value={form.district} onChange={(e) => handleChange("district", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" disabled={!districtOptions.length}>
              <option value="">선택</option>
              {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">세례</label>
            <select value={form.baptism} onChange={(e) => handleChange("baptism", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">미세례</option>
              <option value="세례">세례</option>
              <option value="유아세례">유아세례</option>
              <option value="입교">입교</option>
            </select>
          </div>
          <Field label="이전 교회" value={form.previous_church} onChange={(v) => handleChange("previous_church", v)} />
          <Field label="학교" value={form.school} onChange={(v) => handleChange("school", v)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">학위</label>
            <select value={form.grade} onChange={(e) => handleChange("grade", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">선택</option>
              {["학부", "석사", "박사", "포닥", "교직원", "기타"].map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <Field label="전공" value={form.major} onChange={(v) => handleChange("major", v)} />
          <Field label="졸업연도" value={form.graduation_year} onChange={(v) => handleChange("graduation_year", v)} />
          <Field label="가족태그" value={form.family_tag} onChange={(v) => handleChange("family_tag", v)} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">가족역할</label>
            <select value={form.family_role} onChange={(e) => handleChange("family_role", e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">선택</option>
              {["본인", "남편", "아내", "자녀"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-navy-800 text-white py-3 rounded-lg font-medium hover:bg-navy-700 disabled:opacity-50"
          >
            {saving ? "등록 중..." : "등록"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 rounded-lg font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
      />
    </div>
  );
}

export default function NewMemberPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><p className="text-navy-400">로딩 중...</p></div>}>
      <NewMemberContent />
    </Suspense>
  );
}
