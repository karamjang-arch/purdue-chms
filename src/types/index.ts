export interface Member {
  name: string;
  name_en: string;
  status: string;
  membership_stage: string;
  member_class: string;
  gender: string;
  birthday: string;
  phone: string;
  email: string;
  address: string;
  department: string;
  district: string;
  role: string;
  baptism: string;
  ministry: string;
  registered_date: string;
  previous_church: string;
  school: string;
  grade: string;
  major: string;
  graduation_year: string;
  family_tag: string;
  family_role: string;
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
}

export const MEMBER_HEADERS = [
  "name", "name_en", "status", "membership_stage", "member_class", "gender",
  "birthday", "phone", "email", "address", "department", "district", "role",
  "baptism", "ministry", "registered_date", "previous_church", "school",
  "grade", "major", "graduation_year", "family_tag", "family_role",
  "last_contact", "memo", "welcome_table", "gospel_start", "fellow_table",
  "gospel_into_leadership", "photo_url", "created_at"
] as const;

export const VISITATION_HEADERS = [
  "id", "date", "member_name", "pastor", "visitation_type", "location",
  "summary", "prayer_requests", "follow_up", "follow_up_date",
  "follow_up_done", "recorded_by", "created_at"
] as const;

export const DEPARTMENT_DISTRICTS: Record<string, string[]> = {
  "장년부": ["1구역", "2구역", "3구역", "4구역", "5구역", "6구역", "7구역", "8구역", "9구역", "10구역", "11구역", "12구역", "13구역"],
  "청년부": ["작은불꽃", "실로암", "코너스톤"],
  "주일학교": ["영아부", "유아부", "유초등부", "중고등부"],
  "알럼나이": [],
};

export const VISITATION_TYPES = [
  "정기심방", "위기심방", "새가족", "경조사", "진로상담", "병원심방", "기타"
];
