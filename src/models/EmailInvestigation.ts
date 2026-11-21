import mongoose from "mongoose";
import type { HydratedDocument, InferSchemaType } from "mongoose";

const { Schema, model, models } = mongoose;

const findingSchema = new Schema(
  {
    category: String,
    source: String,
    detail: String,
    confidence: {
      type: String,
      enum: ["high", "medium", "low", "not_verified"],
      default: "not_verified",
    },
  },
  { _id: false }
);

const emailInvestigationSchema = new Schema(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    domain: { type: String, required: true },
    validFormat: { type: Boolean, default: true },
    findings: { type: [findingSchema], default: [] },
  },
  { timestamps: true }
);

export type EmailInvestigationDoc = HydratedDocument<
  InferSchemaType<typeof emailInvestigationSchema>
>;

export const EmailInvestigation =
  models.EmailInvestigation ||
  model("EmailInvestigation", emailInvestigationSchema);
