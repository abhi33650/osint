import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database/mongodb";
import { TrackingLink, type TrackingLinkDoc } from "@/models/TrackingLink";
import { LocationPing, type LocationPingDoc } from "@/models/LocationPing";
import { requireAdmin } from "@/lib/auth/guard";
import { createLinkSchema } from "@/lib/security/validation";
import { generateTrackingToken } from "@/lib/security/tokens";
import { serializeLink, applyExpiry } from "@/lib/serialize";
import { writeAudit } from "@/models/AuditLog";
import { clientIp } from "@/lib/security/rateLimit";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  await connectToDatabase();
  const links = (await TrackingLink.find()
    .sort({ createdAt: -1 })
    .limit(500)) as TrackingLinkDoc[];

  // Fetch latest ping per link in one aggregation (avoids N+1).
  const ids = links.map((l) => l._id);
  const latest = (await LocationPing.aggregate([
    { $match: { link: { $in: ids } } },
    { $sort: { recordedAt: -1 } },
    { $group: { _id: "$link", doc: { $first: "$$ROOT" } } },
  ])) as { _id: mongoose.Types.ObjectId; doc: LocationPingDoc }[];

  const latestByLink = new Map<string, LocationPingDoc>();
  for (const row of latest) latestByLink.set(row._id.toString(), row.doc);

  const dtos = [];
  for (const link of links) {
    if (applyExpiry(link)) await link.save();
    dtos.push(serializeLink(link, latestByLink.get(link._id.toString()) ?? null));
  }

  return NextResponse.json({ links: dtos });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  await connectToDatabase();

  const expiresAt =
    data.expiresInHours && data.expiresInHours > 0
      ? new Date(Date.now() + data.expiresInHours * 3600_000)
      : null;

  const link = (await TrackingLink.create({
    token: generateTrackingToken(),
    createdBy: new mongoose.Types.ObjectId(auth.sub),
    recipientName: data.recipientName || null,
    recipientEmail: data.recipientEmail || null,
    campaign: data.campaign || null,
    shareMode: data.shareMode,
    expiresAt,
    sessionStatus: "pending",
    consentStatus: "not_requested",
  })) as TrackingLinkDoc;

  await writeAudit({
    actor: auth.sub,
    action: "link.create",
    target: link.token,
    ip: clientIp(req.headers),
    meta: { campaign: data.campaign, shareMode: data.shareMode },
  });

  return NextResponse.json({ link: serializeLink(link) }, { status: 201 });
}
