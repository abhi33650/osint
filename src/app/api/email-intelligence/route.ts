import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/database/mongodb";
import { EmailInvestigation, type EmailInvestigationDoc } from "@/models/EmailInvestigation";
import { requireAdmin } from "@/lib/auth/guard";
import { emailInvestigationSchema } from "@/lib/security/validation";
import { rateLimit, clientIp } from "@/lib/security/rateLimit";
import { investigateEmail } from "@/services/emailIntelligence";
import { writeAudit } from "@/models/AuditLog";
import type { EmailInvestigationResult } from "@/types";

function serialize(doc: EmailInvestigationDoc): EmailInvestigationResult {
  return {
    id: doc._id.toString(),
    email: doc.email,
    domain: doc.domain,
    validFormat: doc.validFormat,
    findings: doc.findings as EmailInvestigationResult["findings"],
    investigatedAt: (doc as unknown as { createdAt: Date }).createdAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  await connectToDatabase();
  const docs = (await EmailInvestigation.find()
    .sort({ createdAt: -1 })
    .limit(100)) as EmailInvestigationDoc[];

  return NextResponse.json({ investigations: docs.map(serialize) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const ip = clientIp(req.headers);
  const rl = rateLimit(`email-intel:${auth.sub}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = emailInvestigationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  await connectToDatabase();

  const { domain, findings } = await investigateEmail(email);

  const doc = (await EmailInvestigation.create({
    createdBy: new mongoose.Types.ObjectId(auth.sub),
    email,
    domain,
    validFormat: true,
    findings,
  })) as EmailInvestigationDoc;

  await writeAudit({
    actor: auth.sub,
    action: "email.investigate",
    target: domain,
    ip,
  });

  return NextResponse.json({ investigation: serialize(doc) }, { status: 201 });
}
