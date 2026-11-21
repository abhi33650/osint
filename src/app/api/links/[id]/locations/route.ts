import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database/mongodb";
import { TrackingLink, type TrackingLinkDoc } from "@/models/TrackingLink";
import { LocationPing, type LocationPingDoc } from "@/models/LocationPing";
import { requireAdmin } from "@/lib/auth/guard";
import { serializePing } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

/** Consented location history for a link (newest first). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await connectToDatabase();
  const link = (await TrackingLink.findById(id)) as TrackingLinkDoc | null;
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pings = (await LocationPing.find({ link: link._id })
    .sort({ recordedAt: -1 })
    .limit(1000)) as LocationPingDoc[];

  return NextResponse.json({
    sessionStatus: link.sessionStatus,
    consentStatus: link.consentStatus,
    lastPingAt: link.lastPingAt ? link.lastPingAt.toISOString() : null,
    locations: pings.map(serializePing),
  });
}
