import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database/mongodb";
import { TrackingLink, type TrackingLinkDoc } from "@/models/TrackingLink";
import { clientIp } from "@/lib/security/rateLimit";
import { writeAudit } from "@/models/AuditLog";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIC. The recipient revokes consent / stops sharing at any time.
 * This immediately halts further collection for the session.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;

  await connectToDatabase();
  const link = (await TrackingLink.findOne({ token })) as TrackingLinkDoc | null;
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const ip = clientIp(req.headers);
  link.consentStatus = "revoked";
  link.sessionStatus = "stopped";
  link.consentLog.push({
    action: "revoked",
    at: new Date(),
    userAgent: req.headers.get("user-agent"),
    ip,
  });
  await link.save();

  await writeAudit({ action: "track.consent.revoked", target: token, ip });

  return NextResponse.json({ ok: true, sessionStatus: "stopped" });
}
