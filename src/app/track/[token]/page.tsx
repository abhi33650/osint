"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ShieldMoonRoundedIcon from "@mui/icons-material/ShieldMoonRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import StopCircleRoundedIcon from "@mui/icons-material/StopCircleRounded";

interface LinkInfo {
  recipientName: string | null;
  campaign: string | null;
  shareMode: "one_time" | "continuous";
  consentStatus: string;
  sessionStatus: string;
  expired: boolean;
  disabled: boolean;
  usable: boolean;
}

interface Fix {
  lat: number;
  lng: number;
  accuracy: number | null;
  at: string;
  source: string;
}

export default function TrackPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = React.useState<LinkInfo | null>(null);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<
    "idle" | "requesting" | "sharing" | "stopped" | "denied" | "error"
  >("idle");
  const [fix, setFix] = React.useState<Fix | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const watchId = React.useRef<number | null>(null);

  React.useEffect(() => {
    fetch(`/api/track/${token}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("This link is not available.");
        return r.json();
      })
      .then((d: LinkInfo) => setInfo(d))
      .catch((e) => setLoadErr(e.message));
  }, [token]);

  const sendPing = React.useCallback(
    async (pos: GeolocationPosition) => {
      const body = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        source: "browser-geolocation",
      };
      const res = await fetch(`/api/track/${token}/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      setFix({
        lat: body.latitude,
        lng: body.longitude,
        accuracy: body.accuracy,
        at: new Date().toISOString(),
        source: body.source,
      });
      return { ok: res.ok, sessionStatus: data.sessionStatus as string };
    },
    [token]
  );

  function stopWatch() {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }

  async function allowSharing() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage("Your browser does not support location sharing.");
      return;
    }
    setStatus("requesting");
    setMessage(null);

    // The browser now shows its own permission prompt.
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Record explicit consent only after permission is granted.
          await fetch(`/api/track/${token}/consent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shareMode: info?.shareMode ?? "one_time" }),
          });
          await sendPing(pos);

          if (info?.shareMode === "continuous") {
            setStatus("sharing");
            setMessage("You are sharing your live location. You can stop anytime.");
            watchId.current = navigator.geolocation.watchPosition(
              (p) => sendPing(p),
              () => {},
              { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
            );
          } else {
            setStatus("stopped");
            setMessage("Your location was shared once. Nothing further is sent.");
          }
        } catch {
          setStatus("error");
          setMessage("Could not submit your location. Please try again.");
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setMessage(
            "Permission denied. No location was shared. You can close this page."
          );
        } else {
          setStatus("error");
          setMessage("Could not get your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 }
    );
  }

  async function stopSharing() {
    stopWatch();
    setStatus("stopped");
    setMessage("You have stopped sharing your location.");
    try {
      await fetch(`/api/track/${token}/stop`, { method: "POST" });
    } catch {
      /* ignore */
    }
  }

  React.useEffect(() => () => stopWatch(), []);

  const wrap = (children: React.ReactNode) => (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        p: 2,
        background:
          "radial-gradient(1000px 600px at 20% -10%, rgba(139,92,246,0.18), transparent)",
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 480 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>{children}</CardContent>
      </Card>
    </Box>
  );

  if (loadErr) {
    return wrap(
      <Stack spacing={2} alignItems="center">
        <ShieldMoonRoundedIcon color="primary" sx={{ fontSize: 40 }} />
        <Typography variant="h6">Link unavailable</Typography>
        <Alert severity="error" sx={{ width: "100%" }}>
          {loadErr}
        </Alert>
      </Stack>
    );
  }

  if (!info) {
    return wrap(
      <Stack alignItems="center" spacing={2} py={4}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      </Stack>
    );
  }

  if (!info.usable) {
    return wrap(
      <Stack spacing={2} alignItems="center">
        <ShieldMoonRoundedIcon color="primary" sx={{ fontSize: 40 }} />
        <Typography variant="h6">This link is no longer active</Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {info.expired
            ? "It has expired."
            : "It has been disabled by the sender."}{" "}
          No location can be collected.
        </Typography>
      </Stack>
    );
  }

  return wrap(
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <ShieldMoonRoundedIcon color="primary" sx={{ fontSize: 34 }} />
        <Box>
          <Typography variant="h6" lineHeight={1.2}>
            Location sharing request
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {info.campaign ? `Campaign: ${info.campaign}` : "LinkTrack"}
          </Typography>
        </Box>
      </Stack>

      <Divider />

      <Typography variant="body2">
        {info.recipientName ? `Hi ${info.recipientName}, ` : ""}the sender of
        this link is requesting to view your current location
        {info.shareMode === "continuous"
          ? " continuously for a short session"
          : " one time"}
        .
      </Typography>

      <Alert severity="info" icon={<MyLocationRoundedIcon />}>
        Your location is collected <strong>only</strong> if you tap Allow below
        and grant your browser&apos;s permission. You can stop at any time.
        Nothing is collected secretly.
      </Alert>

      {message && (
        <Alert
          severity={
            status === "denied" || status === "error"
              ? "error"
              : status === "sharing"
                ? "success"
                : "info"
          }
        >
          {message}
        </Alert>
      )}

      {fix && (
        <Card variant="outlined">
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={1}
            >
              <Typography variant="subtitle2">Your shared location</Typography>
              <Chip
                size="small"
                color={status === "sharing" ? "success" : "default"}
                label={status === "sharing" ? "Live" : "Last shared"}
              />
            </Stack>
            <Row label="Latitude" value={fix.lat.toFixed(6)} />
            <Row label="Longitude" value={fix.lng.toFixed(6)} />
            <Row
              label="Accuracy"
              value={fix.accuracy != null ? `± ${Math.round(fix.accuracy)} m` : "—"}
            />
            <Row label="Time" value={new Date(fix.at).toLocaleTimeString()} />
            <Row label="Source" value={fix.source} />
          </CardContent>
        </Card>
      )}

      <Stack direction="row" spacing={1.5}>
        {status === "sharing" ? (
          <Button
            fullWidth
            variant="contained"
            color="warning"
            startIcon={<StopCircleRoundedIcon />}
            onClick={stopSharing}
          >
            Stop sharing
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={
              status === "requesting" ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <MyLocationRoundedIcon />
              )
            }
            disabled={status === "requesting" || status === "stopped"}
            onClick={allowSharing}
          >
            {status === "requesting"
              ? "Requesting…"
              : status === "stopped"
                ? "Sharing ended"
                : "Allow location sharing"}
          </Button>
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary" textAlign="center">
        You are in control. Denying permission or closing this page shares
        nothing.
      </Typography>
    </Stack>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}
