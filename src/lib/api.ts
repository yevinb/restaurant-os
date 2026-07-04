import { NextResponse } from "next/server";
import { TenantError, getSessionContext } from "@/lib/tenant";

type Handler = (
  req: Request,
  ctx: Awaited<ReturnType<typeof getSessionContext>>
) => Promise<NextResponse>;

export function withTenant(handler: Handler) {
  return async (req: Request) => {
    try {
      const context = await getSessionContext();
      return await handler(req, context);
    } catch (error) {
      if (error instanceof TenantError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        );
      }
      console.error("API error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
