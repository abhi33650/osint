"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import { apiGet, apiSend } from "@/lib/apiClient";
import type { Confidence, EmailInvestigationResult } from "@/types";

const CONFIDENCE_COLOR: Record<
  Confidence,
  "success" | "info" | "warning" | "default"
> = {
  high: "success",
  medium: "info",
  low: "warning",
  not_verified: "default",
};

export default function EmailIntelligencePage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<EmailInvestigationResult | null>(
    null
  );
  const [history, setHistory] = React.useState<EmailInvestigationResult[]>([]);

  const loadHistory = React.useCallback(async () => {
    try {
      const data = await apiGet<{ investigations: EmailInvestigationResult[] }>(
        "/api/email-intelligence"
      );
      setHistory(data.investigations);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function investigate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const data = await apiSend<{ investigation: EmailInvestigationResult }>(
        "/api/email-intelligence",
        "POST",
        { email }
      );
      setResult(data.investigation);
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Investigation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Email Intelligence
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Discover an email address&apos;s public digital footprint using only
        legitimate, publicly available sources.
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        This tool checks public data only (DNS/MX, public Gravatar, and
        authorized breach APIs). It performs no account enumeration, login
        probing, or password-reset probing. Unverifiable items are shown as{" "}
        <strong>Not verified</strong>.
      </Alert>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card component="form" onSubmit={investigate}>
            <CardHeader
              title="Investigate an address"
              titleTypographyProps={{ variant: "h6" }}
            />
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  placeholder="person@example.com"
                />
                {error && <Alert severity="error">{error}</Alert>}
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<TravelExploreRoundedIcon />}
                  disabled={loading}
                >
                  {loading ? "Investigating…" : "Run investigation"}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardHeader
              title="Recent investigations"
              titleTypographyProps={{ variant: "h6" }}
            />
            <CardContent sx={{ pt: 0 }}>
              {history.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No investigations yet.
                </Typography>
              ) : (
                <List dense>
                  {history.slice(0, 10).map((h) => (
                    <ListItem
                      key={h.id}
                      disablePadding
                      sx={{ cursor: "pointer", py: 0.5 }}
                      onClick={() => setResult(h)}
                    >
                      <ListItemText
                        primary={h.email}
                        secondary={new Date(h.investigatedAt).toLocaleString()}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ minHeight: 300 }}>
            <CardHeader
              title={result ? `Results for ${result.email}` : "Results"}
              subheader={result ? `Domain: ${result.domain}` : undefined}
              titleTypographyProps={{ variant: "h6" }}
            />
            <CardContent sx={{ pt: 0 }}>
              {!result ? (
                <Typography variant="body2" color="text.secondary">
                  Run an investigation to see publicly discoverable findings
                  with their source and confidence level.
                </Typography>
              ) : (
                <Stack divider={<Divider flexItem />} spacing={1.5}>
                  {result.findings.map((f, i) => (
                    <Box key={i}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={0.5}
                      >
                        <Typography variant="subtitle2">{f.category}</Typography>
                        <Chip
                          size="small"
                          label={f.confidence.replace("_", " ")}
                          color={CONFIDENCE_COLOR[f.confidence]}
                          variant="outlined"
                          sx={{ textTransform: "capitalize" }}
                        />
                      </Stack>
                      <Typography variant="body2">{f.detail}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Source: {f.source}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
