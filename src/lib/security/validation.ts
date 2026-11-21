import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

export const createLinkSchema = z.object({
  recipientName: z.string().trim().max(120).optional().or(z.literal("")),
  recipientEmail: z
    .string()
    .trim()
    .email()
    .max(200)
    .optional()
    .or(z.literal("")),
  campaign: z.string().trim().max(120).optional().or(z.literal("")),
  shareMode: z.enum(["one_time", "continuous"]).default("one_time"),
  // Expiration in hours from now. 0 / undefined => no expiry.
  expiresInHours: z.coerce.number().int().min(0).max(24 * 365).optional(),
});

export const consentSchema = z.object({
  shareMode: z.enum(["one_time", "continuous"]),
});

export const pingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(1_000_000).nullable().optional(),
  source: z.string().max(60).default("gps"),
});

export const emailInvestigationSchema = z.object({
  email: z.string().trim().email().max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type ConsentInput = z.infer<typeof consentSchema>;
export type PingInput = z.infer<typeof pingSchema>;
export type EmailInvestigationInput = z.infer<typeof emailInvestigationSchema>;
