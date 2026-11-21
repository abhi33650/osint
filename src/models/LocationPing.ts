import mongoose from "mongoose";
import type { HydratedDocument, InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

/**
 * A single consented location update. Created ONLY after the recipient has
 * granted permission for the owning link. Supports configurable retention via
 * an optional TTL index on `expireAt`.
 */
const locationPingSchema = new Schema(
  {
    link: {
      type: Schema.Types.ObjectId,
      ref: "TrackingLink",
      required: true,
      index: true,
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, default: null },
    source: { type: String, default: "gps" },
    recordedAt: { type: Date, default: Date.now, index: true },

    // Optional retention. When set, MongoDB deletes the doc after this date.
    expireAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// TTL index: documents with expireAt are removed automatically once past it.
locationPingSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export type LocationPingDoc = HydratedDocument<
  InferSchemaType<typeof locationPingSchema>
>;

export const LocationPing =
  models.LocationPing || model("LocationPing", locationPingSchema);
