// The Today dashboard, read on the server while the page renders, so the
// first HTML already holds the user's data instead of sample placeholders.

import "server-only";

import { connection } from "next/server";
import type { DashboardData } from "@/app/data/sanctuaryData";
import { resolveUser, SERVICE_TIMEOUT_MS, serviceConfig } from "./service";

export type DashboardResult = {
  source: "service" | "prototype";
  dashboard: DashboardData;
};

const SAMPLE: DashboardResult = { source: "prototype", dashboard: {} };

function mapMoodScoreToId(
  score: number | null | undefined,
): string | undefined {
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

/**
 * Today's dashboard for the given user (or PYTHON_SERVICE_USER_ID, or the
 * service's first user). Never throws: without a reachable service it
 * returns an empty dashboard and the app shows its sample content.
 */
export async function getDashboard(
  explicitUserId?: string | null,
): Promise<DashboardResult> {
  // Always per request, even when no service is configured at build time;
  // otherwise the sample content would be prerendered into static HTML.
  await connection();
  const service = serviceConfig();
  if (!service) return SAMPLE;
  const { base, headers } = service;

  try {
    const user = await resolveUser(
      explicitUserId ?? process.env.PYTHON_SERVICE_USER_ID,
    );

    // Started after the user lookup, which has its own timeout.
    const signal = AbortSignal.timeout(SERVICE_TIMEOUT_MS);

    if (user) {
      const userPath = `${base}/users/${encodeURIComponent(user.id)}`;
      // POST /suggestions is idempotent: it keeps the day's existing
      // suggestions, adds any for new anomalies and returns them all. Running
      // it alongside /today saves a sequential round trip.
      const [todayRes, suggestRes] = await Promise.all([
        fetch(`${userPath}/today`, { headers, signal }),
        fetch(`${userPath}/suggestions`, { method: "POST", headers, signal }),
      ]);

      if (todayRes.ok) {
        const today = await todayRes.json();
        const generated = suggestRes.ok ? await suggestRes.json() : null;
        const suggestions = Array.isArray(generated)
          ? generated
          : Array.isArray(today.suggestions)
            ? today.suggestions
            : [];

        return {
          source: "service",
          dashboard: {
            userId: user.id,
            displayName: user.display_name,
            dateLabel: formatUtcDayLabel(today.day),
            mood: mapMoodScoreToId(today.metrics?.mood_avg),
            anomalies: Array.isArray(today.anomalies) ? today.anomalies : [],
            suggestions,
          },
        };
      }
    }

    // Fallback for custom /dashboard mock endpoints
    const legacyRes = await fetch(`${base}/dashboard`, { headers, signal });
    if (!legacyRes.ok) {
      throw new Error(`Python service returned ${legacyRes.status}`);
    }
    return {
      source: "service",
      dashboard: (await legacyRes.json()) as DashboardData,
    };
  } catch (error) {
    console.error("Tyyni dashboard request failed:", error);
    return SAMPLE;
  }
}
