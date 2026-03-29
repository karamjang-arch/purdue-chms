export interface Member {
  name: string;
  name_en: string;
  status: string;
  membership_stage: string;
  member_class: string;
  gender: string;
  birthday: string;
  birth_month_day: string;
  phone: string;
  email: string;
  address: string;
  department: string;
  district: string;
  sub_district: string;
  role: string;
  baptism: string;
  ministry: string;
  registered_date: string;
  previous_church: string;
  school: string;
  grade: string;
  major: string;
  company: string;
  graduation_year: string;
  family_tag: string;
  family_role: string;
  group_name: string;
  group_role: string;
  last_contact: string;
  memo: string;
  welcome_table: string;
  gospel_start: string;
  fellow_table: string;
  gospel_into_leadership: string;
  photo_url: string;
  created_at: string;
}

export interface Visitation {
  id: string;
  date: string;
  member_name: string;
  pastor: string;
  visitation_type: string;
  location: string;
  summary: string;
  prayer_requests: string;
  follow_up: string;
  follow_up_date: string;
  follow_up_done: string;
  recorded_by: string;
  created_at: string;
}

export interface MinistryRoster {
  id: string;
  department_ministry: string;
  team: string;
  period: string;
  member_name: string;
  role_in_team: string;
  start_date: string;
  end_date: string;
  notes: string;
}

export interface Sacrament {
  id: string;
  date: string;
  member_name: string;
  type: string;
  detail: string;
  notes: string;
  created_at: string;
}

export interface TrainingRecord {
  id: string;
  member_name: string;
  course: string;
  completed_date: string;
  notes: string;
  created_at: string;
}

export interface ChurchEvent {
  id: string;
  date: string;
  event_name: string;
  attendance: string;
  notes: string;
}

export interface AppUser {
  email: string;
  name: string;
  role: string;
  group_type: string;
  group_name: string;
}

export type ActivityType = "심방" | "봉사" | "교육" | "세례·임직" | "행사" | "기타";

export const ACTIVITY_TYPES: ActivityType[] = [
  "심방", "봉사", "교육", "세례·임직", "행사", "기타"
];

export const MEMBER_HEADERS = [
  "name", "name_en", "status", "membership_stage", "member_class", "gender",
  "birthday", "birth_month_day", "phone", "email", "address",
  "department", "district", "sub_district", "role", "baptism", "ministry",
  "registered_date", "previous_church", "school", "grade", "major", "company",
  "graduation_year", "family_tag", "family_role", "group_name", "group_role",
  "last_contact", "memo", "welcome_table", "gospel_start", "fellow_table",
  "gospel_into_leadership", "photo_url", "created_at"
] as const;

export const VISITATION_HEADERS = [
  "id", "date", "member_name", "pastor", "visitation_type", "location",
  "summary", "prayer_requests", "follow_up", "follow_up_date",
  "follow_up_done", "recorded_by", "created_at"
] as const;

/** 부서 → 소속 (sub_district) 매핑 */
export const DEPT_SUB_DISTRICTS: Record<string, string[]> = {
  "장년부": ["1교구", "2교구", "3교구"],
  "청년부": ["작은불꽃", "실로암", "코너스톤"],
  "주일학교": ["영아부", "유아부", "유초등부", "중고등부"],
  "알럼나이": [],
};

/** 소속 → 소그룹 (group_name) 매핑 */
export const SUB_DISTRICT_GROUPS: Record<string, string[]> = {
  "1교구": ["1구역", "2구역", "3구역", "4구역"],
  "2교구": ["5구역", "6구역", "7구역", "8구역"],
  "3교구": ["9구역", "10구역", "11구역", "12구역", "13구역"],
  "작은불꽃": ["1조", "2조", "3조", "4조", "5조", "6조", "7조"],
  "실로암": ["장암미조", "최재익조", "김한진조", "최재인조"],
  "코너스톤": [],
  "영아부": [],
  "유아부": [],
  "유초등부": [],
  "중고등부": [],
};

/** (deprecated) 하위 호환용 */
export const DEPARTMENT_DISTRICTS: Record<string, string[]> = {
  "장년부": ["1교구", "2교구", "3교구"],
  "청년부": ["작은불꽃", "실로암", "코너스톤"],
  "주일학교": ["영아부", "유아부", "유초등부", "중고등부"],
  "알럼나이": [],
};

export const VISITATION_TYPES = [
  "정기심방", "위기심방", "새가족", "경조사", "진로상담", "병원심방", "기타"
];

export const TRAINING_COURSES = [
  "웰컴테이블", "가스펠스타트", "펠로우테이블", "GIL",
  "바이블아카데미", "퍼듀생애주기제자훈련", "제직세미나", "기타"
];

export const SACRAMENT_TYPES = [
  "세례", "유아세례", "입교", "장로임직", "집사임직", "권사임직", "기타"
];

export const MINISTRY_DEPARTMENTS = [
  "예배부", "교육부", "선교부", "교제부", "관리부",
  "찬양팀", "안내팀", "미디어팀", "주차팀", "식당팀",
  "작은불꽃", "실로암", "코너스톤",
  "영아부", "유아부", "유초등부", "중고등부", "기타"
];

export const DEPT_COLORS: Record<string, string> = {
  "장년부": "#93C5FD",
  "청년부": "#86EFAC",
  "주일학교": "#FDBA74",
  "알럼나이": "#C4B5FD",
};
