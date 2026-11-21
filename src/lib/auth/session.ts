import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database/mongodb";
import { User, type UserDoc } from "@/models/User";
import { SESSION_COOKIE, signToken, verifyToken, type JwtPayload } from "./jwt";
import type { PublicUser } from "@/types";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role as PublicUser["role"],
  };
}

/** Attach the session cookie to a response after successful login. */
export function setSessionCookie(res: NextResponse, payload: JwtPayload): void {
  const token = signToken(payload);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}

/** Read the current session payload from the request cookies (no DB hit). */
export async function getSessionPayload(): Promise<JwtPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Load the full current user from the DB, or null if not authenticated. */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;
  await connectToDatabase();
  const user = await User.findById(payload.sub);
  if (!user) return null;
  return toPublicUser(user as UserDoc);
}
