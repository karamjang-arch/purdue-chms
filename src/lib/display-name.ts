import { Member } from "@/types";

/**
 * Build a lookup map: name -> display name with disambiguation suffix.
 * - If a name appears only once, display as-is.
 * - If duplicated:
 *   - 장년부: name(district)  e.g. 김동윤(4구역)
 *   - 청년부: name(district)  e.g. 박수진(작은불꽃)
 *   - Others: name(department) e.g. 김동윤(중고등부)
 */
export function buildDisplayNameMap(members: Member[]): Record<string, string> {
  // Count occurrences of each name
  const nameCount: Record<string, number> = {};
  members.forEach((m) => {
    nameCount[m.name] = (nameCount[m.name] || 0) + 1;
  });

  const map: Record<string, string> = {};
  members.forEach((m) => {
    const key = memberKey(m);
    if (nameCount[m.name] > 1) {
      if (m.department === "장년부") {
        map[key] = `${m.name}(${m.district || m.department})`;
      } else if (m.department === "청년부") {
        map[key] = `${m.name}(${m.district || m.department})`;
      } else {
        map[key] = `${m.name}(${m.district || m.department})`;
      }
    } else {
      map[key] = m.name;
    }
  });

  return map;
}

/** Stable key for a member (name + email as fallback for uniqueness) */
export function memberKey(m: Member): string {
  return `${m.name}::${m.email || m.phone || m.department}`;
}

/** Get display name for a single member given the full list */
export function getDisplayName(member: Member, allMembers: Member[]): string {
  const dupes = allMembers.filter((m) => m.name === member.name);
  if (dupes.length <= 1) return member.name;

  if (member.department === "장년부") {
    return `${member.name}(${member.district || member.department})`;
  } else if (member.department === "청년부") {
    return `${member.name}(${member.district || member.department})`;
  } else {
    return `${member.name}(${member.district || member.department})`;
  }
}

/**
 * Resolve a display name (possibly with suffix) back to the raw member name.
 * e.g. "김동윤(4구역)" -> "김동윤"
 */
export function rawName(displayName: string): string {
  const idx = displayName.indexOf("(");
  return idx === -1 ? displayName : displayName.slice(0, idx);
}
