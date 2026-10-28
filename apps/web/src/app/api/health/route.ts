/**
 * Lightweight liveness endpoint for Render health checks.
 * Keep this dependency-free so it stays fast even while the app is warming up.
 */
export async function GET(): Promise<Response> {
  return Response.json(
    {
      status: "ok",
      service: "rentvision-web",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
