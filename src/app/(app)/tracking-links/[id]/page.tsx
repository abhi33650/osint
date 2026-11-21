"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import StopCircleRoundedIcon from "@mui/icons-material/StopCircleRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import {
  SessionStatusChip,
  ConsentStatusChip,
} from "@/components/tracking/StatusChip";
import { apiGet, apiSend } from "@/lib/apiClient";
import type { LocationPingDTO, TrackingLinkDTO } from "@/types";

const MapView = dynamic(() => import("@/components/maps/MapView"), {
  ssr: false,
  loading: () => <Skeleton variant="rounded" height={420} />,
});

const STALE_MS = 2 * 60 * 1000; // consider a fix "live" if < 2 min old

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ textAlign: "right" }}>
        {value}
      </Typography>
    </Stack>
  );
}

export default function LinkDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [link, setLink] = React.useState<TrackingLinkDTO | null>(null);
  const [history, setHistory] = React.useState<LocationPingDTO[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [linkRes, locRes] = await Promise.all([
        apiGet<{ link: TrackingLinkDTO }>(`/api/links/${id}`),
        apiGet<{ locations: LocationPingDTO[] }>(`/api/links/${id}/locations`),
      ]);
      setLink(linkRes.link);
      setHistory(locRes.locations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id]);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  async function terminate() {
    if (!window.confirm("Terminate this tracking session?")) return;
    await apiSend(`/api/links/${id}`, "PATCH", { action: "terminate" });
    load();
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!link) return <Skeleton variant="rounded" height={400} />;

  const latest = link.latestLocation;
  const isStale =
    latest != null &&
    Date.now() - new Date(latest.recordedAt).getTime() > STALE_MS;
  const liveSession = ["active", "consented"].includes(link.sessionStatus);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <Button
          startIcon={<ArrowBackRoundedIcon />}
          color="inherit"
          onClick={() => router.push("/tracking-links")}
        >
          Back
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          startIcon={<ContentCopyRoundedIcon />}
          onClick={() => navigator.clipboard.writeText(link.shareUrl)}
        >
          Copy link
        </Button>
        {liveSession && (
          <Button
            size="small"
            color="warning"
            variant="outlined"
            startIcon={<StopCircleRoundedIcon />}
            onClick={terminate}
          >
            Terminate session
          </Button>
        )}
      </Stack>

      <Typography variant="h4" gutterBottom>
        {link.recipientName ?? "Tracking session"}
      </Typography>
      <Stack direction="row" spacing={1} mb={3} flexWrap="wrap">
        <SessionStatusChip status={link.sessionStatus} />
        <ConsentStatusChip status={link.consentStatus} />
        {link.disabled && <Chip size="small" color="error" label="disabled" />}
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardHeader title="Session details" titleTypographyProps={{ variant: "h6" }} />
            <CardContent sx={{ pt: 0 }}>
              <InfoRow label="Tracking ID" value={link.id} />
              <InfoRow label="Token" value={link.token.slice(0, 16) + "…"} />
              <InfoRow label="Recipient email" value={link.recipientEmail ?? "—"} />
              <InfoRow label="Campaign" value={link.campaign ?? "—"} />
              <InfoRow label="Sharing mode" value={link.shareMode.replace("_", "-")} />
              <Divider sx={{ my: 1 }} />
              <InfoRow
                label="Created"
                value={new Date(link.createdAt).toLocaleString()}
              />
              <InfoRow
                label="First opened"
                value={
                  link.firstOpenedAt
                    ? new Date(link.firstOpenedAt).toLocaleString()
                    : "Not opened yet"
                }
              />
              <InfoRow
                label="Consent granted"
                value={
                  link.consentAt
                    ? new Date(link.consentAt).toLocaleString()
                    : "—"
                }
              />
              <InfoRow
                label="Expires"
                value={
                  link.expiresAt
                    ? new Date(link.expiresAt).toLocaleString()
                    : "Never"
                }
              />
              <InfoRow label="Consented updates" value={link.pingCount} />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }} id="map">
          <Card>
            <CardHeader
              title="Location"
              titleTypographyProps={{ variant: "h6" }}
              subheader={
                latest
                  ? `Latest: ${latest.latitude.toFixed(5)}, ${latest.longitude.toFixed(5)}`
                  : "No consented location received yet"
              }
            />
            <CardContent sx={{ pt: 0 }}>
              {latest && isStale && (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  This location is outdated (last update{" "}
                  {new Date(latest.recordedAt).toLocaleString()}). The recipient
                  may not be here now.
                </Alert>
              )}
              {!latest && (
                <Alert severity="info" sx={{ mb: 1.5 }}>
                  Location appears only after the recipient opens the link and
                  explicitly grants permission.
                </Alert>
              )}
              <MapView
                latest={
                  latest
                    ? {
                        lat: latest.latitude,
                        lng: latest.longitude,
                        accuracy: latest.accuracy,
                        recordedAt: latest.recordedAt,
                        label: link.recipientName ?? "Latest location",
                      }
                    : null
                }
                history={history.map((h) => ({
                  lat: h.latitude,
                  lng: h.longitude,
                  accuracy: h.accuracy,
                  recordedAt: h.recordedAt,
                }))}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 2 }}>
        <CardHeader
          title="Consented location history"
          titleTypographyProps={{ variant: "h6" }}
          subheader={`${history.length} update(s)`}
        />
        <CardContent sx={{ pt: 0 }}>
          {history.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No consented location updates recorded.
            </Typography>
          ) : (
            <TableContainer sx={{ maxHeight: 360 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Latitude</TableCell>
                    <TableCell>Longitude</TableCell>
                    <TableCell>Accuracy</TableCell>
                    <TableCell>Source</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell>
                        {new Date(h.recordedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{h.latitude.toFixed(6)}</TableCell>
                      <TableCell>{h.longitude.toFixed(6)}</TableCell>
                      <TableCell>
                        {h.accuracy != null ? `± ${Math.round(h.accuracy)} m` : "—"}
                      </TableCell>
                      <TableCell>{h.source}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
