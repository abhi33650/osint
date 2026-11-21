import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database/mongodb";
import { TrackingLink, type TrackingLinkDoc } from "@/models/TrackingLink";
import { LocationPing, type LocationPingDoc } from "@/models/LocationPing";
import { requireAdmin } from "@/lib/auth/guard";
import { serializeLink, applyExpiry } from "@/lib/serialize";
import { writeAudit } from "@/models/AuditLog";
import { clientIp } from "@/lib/security/rateLimit";

type Ctx = { params: Promise<{ id: string }> };

async function loadLink(id: string): Promise<TrackingLinkDoc | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  return (await TrackingLink.findById(id)) as TrackingLinkDoc | null;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  await connectToDatabase();
  const link = await loadLink(id);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (applyExpiry(link)) await link.save();

  const latest = (await LocationPing.findOne({ link: link._id }).sort({
    recordedAt: -1,
  })) as LocationPingDoc | null;

  return NextResponse.json({ link: serializeLink(link, latest) });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  let body: { action?: string };
  try {
    body = (await req.json()) as { action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await connectToDatabase();
  const link = await loadLink(id);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  switch (body.action) {
    case "disable":
      link.disabled = true;
      link.sessionStatus = "disabled";
      break;
    case "enable":
      link.disabled = false;
      if (link.sessionStatus === "disabled") link.sessionStatus = "pending";
      break;
    case "terminate":
      // Admin ends an active consented session.
      link.sessionStatus = "stopped";
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  await link.save();
  await writeAudit({
    actor: auth.sub,
    action: `link.${body.action}`,
    target: link.token,
    ip: clientIp(req.headers),
  });

  return NextResponse.json({ link: serializeLink(link) });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  await connectToDatabase();
  const link = await loadLink(id);
  if (!link) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Delete the link and all its consented location history.
  await LocationPing.deleteMany({ link: link._id });
  await link.deleteOne();

  await writeAudit({
    actor: auth.sub,
    action: "link.delete",
    target: link.token,
    ip: clientIp(req.headers),
  });

  return NextResponse.json({ ok: true });
}
