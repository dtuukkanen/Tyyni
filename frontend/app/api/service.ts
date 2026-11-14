// Shared setup for server routes that proxy the Python service. The browser
// never sees PYTHON_SERVICE_URL or the API key; it only talks to these routes.

export type ServiceConfig = {
  base: string;
  headers: Record<string, string>;
};

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

/** The given user, or the first user the service knows about. */
export async function resolveUser(
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
  const users = (await listRes.json()) as {
    id: string;
    display_name?: string;
  }[];
  return users.length > 0 ? users[0] : null;
}
