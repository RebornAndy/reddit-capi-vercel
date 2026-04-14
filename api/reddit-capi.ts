export function GET(request: Request) {
  return new Response(
    JSON.stringify({
      ok: true,
      message: "reddit capi route ready"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
