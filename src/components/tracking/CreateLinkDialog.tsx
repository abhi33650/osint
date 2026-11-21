"use client";

import * as React from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { apiSend } from "@/lib/apiClient";
import type { TrackingLinkDTO } from "@/types";

const EXPIRY_OPTIONS = [
  { label: "No expiration", value: 0 },
  { label: "1 hour", value: 1 },
  { label: "24 hours", value: 24 },
  { label: "7 days", value: 24 * 7 },
  { label: "30 days", value: 24 * 30 },
];

export default function CreateLinkDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (link: TrackingLinkDTO) => void;
}) {
  const [recipientName, setRecipientName] = React.useState("");
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [campaign, setCampaign] = React.useState("");
  const [shareMode, setShareMode] = React.useState<"one_time" | "continuous">(
    "one_time"
  );
  const [expiresInHours, setExpiresInHours] = React.useState(24);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  function reset() {
    setRecipientName("");
    setRecipientEmail("");
    setCampaign("");
    setShareMode("one_time");
    setExpiresInHours(24);
    setError(null);
  }

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const { link } = await apiSend<{ link: TrackingLinkDTO }>(
        "/api/links",
        "POST",
        { recipientName, recipientEmail, campaign, shareMode, expiresInHours }
      );
      onCreated(link);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Generate tracking link</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          A unique, unguessable URL is generated. When opened, the recipient is
          shown a clear consent prompt and location is collected only after they
          explicitly allow it.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={2} mt={0.5}>
          <TextField
            label="Recipient name (optional)"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Recipient email (optional)"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            fullWidth
          />
          <TextField
            label="Campaign name (optional)"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Sharing mode"
            value={shareMode}
            onChange={(e) =>
              setShareMode(e.target.value as "one_time" | "continuous")
            }
            fullWidth
            helperText={
              shareMode === "one_time"
                ? "Collects a single location once the recipient consents."
                : "Collects continuous updates during the consented session."
            }
          >
            <MenuItem value="one_time">One-time location</MenuItem>
            <MenuItem value="continuous">Continuous (consented session)</MenuItem>
          </TextField>
          <TextField
            select
            label="Link expiration"
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Number(e.target.value))}
            fullWidth
          >
            {EXPIRY_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={loading}>
          {loading ? "Generating…" : "Generate link"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
