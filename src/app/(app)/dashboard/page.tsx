"use client";

import * as React from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
  Chip,
  Skeleton,
  Alert,
} from "@mui/material";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import Grid from "@mui/material/Grid2";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import StatCard from "@/components/dashboard/StatCard";
import { apiGet } from "@/lib/apiClient";
import type { DashboardStats } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await apiGet<{ stats: DashboardStats }>(
          "/api/dashboard/stats"
        );
        if (active) setStats(data.stats);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load");
      }
    }
    load();
    const t = setInterval(load, 15_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const statusEntries = stats
    ? Object.entries(stats.sessionStatusBreakdown)
    : [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Overview of consent-based tracking activity and email investigations.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {[
          {
            label: "Total Tracking Links",
            value: stats?.totalLinks,
            icon: <LinkRoundedIcon />,
            accent: "#8b5cf6",
          },
          {
            label: "Active Sessions",
            value: stats?.activeSessions,
            icon: <SensorsRoundedIcon />,
            accent: "#22d3ee",
          },
          {
            label: "Completed Sessions",
            value: stats?.completedSessions,
            icon: <TaskAltRoundedIcon />,
            accent: "#34d399",
          },
          {
            label: "Consented Updates",
            value: stats?.totalConsentedUpdates,
            icon: <MyLocationRoundedIcon />,
            accent: "#fbbf24",
          },
          {
            label: "Email Investigations",
            value: stats?.totalEmailInvestigations,
            icon: <TravelExploreRoundedIcon />,
            accent: "#60a5fa",
          },
        ].map((c) => (
          <Grid key={c.label} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
            {stats ? (
              <StatCard
                label={c.label}
                value={c.value ?? 0}
                icon={c.icon}
                accent={c.accent}
              />
            ) : (
              <Skeleton variant="rounded" height={110} />
            )}
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} mt={0.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: "100%" }}>
            <CardHeader
              title="Consented location updates"
              subheader="Last 7 days"
              titleTypographyProps={{ variant: "h6" }}
            />
            <CardContent>
              {stats ? (
                <BarChart
                  height={300}
                  xAxis={[
                    {
                      scaleType: "band",
                      data: stats.updatesLast7Days.map((d) =>
                        d.date.slice(5)
                      ),
                    },
                  ]}
                  series={[
                    {
                      data: stats.updatesLast7Days.map((d) => d.count),
                      label: "Updates",
                      color: "#8b5cf6",
                    },
                  ]}
                  grid={{ horizontal: true }}
                />
              ) : (
                <Skeleton variant="rounded" height={300} />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardHeader
              title="Sessions by status"
              titleTypographyProps={{ variant: "h6" }}
            />
            <CardContent>
              {stats && statusEntries.length > 0 ? (
                <PieChart
                  height={300}
                  series={[
                    {
                      innerRadius: 50,
                      paddingAngle: 2,
                      cornerRadius: 4,
                      data: statusEntries.map(([name, value], i) => ({
                        id: i,
                        value,
                        label: name,
                      })),
                    },
                  ]}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No sessions yet.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 2 }}>
        <CardHeader
          title="Recent activity"
          titleTypographyProps={{ variant: "h6" }}
        />
        <CardContent sx={{ pt: 0 }}>
          {!stats ? (
            <Skeleton variant="rounded" height={160} />
          ) : stats.recentActivity.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No activity recorded yet.
            </Typography>
          ) : (
            <List dense>
              {stats.recentActivity.map((a) => (
                <ListItem
                  key={a.id}
                  secondaryAction={
                    <Typography variant="caption" color="text.secondary">
                      {new Date(a.at).toLocaleString()}
                    </Typography>
                  }
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Chip
                      size="small"
                      label={a.type.split(".")[0]}
                      sx={{ textTransform: "capitalize" }}
                    />
                    <ListItemText primary={a.message} />
                  </Stack>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
