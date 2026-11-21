// Shared application types for LinkTrack.

export type Role = "admin" | "viewer";

export type SessionStatus =
  | "pending" // link created, never opened
  | "opened" // recipient opened the page, no consent yet
  | "consented" // recipient granted location permission
  | "active" // actively streaming consented updates
  | "stopped" // recipient stopped sharing
  | "completed" // one-time share finished
  | "expired" // link past expiration
  | "disabled"; // admin disabled the link

export type ConsentStatus = "not_requested" | "granted" | "denied" | "revoked";

export type ShareMode = "one_time" | "continuous";

export type Confidence = "high" | "medium" | "low" | "not_verified";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LocationPingDTO {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  source: string;
  recordedAt: string;
}

export interface TrackingLinkDTO {
  id: string;
  token: string;
  shareUrl: string;
  recipientName: string | null;
  recipientEmail: string | null;
  campaign: string | null;
  shareMode: ShareMode;
  consentStatus: ConsentStatus;
  sessionStatus: SessionStatus;
  createdAt: string;
  expiresAt: string | null;
  firstOpenedAt: string | null;
  consentAt: string | null;
  lastPingAt: string | null;
  disabled: boolean;
  latestLocation: LocationPingDTO | null;
  pingCount: number;
}

export interface DashboardStats {
  totalLinks: number;
  activeSessions: number;
  completedSessions: number;
  totalConsentedUpdates: number;
  totalEmailInvestigations: number;
  sessionStatusBreakdown: Record<string, number>;
  updatesLast7Days: { date: string; count: number }[];
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: string;
  message: string;
  at: string;
}

export interface EmailFinding {
  category: string;
  source: string;
  detail: string;
  confidence: Confidence;
}

export interface EmailInvestigationResult {
  id: string;
  email: string;
  domain: string;
  validFormat: boolean;
  findings: EmailFinding[];
  investigatedAt: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
