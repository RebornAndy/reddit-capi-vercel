export function GET() {
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

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function cleanObject<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ) as T;
}

function normalizeEmail(email?: string | null): string | undefined {
  if (!email) return undefined;
  return email.trim().toLowerCase();
}

function normalizePhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/[^\d+]/g, "");
}

function normalizeExternalId(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.trim();
}

function getIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return undefined;
  return forwarded.split(",")[0]?.trim();
}

export async function POST(request: Request) {
  try {
    const endpoint = process.env.REDDIT_CONVERSIONS_ENDPOINT;
    const accessToken = process.env.REDDIT_CONVERSION_ACCESS_TOKEN;
    const testId = process.env.REDDIT_TEST_ID;

    if (!endpoint || !accessToken) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing REDDIT_CONVERSIONS_ENDPOINT or REDDIT_CONVERSION_ACCESS_TOKEN"
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    const body = await request.json();

    const ipAddress = getIp(request);
    const userAgent = request.headers.get("user-agent") || undefined;

    const eventAt = body.timestamp
      ? new Date(body.timestamp).getTime()
      : Date.now();

    const redditPayload = {
      data: {
        events: [
          cleanObject({
            event_at: eventAt,
            action_source: "website",
            type: {
              tracking_type: body.eventName || "Purchase"
            },
            user: cleanObject({
              ip_address: ipAddress,
              user_agent: userAgent,
              email: normalizeEmail(body.email),
              phone_number: normalizePhone(body.phone),
              external_id: normalizeExternalId(body.clientId)
            }),
            metadata: cleanObject({
              item_count: body.itemCount != null ? Number(body.itemCount) : undefined,
              currency: body.currency,
              value: body.value != null ? Number(body.value) : undefined,
              conversion_id: body.conversionId,
              products: Array.isArray(body.products)
                ? body.products.map((p: any) =>
                    cleanObject({
                      id: p.id,
                      name: p.name,
                      category: p.category
                    })
                  )
                : undefined
            }),
            test_id: testId || undefined
          })
        ]
      }
    };

    const redditResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(redditPayload)
    });

    const redditResponseText = await redditResponse.text();

    console.log("reddit endpoint:", endpoint);
    console.log("reddit payload:", JSON.stringify(redditPayload));
    console.log("reddit status:", redditResponse.status);
    console.log("reddit response text:", redditResponseText);

    return new Response(
      JSON.stringify({
        ok: redditResponse.ok,
        status: redditResponse.status,
        sent: redditPayload,
        redditResponseText
      }),
      {
        status: redditResponse.ok ? 200 : 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error: any) {
    console.error("server catch error:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message || "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
