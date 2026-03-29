import { Member } from "@/types";

/**
 * Get display name for a single member given the full list.
 * - Unique name → name only
 * - Duplicate name → name(구분 정보)
 *   - 장년부: name(소그룹)  e.g. 김동윤(4구역)
 *   - 청년부: name(소속)    e.g. 박수진(작은불꽃)
 *   - 주일학교: name(소속 or 부서) e.g. 김동윤(중고등부)
 *   - 기타: name(부서)
 */
export function getDisplayName(member: Member, allMembers: Member[]): string {
  const dupes = allMembers.filter((m) => m.name === member.name);
  if (dupes.length <= 1) return member.name;

  // Pick the most specific distinguishing label
  const label =
    member.group_name ||
    member.sub_district ||
    member.department ||
    "";

  return label ? `${member.name}(${label})` : member.name;
}

/**
 * Resolve a display name (possibly with suffix) back to the raw member name.
 * e.g. "김동윤(4구역)" -> "김동윤"
 */
export function rawName(displayName: string): string {
  const idx = displayName.indexOf("(");
  return idx === -1 ? displayName : displayName.slice(0, idx);
}
