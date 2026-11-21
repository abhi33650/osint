import jwt from "jsonwebtoken";
import type { Role } from "@/types";
export { SESSION_COOKIE } from "./constants";

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: Role;
}

function secret(): string {
  if (!SECRET) {
    throw new Error("JWT_SECRET is not set. Add it to your .env file.");
  }
  return SECRET;
}

export function signToken(payload: JwtPayload): string {
  // @ts-expect-error - jsonwebtoken's expiresIn typing is overly strict for string values
  return jwt.sign(payload, secret(), { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, secret());
    if (typeof decoded === "string") return null;
    return decoded as JwtPayload;
  } catch {
    return null;
  }
}
