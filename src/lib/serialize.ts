import type { LocationPingDoc } from "@/models/LocationPing";
import type { TrackingLinkDoc } from "@/models/TrackingLink";
import type { LocationPingDTO, TrackingLinkDTO } from "@/types";

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function serializePing(ping: LocationPingDoc | null): LocationPingDTO | null {
  if (!ping) return null;
  return {
    id: ping._id.toString(),
    latitude: ping.latitude,
    longitude: ping.longitude,
    accuracy: ping.accuracy ?? null,
    source: ping.source ?? "gps",
    recordedAt: (ping.recordedAt ?? new Date()).toISOString(),
  };
}

export function serializeLink(
  link: TrackingLinkDoc,
  latestPing: LocationPingDoc | null = null
): TrackingLinkDTO {
  return {
    id: link._id.toString(),
    token: link.token,
    shareUrl: `${appUrl()}/track/${link.token}`,
    recipientName: link.recipientName ?? null,
    recipientEmail: link.recipientEmail ?? null,
    campaign: link.campaign ?? null,
    shareMode: link.shareMode as TrackingLinkDTO["shareMode"],
    consentStatus: link.consentStatus as TrackingLinkDTO["consentStatus"],
    sessionStatus: link.sessionStatus as TrackingLinkDTO["sessionStatus"],
    createdAt: (link as unknown as { createdAt: Date }).createdAt.toISOString(),
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    firstOpenedAt: link.firstOpenedAt ? link.firstOpenedAt.toISOString() : null,
    consentAt: link.consentAt ? link.consentAt.toISOString() : null,
    lastPingAt: link.lastPingAt ? link.lastPingAt.toISOString() : null,
    disabled: Boolean(link.disabled),
    latestLocation: serializePing(latestPing),
    pingCount: link.pingCount ?? 0,
  };
}

/** Returns true and mutates status if the link is past its expiration. */
export function applyExpiry(link: TrackingLinkDoc): boolean {
  if (
    link.expiresAt &&
    link.expiresAt.getTime() < Date.now() &&
    !["expired", "completed", "stopped"].includes(link.sessionStatus as string)
  ) {
    link.sessionStatus = "expired";
    return true;
  }
  return false;
}
