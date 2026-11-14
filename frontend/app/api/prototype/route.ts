import { NextResponse } from "next/server";

// Keep the Python service private to the server. The browser only talks to this route.
export async function GET() {
  const baseUrl = process.env.PYTHON_SERVICE_URL;
  if (!baseUrl) {
    return NextResponse.json({
      source: "prototype",
      message: "Using built-in sample content.",
      dashboard: {},
    });
  }

  try {
    const apiKey = process.env.PYTHON_SERVICE_API_KEY;
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/dashboard`, {
      cache: "no-store",
      headers: apiKey ? { "X-API-Key": apiKey } : undefined,
    });
    if (!response.ok)
      throw new Error(`Python service returned ${response.status}`);
    return NextResponse.json({
      source: "service",
      dashboard: await response.json(),
    });
  } catch (error) {
    console.error("Tyyni service request failed:", error);
    return NextResponse.json(
      {
        source: "prototype",
        message: "The service is unavailable; showing sample content.",
      },
      { status: 200 },
    );
  }
}
