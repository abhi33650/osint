import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database/mongodb";
import { TrackingLink, type TrackingLinkDoc } from "@/models/TrackingLink";
import { applyExpiry } from "@/lib/serialize";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIC endpoint. Returns only the minimal info the recipient's landing page
 * needs. Never returns admin data or location history. Marks the link opened.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;

  await connectToDatabase();
  const link = (await TrackingLink.findOne({ token })) as TrackingLinkDoc | null;
  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  const now = Date.now();
  const expired =
    link.expiresAt != null && link.expiresAt.getTime() < now;
  const disabled = Boolean(link.disabled);

  // Mark first open (only when it is still usable).
  let changed = false;
  if (!link.firstOpenedAt && !expired && !disabled) {
    link.firstOpenedAt = new Date();
    changed = true;
  }
  if (link.sessionStatus === "pending" && !expired && !disabled) {
    link.sessionStatus = "opened";
    changed = true;
  }
  if (applyExpiry(link)) changed = true;
  if (changed) await link.save();

  return NextResponse.json({
    recipientName: link.recipientName ?? null,
    campaign: link.campaign ?? null,
    shareMode: link.shareMode,
    consentStatus: link.consentStatus,
    sessionStatus: link.sessionStatus,
    expired,
    disabled,
    usable: !expired && !disabled,
  });
}
