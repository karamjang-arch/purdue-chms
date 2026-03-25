import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: "v3", auth });

    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: twoWeeksLater.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 20,
    });

    const events = (res.data.items || [])
      .filter((e) => {
        const title = (e.summary || "").toLowerCase();
        const desc = (e.description || "").toLowerCase();
        return (
          title.includes("pastoral") ||
          title.includes("심방") ||
          title.includes("counseling") ||
          title.includes("invitation") ||
          desc.includes("pastoral") ||
          desc.includes("calendly")
        );
      })
      .map((e) => {
        // Parse invitee name from Calendly description
        const desc = e.description || "";
        let inviteeName = "";
        let inviteeEmail = "";

        // Calendly format: "Invitee: Name\nInvitee Email: email@..."
        const nameMatch = desc.match(/(?:Invitee|이름|Name)[:\s]*([^\n<]+)/i);
        if (nameMatch) inviteeName = nameMatch[1].trim();

        const emailMatch = desc.match(/(?:Invitee Email|이메일|Email)[:\s]*([^\n<\s]+)/i);
        if (emailMatch) inviteeEmail = emailMatch[1].trim();

        // If no parsed name, use event summary
        if (!inviteeName) {
          inviteeName = (e.summary || "")
            .replace(/pastoral\s*(invitation|counseling)?/i, "")
            .replace(/심방/g, "")
            .trim();
        }

        return {
          id: e.id,
          title: e.summary,
          start: e.start?.dateTime || e.start?.date || "",
          end: e.end?.dateTime || e.end?.date || "",
          inviteeName,
          inviteeEmail,
          description: desc.slice(0, 200),
        };
      });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Calendar API error:", error);
    // Return empty array instead of error — Calendar API might not be enabled yet
    return NextResponse.json([]);
  }
}
