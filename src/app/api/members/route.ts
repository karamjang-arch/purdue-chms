import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readSheet, appendRow, updateRow, rowsToObjects } from "@/lib/sheets";
import { Member, MEMBER_HEADERS } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.role === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await readSheet(session.accessToken, "members");
    const members = rowsToObjects<Member>(rows);
    return NextResponse.json(members);
  } catch (error) {
    console.error("Failed to read members:", error);
    return NextResponse.json({ error: "Failed to read members" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.role !== "admin" && session.role !== "newcomer_team")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const today = new Date().toISOString().split("T")[0];

    const newMember: Record<string, string> = {
      ...body,
      status: "활동",
      membership_stage: "Member",
      member_class: "멤버가족",
      registered_date: today,
      created_at: today,
    };

    // Auto-set gospel_start for baptized members
    if (["세례", "유아세례", "입교"].includes(body.baptism)) {
      newMember.gospel_start = "exempt";
    }

    const values = MEMBER_HEADERS.map((h) => newMember[h] || "");
    await appendRow(session.accessToken, "members", values);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to add member:", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { originalName, ...updates } = body;

    const rows = await readSheet(session.accessToken, "members");
    const headers = rows[0];
    const rowIndex = rows.findIndex(
      (row, i) => i > 0 && row[0] === originalName
    );

    if (rowIndex === -1) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const currentRow = rows[rowIndex];
    const updatedRow = headers.map((h: string, i: number) =>
      updates[h] !== undefined ? updates[h] : currentRow[i] || ""
    );

    await updateRow(session.accessToken, "members", rowIndex + 1, updatedRow);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update member:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}
