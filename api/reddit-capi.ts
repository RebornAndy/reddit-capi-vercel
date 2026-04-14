export default async function handler(request: Request): Promise<Response> {
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
