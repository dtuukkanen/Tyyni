import { type NextRequest, NextResponse } from "next/server";

function mapMoodScoreToId(score: number | null | undefined): string | undefined {
  if (score == null) return undefined;
  if (score <= 2) return "Tired";
  if (score < 3.4) return "Tender";
  if (score < 4.3) return "Steady";
  return "Light";
}

function formatUtcDayLabel(isoDay: string | undefined): string | undefined {
  if (!isoDay) return undefined;
  const parsed = new Date(`${isoDay}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

async function resolveUser(
  base: string,
  headers: HeadersInit | undefined,
  explicitUserId?: string | null,
): Promise<{ id: string; display_name?: string } | null> {
  if (explicitUserId) {
    const userRes = await fetch(`${base}/users/${explicitUserId}`, {
      cache: "no-store",
      headers,
    });
    if (userRes.ok) return userRes.json();
    return { id: explicitUserId };
  }

  const listRes = await fetch(`${base}/users`, { cache: "no-store", headers });
  if (!listRes.ok) return null;
  const users = (await listRes.json()) as { id: string; display_name?: string }[];
  return users.length > 0 ? users[0] : null;
}

// Keep the Python service private to the server. The browser only talks to this route.
export async function GET(request: NextRequest) {
  const baseUrl = process.env.PYTHON_SERVICE_URL;
  if (!baseUrl) {
    return NextResponse.json({
      source: "prototype",
      message: "Using built-in sample content.",
      dashboard: {},
    });
  }

  const base = baseUrl.replace(/\/$/, "");
  const apiKey = process.env.PYTHON_SERVICE_API_KEY;
  const headers: HeadersInit | undefined = apiKey
    ? { "X-API-Key": apiKey }
    : undefined;

  try {
    const queryUserId =
      request.nextUrl.searchParams.get("userId") ??
      process.env.PYTHON_SERVICE_USER_ID;
    const user = await resolveUser(base, headers, queryUserId);

    if (user) {
      const todayRes = await fetch(`${base}/users/${user.id}/today`, {
        cache: "no-store",
        headers,
      });

      if (todayRes.ok) {
        const today = await todayRes.json();
        let suggestions = Array.isArray(today.suggestions)
          ? today.suggestions
          : [];

        // Refresh anomaly detection & generate today's behavioral suggestions if none stored yet
        if (suggestions.length === 0) {
          const suggestRes = await fetch(
            `${base}/users/${user.id}/suggestions`,
            {
              method: "POST",
              cache: "no-store",
              headers,
            },
          );
          if (suggestRes.ok) {
            suggestions = await suggestRes.json();
          }
        }

        return NextResponse.json({
          source: "service",
          dashboard: {
            userId: user.id,
            displayName: user.display_name,
            dateLabel: formatUtcDayLabel(today.day),
            mood: mapMoodScoreToId(today.metrics?.mood_avg),
            anomalies: Array.isArray(today.anomalies) ? today.anomalies : [],
            suggestions,
          },
        });
      }
    }

    // Fallback for custom /dashboard mock endpoints
    const legacyRes = await fetch(`${base}/dashboard`, {
      cache: "no-store",
      headers,
    });
    if (!legacyRes.ok) {
      throw new Error(`Python service returned ${legacyRes.status}`);
    }
    return NextResponse.json({
      source: "service",
      dashboard: await legacyRes.json(),
    });
  } catch (error) {
    console.error("Tyyni service request failed:", error);
    return NextResponse.json(
      {
        source: "prototype",
        message: "The service is unavailable; showing sample content.",
        dashboard: {},
      },
      { status: 200 },
    );
  }
}

export async function POST(request: NextRequest) {
  const baseUrl = process.env.PYTHON_SERVICE_URL;
  if (!baseUrl) {
    return NextResponse.json({ ok: true, source: "prototype" });
  }

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

    const base = baseUrl.replace(/\/$/, "");
    const apiKey = process.env.PYTHON_SERVICE_API_KEY;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    };

    const user = await resolveUser(
      base,
      headers,
      body.userId ?? process.env.PYTHON_SERVICE_USER_ID,
    );
    if (!user) {
      return NextResponse.json({ ok: false }, { status: 404 });
    }

    const feedbackRes = await fetch(
      `${base}/users/${user.id}/suggestions/${body.suggestionId}/feedback`,
      {
        method: "POST",
        headers,
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
    return NextResponse.json({ ok: false, source: "prototype" }, { status: 200 });
  }
}
