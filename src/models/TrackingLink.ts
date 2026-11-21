import mongoose from "mongoose";
import type { HydratedDocument, InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

/**
 * A shareable, consent-based tracking link.
 *
 * Privacy model: no location is ever stored unless the recipient explicitly
 * grants browser geolocation permission AND we record a consent timestamp.
 */
const trackingLinkSchema = new Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    recipientName: { type: String, trim: true, default: null },
    recipientEmail: { type: String, trim: true, lowercase: true, default: null },
    campaign: { type: String, trim: true, default: null },

    shareMode: {
      type: String,
      enum: ["one_time", "continuous"],
      default: "one_time",
    },

    consentStatus: {
      type: String,
      enum: ["not_requested", "granted", "denied", "revoked"],
      default: "not_requested",
    },
    sessionStatus: {
      type: String,
      enum: [
        "pending",
        "opened",
        "consented",
        "active",
        "stopped",
        "completed",
        "expired",
        "disabled",
      ],
      default: "pending",
      index: true,
    },

    disabled: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },

    firstOpenedAt: { type: Date, default: null },
    consentAt: { type: Date, default: null },
    lastPingAt: { type: Date, default: null },

    pingCount: { type: Number, default: 0 },

    // Lightweight consent audit trail kept on the link itself.
    consentLog: [
      {
        action: { type: String },
        at: { type: Date, default: Date.now },
        userAgent: { type: String, default: null },
        ip: { type: String, default: null },
      },
    ],
  },
  { timestamps: true }
);

export type TrackingLinkDoc = HydratedDocument<
  InferSchemaType<typeof trackingLinkSchema>
>;

export const TrackingLink =
  models.TrackingLink || model("TrackingLink", trackingLinkSchema);
