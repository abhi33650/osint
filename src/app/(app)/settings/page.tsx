"use client";

import * as React from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import GppGoodRoundedIcon from "@mui/icons-material/GppGoodRounded";
import { apiGet } from "@/lib/apiClient";
import type { PublicUser } from "@/types";

export default function SettingsPage() {
  const [user, setUser] = React.useState<PublicUser | null>(null);

  React.useEffect(() => {
    apiGet<{ user: PublicUser | null }>("/api/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  const privacyPoints = [
    "Location is never collected without the recipient's explicit browser permission.",
    "The purpose of location collection is always disclosed on the landing page.",
    "Recipients can stop sharing at any time, which halts collection immediately.",
    "Every consent, revocation and admin action is recorded in the audit log.",
    "Email intelligence uses only public sources — no account enumeration or probing.",
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Account, privacy posture and data-retention configuration.
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader title="Account" titleTypographyProps={{ variant: "h6" }} />
            <CardContent>
              <Stack spacing={1}>
                <Row label="Name" value={user?.name ?? "—"} />
                <Row label="Email" value={user?.email ?? "—"} />
                <Row label="Role" value={user?.role ?? "—"} />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardHeader
              title="Data retention"
              titleTypographyProps={{ variant: "h6" }}
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Location retention is controlled by the{" "}
                <code>LOCATION_RETENTION_DAYS</code> environment variable. When
                set above 0, consented location records are automatically deleted
                by MongoDB&apos;s TTL index after that many days. Set to 0 to
                retain until manually deleted.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader
              avatar={<GppGoodRoundedIcon color="primary" />}
              title="Privacy guarantees"
              titleTypographyProps={{ variant: "h6" }}
            />
            <CardContent sx={{ pt: 0 }}>
              <List>
                {privacyPoints.map((p) => (
                  <React.Fragment key={p}>
                    <ListItem>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <VerifiedUserRoundedIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={p} />
                    </ListItem>
                    <Divider component="li" variant="inset" />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}
