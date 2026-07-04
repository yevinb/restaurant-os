import { NextResponse } from "next/server";
import { ZodError } from "zod";
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
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.issues[0]?.message ?? "Invalid request" },
          { status: 400 }
        );
      }
      if (error instanceof Error && error.message === "Table not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error instanceof Error && error.message === "Customer not found") {
        return NextResponse.json({ error: error.message }, { status: 404 });
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
