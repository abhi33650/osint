import mongoose from "mongoose";
import type { HydratedDocument, InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

/** Append-only audit trail of security- and privacy-relevant actions. */
const auditLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true, index: true },
    target: { type: String, default: null },
    message: { type: String, default: null },
    ip: { type: String, default: null },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export type AuditLogDoc = HydratedDocument<
  InferSchemaType<typeof auditLogSchema>
>;

export const AuditLog = models.AuditLog || model("AuditLog", auditLogSchema);

/** Fire-and-forget audit writer; never throws into the request path. */
export async function writeAudit(entry: {
  actor?: mongoose.Types.ObjectId | string | null;
  action: string;
  target?: string | null;
  message?: string | null;
  ip?: string | null;
  meta?: unknown;
}): Promise<void> {
  try {
    await AuditLog.create(entry);
  } catch {
    // Swallow — auditing must never break the primary operation.
  }
}
