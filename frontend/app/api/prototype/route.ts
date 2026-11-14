import { type NextRequest, NextResponse } from "next/server";
import {
  resolveUserId,
  SERVICE_TIMEOUT_MS,
  serviceConfig,
} from "@/app/lib/service";

// Forwards suggestion feedback to POST /users/{id}/suggestions/{sid}/feedback.
// The dashboard itself is read on the server by the page (app/lib/dashboard.ts).
export async function POST(request: NextRequest) {
  const service = serviceConfig(true);
  if (!service) {
    return NextResponse.json({ ok: true, source: "prototype" });
  }
  const { base, headers } = service;

  try {
    const body = (await request.json()) as {
      userId?: string;
      suggestionId?: number;
      done?: boolean;
      helped?: boolean | null;
    };

    if (!body.suggestionId || body.suggestionId < 0 || body.done == null) {
      return NextResponse.json({ ok: true, source: "prototype" });
    }

    const userId = await resolveUserId(
      body.userId ?? process.env.PYTHON_SERVICE_USER_ID,
    );
    if (!userId) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const feedbackRes = await fetch(
      `${base}/users/${encodeURIComponent(userId)}/suggestions/${body.suggestionId}/feedback`,
      {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(SERVICE_TIMEOUT_MS),
        body: JSON.stringify({
          done: body.done,
          helped: body.done ? (body.helped ?? null) : null,
        }),
      },
    );

    if (!feedbackRes.ok) {
      throw new Error(`Feedback returned ${feedbackRes.status}`);
    }

    return NextResponse.json({
      ok: true,
      source: "service",
      suggestion: await feedbackRes.json(),
    });
  } catch (error) {
    console.error("Tyyni suggestion feedback failed:", error);
    return NextResponse.json(
      { ok: false, source: "prototype" },
      { status: 200 },
    );
  }
}
