import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readSheet, appendRow, deleteRow, rowsToObjects } from "@/lib/sheets";

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

export async function POST(
  req: NextRequest,
  { params }: { params: { tab: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedTabs = ["ministry_roster", "training_records", "sacraments", "events"];
  if (!allowedTabs.includes(params.tab)) {
    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { values } = body;
    if (!Array.isArray(values)) {
      return NextResponse.json({ error: "values array required" }, { status: 400 });
    }
    await appendRow(session.accessToken, params.tab, values);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to add to ${params.tab}:`, error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { tab: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedTabs = ["ministry_roster", "training_records", "sacraments", "events", "visitations"];
  if (!allowedTabs.includes(params.tab)) {
    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Find row by id (first column)
    const rows = await readSheet(session.accessToken, params.tab);
    const rowIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
    if (rowIndex === -1) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    await deleteRow(session.accessToken, params.tab, rowIndex + 1);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Failed to delete from ${params.tab}:`, error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
