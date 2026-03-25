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
        name: `chms_${memberName}_${Date.now()}.${file.name.split(".").pop()}`,
        mimeType: file.type,
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: "id,webContentLink",
    });

    const fileId = driveRes.data.id;
    if (!fileId) {
      return NextResponse.json({ error: "Drive upload failed — no file ID" }, { status: 500 });
    }

    // Make file publicly viewable
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });

    // Use direct content link that works reliably for images
    const photoUrl = `https://lh3.googleusercontent.com/d/${fileId}=w400`;

    // Update members sheet
    const memberRows = await readSheet(session.accessToken, "members");
    const idx = memberRows.findIndex((r, i) => i > 0 && r[0] === memberName);
    if (idx !== -1) {
      const colLetter = indexToColumnLetter(MEMBER_HEADERS.indexOf("photo_url"));
      await updateCell(session.accessToken, "members", `${colLetter}${idx + 1}`, photoUrl);
    }

    return NextResponse.json({ success: true, url: photoUrl });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Photo upload failed:", errMsg);
    return NextResponse.json({ error: `Upload failed: ${errMsg}` }, { status: 500 });
  }
}
