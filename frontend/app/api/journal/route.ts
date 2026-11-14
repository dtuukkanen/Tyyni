import { type NextRequest, NextResponse } from "next/server";
import { resolveUser, serviceConfig } from "../service";

// The backend accepts entries up to this many characters.
const MAX_LENGTH = 5000;

// Forwards one journal entry to POST /users/{user_id}/journal.
export async function POST(request: NextRequest) {
  let body: { text?: unknown; userId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const service = serviceConfig(true);
  if (!service) {
    return NextResponse.json({ ok: true, source: "prototype" });
  }

  try {
    const userId =
      typeof body.userId === "string"
        ? body.userId
        : process.env.PYTHON_SERVICE_USER_ID;
    const user = await resolveUser(service.base, service.headers, userId);
    if (!user) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const res = await fetch(`${service.base}/users/${user.id}/journal`, {
      method: "POST",
      headers: service.headers,
      body: JSON.stringify({ text: text.slice(0, MAX_LENGTH) }),
    });
    if (!res.ok) {
      throw new Error(`Journal returned ${res.status}`);
    }

    return NextResponse.json({ ok: true, source: "service" });
  } catch (error) {
    console.error("Tyyni journal save failed:", error);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
