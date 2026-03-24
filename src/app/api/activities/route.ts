import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  readSheet, appendRow, updateCell, rowsToObjects, indexToColumnLetter,
} from "@/lib/sheets";
import {
  VISITATION_HEADERS, MEMBER_HEADERS,
  Visitation, MinistryRoster, TrainingRecord, Sacrament, ChurchEvent,
} from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.role === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Read all activity sheets and merge into timeline
    const [vRows, tRows, mRows, sRows, eRows] = await Promise.all([
      readSheet(session.accessToken, "visitations"),
      readSheet(session.accessToken, "training_records"),
      readSheet(session.accessToken, "ministry_roster"),
      readSheet(session.accessToken, "sacraments"),
      readSheet(session.accessToken, "events"),
    ]);

    const visitations = rowsToObjects<Visitation>(vRows);
    const training = rowsToObjects<TrainingRecord>(tRows);
    const ministry = rowsToObjects<MinistryRoster>(mRows);
    const sacraments = rowsToObjects<Sacrament>(sRows);
    const events = rowsToObjects<ChurchEvent>(eRows);

    // Normalize into unified timeline items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const timeline: any[] = [];

    visitations.forEach((v) => timeline.push({
      ...v, activity_type: "심방", date: v.date,
      title: v.visitation_type, detail: v.summary,
    }));
    training.forEach((t) => timeline.push({
      ...t, activity_type: "교육", date: t.completed_date,
      title: t.course, detail: t.notes, member_name: t.member_name,
    }));
    ministry.forEach((m) => timeline.push({
      ...m, activity_type: "봉사", date: m.start_date,
      title: m.department_ministry, detail: `${m.role_in_team} · ${m.period}`,
      member_name: m.member_name,
    }));
    sacraments.forEach((s) => timeline.push({
      ...s, activity_type: "세례·임직", date: s.date,
      title: s.type, detail: s.detail, member_name: s.member_name,
    }));
    events.forEach((e) => timeline.push({
      ...e, activity_type: "행사", date: e.date,
      title: e.event_name, detail: e.notes, member_name: "",
    }));

    timeline.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    return NextResponse.json(timeline);
  } catch (error) {
    console.error("Failed to read activities:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const today = new Date().toISOString().split("T")[0];
    const activityType = body.activity_type;
    const memberNames: string[] = Array.isArray(body.member_names)
      ? body.member_names
      : [body.member_name];
    const recordedBy = session.userName || session.user?.name || "";

    if (activityType === "심방") {
      for (const memberName of memberNames) {
        const rows = await readSheet(session.accessToken, "visitations");
        const nextId = `V${String(rows.length).padStart(3, "0")}`;
        const vis: Record<string, string> = {
          id: nextId,
          date: body.date_start || today,
          member_name: memberName,
          pastor: body.pastor || "",
          visitation_type: body.visitation_type || "",
          location: body.location || "",
          summary: body.summary || "",
          prayer_requests: body.prayer_requests || "",
          follow_up: body.follow_up || "",
          follow_up_date: body.follow_up_date || "",
          follow_up_done: "",
          recorded_by: recordedBy,
          created_at: today,
        };
        const values = VISITATION_HEADERS.map((h) => vis[h] || "");
        await appendRow(session.accessToken, "visitations", values);
        await updateLastContact(session.accessToken, memberName, body.date_start || today);
      }
    } else if (activityType === "봉사") {
      for (const memberName of memberNames) {
        const rows = await readSheet(session.accessToken, "ministry_roster");
        const nextId = `M${String(rows.length).padStart(3, "0")}`;
        const vals = [
          nextId, body.department_ministry || "", body.team || "",
          body.date_start && body.date_end ? `${body.date_start}~${body.date_end}` : "",
          memberName, body.role_in_team || "",
          body.date_start || today, body.date_end || "", body.summary || "",
        ];
        await appendRow(session.accessToken, "ministry_roster", vals);
      }
    } else if (activityType === "교육") {
      for (const memberName of memberNames) {
        const rows = await readSheet(session.accessToken, "training_records");
        const nextId = `T${String(rows.length).padStart(3, "0")}`;
        const vals = [
          nextId, memberName, body.course || "",
          body.date_start || today, body.summary || "", today,
        ];
        await appendRow(session.accessToken, "training_records", vals);

        // Auto-update members membership columns based on course
        const courseMap: Record<string, string> = {
          "웰컴테이블": "welcome_table",
          "가스펠스타트": "gospel_start",
          "펠로우테이블": "fellow_table",
          "GIL": "gospel_into_leadership",
        };
        const memberField = courseMap[body.course];
        if (memberField) {
          const memberRows = await readSheet(session.accessToken, "members");
          const idx = memberRows.findIndex((r, i) => i > 0 && r[0] === memberName);
          if (idx !== -1) {
            const colIdx = (MEMBER_HEADERS as readonly string[]).indexOf(memberField);
            if (colIdx !== -1) {
              const colLetter = indexToColumnLetter(colIdx);
              await updateCell(
                session.accessToken, "members",
                `${colLetter}${idx + 1}`, body.date_start || today
              );
            }
          }
        }
      }
    } else if (activityType === "세례·임직") {
      for (const memberName of memberNames) {
        const rows = await readSheet(session.accessToken, "sacraments");
        const nextId = `S${String(rows.length).padStart(3, "0")}`;
        const vals = [
          nextId, body.date_start || today, memberName,
          body.sacrament_type || "", body.summary || "", body.detail || "", today,
        ];
        await appendRow(session.accessToken, "sacraments", vals);

        // Auto-update baptism/role in members
        if (["세례", "유아세례", "입교"].includes(body.sacrament_type)) {
          const memberRows = await readSheet(session.accessToken, "members");
          const idx = memberRows.findIndex((r, i) => i > 0 && r[0] === memberName);
          if (idx !== -1) {
            const baptismCol = indexToColumnLetter(MEMBER_HEADERS.indexOf("baptism"));
            await updateCell(session.accessToken, "members", `${baptismCol}${idx + 1}`, body.sacrament_type);
            const gsCol = indexToColumnLetter(MEMBER_HEADERS.indexOf("gospel_start"));
            await updateCell(session.accessToken, "members", `${gsCol}${idx + 1}`, "exempt");
          }
        }
      }
    } else if (activityType === "행사") {
      const rows = await readSheet(session.accessToken, "events");
      const nextId = `E${String(rows.length).padStart(3, "0")}`;
      const vals = [
        nextId, body.date_start || today, body.summary || "",
        String(memberNames.length), body.detail || "",
      ];
      await appendRow(session.accessToken, "events", vals);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to add activity:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

async function updateLastContact(accessToken: string, memberName: string, date: string) {
  const memberRows = await readSheet(accessToken, "members");
  const idx = memberRows.findIndex((r, i) => i > 0 && r[0] === memberName);
  if (idx !== -1) {
    const colLetter = indexToColumnLetter(MEMBER_HEADERS.indexOf("last_contact"));
    await updateCell(accessToken, "members", `${colLetter}${idx + 1}`, date);
  }
}
