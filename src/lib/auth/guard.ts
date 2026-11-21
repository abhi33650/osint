import { NextResponse } from "next/server";
import { getSessionPayload } from "./session";
import type { JwtPayload } from "./jwt";

export class AuthError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/**
 * Require an authenticated admin for an API route.
 * Usage:
 *   const auth = await requireAdmin();
 *   if (auth instanceof NextResponse) return auth; // 401/403
 *   // ...use auth.sub
 */
export async function requireAdmin(): Promise<JwtPayload | NextResponse> {
  const payload = await getSessionPayload();
  if (!payload) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (payload.role !== "admin") {
    return NextResponse.json(
      { error: "Admin role required" },
      { status: 403 }
    );
  }
  return payload;
}
