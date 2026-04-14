export async function GET(request: Request) {
  const url = new URL(request.url);
  const debug = url.searchParams.get("debug");

  if (debug === "1") {
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
              "Content-Type": "application/json"
            }
          }
        );
      }

      const redditPayload = {
        data: {
          events: [
            {
              event_at: Date.now(),
              action_source: "website",
              type: {
                tracking_type: "Purchase"
              },
              metadata: {
                item_count: 1,
                currency: "USD",
                value: 1,
                conversion_id: "debug-" + Date.now()
              },
              test_id: testId || undefined
            }
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

      return new Response(
        JSON.stringify(
          {
            ok: redditResponse.ok,
            status: redditResponse.status,
            endpoint,
            sent: redditPayload,
            redditResponseText
          },
          null,
          2
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify(
          {
            ok: false,
            error: error?.message || "Unknown error"
          },
          null,
          2
        ),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
  }

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

function getIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return undefined;
  return forwarded.split(",")[0]?.trim();
}

function mapTrackingType(eventName?: string): string {
  switch ((eventName || "").toLowerCase()) {
    case "purchase":
      return "Purchase";
    case "addtocart":
      return "AddToCart";
    case "pagevisit":
      return "PageVisit";
    case "viewcontent":
      return "ViewContent";
    default:
      return "Purchase";
  }
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
              tracking_type: mapTrackingType(body.eventName)
            },
            user: cleanObject({
              ip_address: ipAddress,
              user_agent: userAgent
            }),
            metadata: cleanObject({
              item_count: body.itemCount != null ? Number(body.itemCount) : 1,
              currency: body.currency || "USD",
              value: body.value != null ? Number(body.value) : 1,
              conversion_id: body.conversionId
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

    return new Response(
      JSON.stringify(
        {
          ok: redditResponse.ok,
          status: redditResponse.status,
          sent: redditPayload,
          redditResponseText
        },
        null,
        2
      ),
      {
        status: redditResponse.ok ? 200 : 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify(
        {
          ok: false,
          error: error?.message || "Unknown error"
        },
        null,
        2
      ),
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
