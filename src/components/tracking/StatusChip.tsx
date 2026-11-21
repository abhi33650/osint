"use client";

import { Chip } from "@mui/material";
import type { ConsentStatus, SessionStatus } from "@/types";

const SESSION_COLORS: Record<
  SessionStatus,
  "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info"
> = {
  pending: "default",
  opened: "info",
  consented: "secondary",
  active: "success",
  stopped: "warning",
  completed: "primary",
  expired: "default",
  disabled: "error",
};

const CONSENT_COLORS: Record<
  ConsentStatus,
  "default" | "success" | "error" | "warning"
> = {
  not_requested: "default",
  granted: "success",
  denied: "error",
  revoked: "warning",
};

export function SessionStatusChip({ status }: { status: SessionStatus }) {
  return (
    <Chip
      size="small"
      label={status}
      color={SESSION_COLORS[status] ?? "default"}
      variant={status === "active" ? "filled" : "outlined"}
      sx={{ textTransform: "capitalize" }}
    />
  );
}

export function ConsentStatusChip({ status }: { status: ConsentStatus }) {
  return (
    <Chip
      size="small"
      label={status.replace("_", " ")}
      color={CONSENT_COLORS[status] ?? "default"}
      variant="outlined"
      sx={{ textTransform: "capitalize" }}
    />
  );
}
