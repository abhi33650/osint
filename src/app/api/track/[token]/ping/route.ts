import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database/mongodb";
import { TrackingLink, type TrackingLinkDoc } from "@/models/TrackingLink";
import { LocationPing } from "@/models/LocationPing";
import { pingSchema } from "@/lib/security/validation";
import { rateLimit, clientIp } from "@/lib/security/rateLimit";

type Ctx = { params: Promise<{ token: string }> };

// Optional retention window for stored location data (days). 0 = keep.
const RETENTION_DAYS = Number(process.env.LOCATION_RETENTION_DAYS ?? "0");

/**
 * PUBLIC. Accepts a consented location update.
 *
 * Hard requirement: a ping is ONLY stored when the link's consentStatus is
 * "granted". Without prior explicit consent the update is rejected. This is the
 * server-side guarantee that no location is collected secretly.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;

  const ip = clientIp(req.headers);
  const rl = rateLimit(`ping:${token}:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = pingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const link = (await TrackingLink.findOne({ token })) as TrackingLinkDoc | null;
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Enforce consent + validity server-side.
  if (link.consentStatus !== "granted") {
    return NextResponse.json(
      { error: "Consent not granted" },
      { status: 403 }
    );
  }
  if (link.disabled) {
    return NextResponse.json({ error: "Link disabled" }, { status: 410 });
  }
  if (["stopped", "completed"].includes(link.sessionStatus as string)) {
    return NextResponse.json({ error: "Session ended" }, { status: 409 });
  }
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    link.sessionStatus = "expired";
    await link.save();
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  const now = new Date();
  const expireAt =
    RETENTION_DAYS > 0
      ? new Date(now.getTime() + RETENTION_DAYS * 86_400_000)
      : null;

  await LocationPing.create({
    link: link._id,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    accuracy: parsed.data.accuracy ?? null,
    source: parsed.data.source,
    recordedAt: now,
    expireAt,
  });

  link.pingCount = (link.pingCount ?? 0) + 1;
  link.lastPingAt = now;

  // One-time share completes after the first accepted update.
  if (link.shareMode === "one_time") {
    link.sessionStatus = "completed";
  } else {
    link.sessionStatus = "active";
  }
  await link.save();

  return NextResponse.json({
    ok: true,
    sessionStatus: link.sessionStatus,
    recordedAt: now.toISOString(),
  });
}
