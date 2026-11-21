import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database/mongodb";
import { TrackingLink, type TrackingLinkDoc } from "@/models/TrackingLink";
import { consentSchema } from "@/lib/security/validation";
import { clientIp } from "@/lib/security/rateLimit";
import { writeAudit } from "@/models/AuditLog";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIC. The recipient explicitly grants consent to share location.
 * This is recorded with a timestamp, user agent and IP for the consent trail.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await connectToDatabase();
  const link = (await TrackingLink.findOne({ token })) as TrackingLinkDoc | null;
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (link.disabled) {
    return NextResponse.json({ error: "Link disabled" }, { status: 410 });
  }
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    link.sessionStatus = "expired";
    await link.save();
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  const ip = clientIp(req.headers);
  const ua = req.headers.get("user-agent") ?? null;

  link.consentStatus = "granted";
  link.consentAt = new Date();
  link.shareMode = parsed.data.shareMode;
  link.sessionStatus = "consented";
  link.consentLog.push({ action: "granted", at: new Date(), userAgent: ua, ip });
  await link.save();

  await writeAudit({
    action: "track.consent.granted",
    target: token,
    ip,
    meta: { shareMode: parsed.data.shareMode },
  });

  return NextResponse.json({ ok: true, consentStatus: "granted" });
}
