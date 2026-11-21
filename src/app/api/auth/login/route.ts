import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database/mongodb";
import { User, type UserDoc } from "@/models/User";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie, toPublicUser } from "@/lib/auth/session";
import { loginSchema } from "@/lib/security/validation";
import { rateLimit, clientIp } from "@/lib/security/rateLimit";
import { writeAudit } from "@/models/AuditLog";

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers);
  const rl = rateLimit(`login:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const user = (await User.findOne({
    email: parsed.data.email.toLowerCase(),
  })) as UserDoc | null;

  // Constant-ish response to avoid user enumeration.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    await writeAudit({
      action: "auth.login.failed",
      target: parsed.data.email,
      ip,
    });
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  user.lastLoginAt = new Date();
  await user.save();

  const res = NextResponse.json({ user: toPublicUser(user) });
  setSessionCookie(res, {
    sub: user._id.toString(),
    email: user.email,
    role: user.role as "admin" | "viewer",
  });
  await writeAudit({
    actor: user._id,
    action: "auth.login.success",
    target: user.email,
    ip,
  });
  return res;
}
