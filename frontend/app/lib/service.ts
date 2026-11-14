// Shared setup for server code that talks to the Python service. The browser
// never sees PYTHON_SERVICE_URL or the API key.

import "server-only";

import { cacheLife } from "next/cache";

/**
 * How long a single service call may take. Pages stream in behind Suspense,
 * so a stuck service would otherwise keep the page waiting indefinitely; on
 * timeout the fetch throws and callers fall back to sample content.
 */
export const SERVICE_TIMEOUT_MS = 4000;

export type ServiceConfig = {
  base: string;
  headers: Record<string, string>;
};

export type ServiceUser = { id: string; display_name?: string };

/** The service's base URL and auth headers, or null when not configured. */
export function serviceConfig(json = false): ServiceConfig | null {
  const baseUrl = process.env.PYTHON_SERVICE_URL;
  if (!baseUrl) return null;
  const apiKey = process.env.PYTHON_SERVICE_API_KEY;
  return {
    base: baseUrl.replace(/\/$/, ""),
    headers: {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
  };
}

// User lookups are cached for a short time: profiles and the user list
// rarely change, and without the cache every page load would fetch the whole
// user list just to pick the first one. The `minutes` profile serves a stale
// value for at most a minute after a change (e.g. a demo database reset).
// Failures throw, so they are never cached.

async function fetchDefaultUser(): Promise<ServiceUser> {
  "use cache";
  cacheLife("minutes");
  const service = serviceConfig();
  if (!service) throw new Error("Python service is not configured");
  const res = await fetch(`${service.base}/users`, {
    headers: service.headers,
    signal: AbortSignal.timeout(SERVICE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Users returned ${res.status}`);
  const users = (await res.json()) as ServiceUser[];
  if (users.length === 0) throw new Error("The service has no users");
  return users[0];
}

async function fetchUser(id: string): Promise<ServiceUser> {
  "use cache";
  cacheLife("minutes");
  const service = serviceConfig();
  if (!service) throw new Error("Python service is not configured");
  const res = await fetch(`${service.base}/users/${encodeURIComponent(id)}`, {
    headers: service.headers,
    signal: AbortSignal.timeout(SERVICE_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`User returned ${res.status}`);
  return (await res.json()) as ServiceUser;
}

/**
 * The given user with their profile, or the first user the service knows
 * about. Null when there is no user to fall back to.
 */
export async function resolveUser(
  explicitUserId?: string | null,
): Promise<ServiceUser | null> {
  if (explicitUserId) {
    return fetchUser(explicitUserId).catch(() => ({ id: explicitUserId }));
  }
  return fetchDefaultUser().catch(() => null);
}

/**
 * Just the user id, for writes: an explicit id is used as is (the service
 * answers 404 for unknown users), so no lookup is needed.
 */
export async function resolveUserId(
  explicitUserId?: string | null,
): Promise<string | null> {
  if (explicitUserId) return explicitUserId;
  const user = await fetchDefaultUser().catch(() => null);
  return user?.id ?? null;
}
