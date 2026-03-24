import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readSheet, appendRow, updateCell, rowsToObjects, indexToColumnLetter } from "@/lib/sheets";
import { Visitation, VISITATION_HEADERS, MEMBER_HEADERS } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.role === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await readSheet(session.accessToken, "visitations");
    const visitations = rowsToObjects<Visitation>(rows);
    return NextResponse.json(visitations);
  } catch (error) {
    console.error("Failed to read visitations:", error);
    return NextResponse.json({ error: "Failed to read visitations" }, { status: 500 });
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

    // Generate ID
    const rows = await readSheet(session.accessToken, "visitations");
    const nextId = `V${String(rows.length).padStart(3, "0")}`;

    const visitation: Record<string, string> = {
      id: nextId,
      ...body,
      recorded_by: session.userName || session.user?.name || "",
      created_at: today,
    };

    const values = VISITATION_HEADERS.map((h) => visitation[h] || "");
    await appendRow(session.accessToken, "visitations", values);

    // Update last_contact in members sheet
    const memberRows = await readSheet(session.accessToken, "members");
    const memberIndex = memberRows.findIndex(
      (row, i) => i > 0 && row[0] === body.member_name
    );
    if (memberIndex !== -1) {
      const colLetter = indexToColumnLetter(MEMBER_HEADERS.indexOf("last_contact"));
      await updateCell(
        session.accessToken,
        "members",
        `${colLetter}${memberIndex + 1}`,
        body.date || today
      );
    }

    return NextResponse.json({ success: true, id: nextId });
  } catch (error) {
    console.error("Failed to add visitation:", error);
    return NextResponse.json({ error: "Failed to add visitation" }, { status: 500 });
  }
}
