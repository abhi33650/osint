import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/database/mongodb";
import { TrackingLink } from "@/models/TrackingLink";
import { LocationPing } from "@/models/LocationPing";
import { EmailInvestigation } from "@/models/EmailInvestigation";
import { AuditLog } from "@/models/AuditLog";
import { requireAdmin } from "@/lib/auth/guard";
import type { DashboardStats } from "@/types";

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  await connectToDatabase();

  const [
    totalLinks,
    activeSessions,
    completedSessions,
    totalConsentedUpdates,
    totalEmailInvestigations,
    statusAgg,
    updatesAgg,
    recent,
  ] = await Promise.all([
    TrackingLink.countDocuments(),
    TrackingLink.countDocuments({ sessionStatus: "active" }),
    TrackingLink.countDocuments({ sessionStatus: "completed" }),
    LocationPing.countDocuments(),
    EmailInvestigation.countDocuments(),
    TrackingLink.aggregate([
      { $group: { _id: "$sessionStatus", count: { $sum: 1 } } },
    ]),
    LocationPing.aggregate([
      {
        $match: {
          recordedAt: { $gte: new Date(Date.now() - 7 * 86_400_000) },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$recordedAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    AuditLog.find().sort({ createdAt: -1 }).limit(12),
  ]);

  const sessionStatusBreakdown: Record<string, number> = {};
  for (const row of statusAgg as { _id: string; count: number }[]) {
    sessionStatusBreakdown[row._id] = row.count;
  }

  // Build a continuous 7-day series.
  const byDay = new Map<string, number>();
  for (const row of updatesAgg as { _id: string; count: number }[]) {
    byDay.set(row._id, row.count);
  }
  const updatesLast7Days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    updatesLast7Days.push({ date: key, count: byDay.get(key) ?? 0 });
  }

  const recentActivity = (
    recent as { _id: unknown; action: string; target: string | null; message: string | null; createdAt: Date }[]
  ).map((a) => ({
    id: String(a._id),
    type: a.action,
    message: a.message ?? `${a.action}${a.target ? ` · ${a.target.slice(0, 12)}…` : ""}`,
    at: a.createdAt.toISOString(),
  }));

  const stats: DashboardStats = {
    totalLinks,
    activeSessions,
    completedSessions,
    totalConsentedUpdates,
    totalEmailInvestigations,
    sessionStatusBreakdown,
    updatesLast7Days,
    recentActivity,
  };

  return NextResponse.json({ stats });
}
