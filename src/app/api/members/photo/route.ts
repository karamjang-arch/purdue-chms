import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readSheet, updateCell, indexToColumnLetter } from "@/lib/sheets";
import { MEMBER_HEADERS } from "@/types";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const memberName = formData.get("member_name") as string;

    if (!file || !memberName) {
      return NextResponse.json({ error: "Missing file or member_name" }, { status: 400 });
    }

    // Upload to Google Drive
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const drive = google.drive({ version: "v3", auth });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { Readable } = await import("stream");
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const driveRes = await drive.files.create({
      requestBody: {
        name: `${memberName}_${Date.now()}.${file.name.split(".").pop()}`,
        mimeType: file.type,
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: "id",
    });

    const fileId = driveRes.data.id;

    // Make file publicly viewable
    await drive.permissions.create({
      fileId: fileId!,
      requestBody: { role: "reader", type: "anyone" },
    });

    const photoUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;

    // Update members sheet
    const memberRows = await readSheet(session.accessToken, "members");
    const idx = memberRows.findIndex((r, i) => i > 0 && r[0] === memberName);
    if (idx !== -1) {
      const colLetter = indexToColumnLetter(MEMBER_HEADERS.indexOf("photo_url"));
      await updateCell(session.accessToken, "members", `${colLetter}${idx + 1}`, photoUrl);
    }

    return NextResponse.json({ success: true, url: photoUrl });
  } catch (error) {
    console.error("Photo upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
