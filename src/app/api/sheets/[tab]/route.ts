import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readSheet, rowsToObjects } from "@/lib/sheets";

export async function GET(
  _req: NextRequest,
  { params }: { params: { tab: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.role === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedTabs = [
    "training_records",
    "ministry_roster",
    "sacraments",
    "events",
  ];

  if (!allowedTabs.includes(params.tab)) {
    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  }

  try {
    const rows = await readSheet(session.accessToken, params.tab);
    const data = rowsToObjects(rows);
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Failed to read ${params.tab}:`, error);
    return NextResponse.json(
      { error: `Failed to read ${params.tab}` },
      { status: 500 }
    );
  }
}
