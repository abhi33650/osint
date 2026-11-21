"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  Stack,
  Typography,
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import {
  DataGrid,
  GridActionsCellItem,
  type GridColDef,
} from "@mui/x-data-grid";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import MapRoundedIcon from "@mui/icons-material/MapRounded";
import CreateLinkDialog from "@/components/tracking/CreateLinkDialog";
import {
  SessionStatusChip,
  ConsentStatusChip,
} from "@/components/tracking/StatusChip";
import { apiGet, apiSend } from "@/lib/apiClient";
import type { TrackingLinkDTO } from "@/types";

export default function TrackingLinksPage() {
  const router = useRouter();
  const [links, setLinks] = React.useState<TrackingLinkDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await apiGet<{ links: TrackingLinkDTO[] }>("/api/links");
      setLinks(data.links);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load links");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  async function copyLink(link: TrackingLinkDTO) {
    try {
      await navigator.clipboard.writeText(link.shareUrl);
      setToast("Tracking link copied to clipboard");
    } catch {
      setToast(link.shareUrl);
    }
  }

  async function toggleDisable(link: TrackingLinkDTO) {
    await apiSend(`/api/links/${link.id}`, "PATCH", {
      action: link.disabled ? "enable" : "disable",
    });
    setToast(link.disabled ? "Link enabled" : "Link disabled");
    load();
  }

  async function remove(link: TrackingLinkDTO) {
    if (
      !window.confirm(
        "Delete this link and all its consented location history? This cannot be undone."
      )
    )
      return;
    await apiSend(`/api/links/${link.id}`, "DELETE");
    setToast("Link deleted");
    load();
  }

  const columns: GridColDef<TrackingLinkDTO>[] = [
    {
      field: "recipientName",
      headerName: "Recipient",
      flex: 1,
      minWidth: 150,
      valueGetter: (_v, row) => row.recipientName ?? "—",
    },
    {
      field: "recipientEmail",
      headerName: "Email",
      flex: 1,
      minWidth: 180,
      valueGetter: (_v, row) => row.recipientEmail ?? "—",
    },
    {
      field: "campaign",
      headerName: "Campaign",
      flex: 1,
      minWidth: 130,
      valueGetter: (_v, row) => row.campaign ?? "—",
    },
    {
      field: "createdAt",
      headerName: "Created",
      width: 120,
      valueGetter: (_v, row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      field: "expiresAt",
      headerName: "Expires",
      width: 120,
      valueGetter: (_v, row) =>
        row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : "Never",
    },
    {
      field: "consentStatus",
      headerName: "Consent",
      width: 130,
      renderCell: (p) => <ConsentStatusChip status={p.row.consentStatus} />,
      sortable: false,
    },
    {
      field: "sessionStatus",
      headerName: "Session",
      width: 120,
      renderCell: (p) => <SessionStatusChip status={p.row.sessionStatus} />,
      sortable: false,
    },
    {
      field: "latestLocation",
      headerName: "Latest Location",
      width: 170,
      sortable: false,
      valueGetter: (_v, row) =>
        row.latestLocation
          ? `${row.latestLocation.latitude.toFixed(4)}, ${row.latestLocation.longitude.toFixed(4)}`
          : "—",
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 200,
      getActions: (params) => [
        <GridActionsCellItem
          key="view"
          icon={
            <Tooltip title="View details">
              <VisibilityRoundedIcon />
            </Tooltip>
          }
          label="View details"
          onClick={() => router.push(`/tracking-links/${params.row.id}`)}
        />,
        <GridActionsCellItem
          key="map"
          icon={
            <Tooltip title="View location">
              <MapRoundedIcon />
            </Tooltip>
          }
          label="View location"
          onClick={() => router.push(`/tracking-links/${params.row.id}#map`)}
        />,
        <GridActionsCellItem
          key="copy"
          icon={
            <Tooltip title="Copy link">
              <ContentCopyRoundedIcon />
            </Tooltip>
          }
          label="Copy link"
          onClick={() => copyLink(params.row)}
        />,
        <GridActionsCellItem
          key="disable"
          icon={
            <Tooltip title={params.row.disabled ? "Enable" : "Disable"}>
              {params.row.disabled ? (
                <CheckCircleRoundedIcon />
              ) : (
                <BlockRoundedIcon />
              )}
            </Tooltip>
          }
          label="Toggle"
          onClick={() => toggleDisable(params.row)}
          showInMenu={false}
        />,
        <GridActionsCellItem
          key="delete"
          icon={
            <Tooltip title="Delete">
              <DeleteRoundedIcon />
            </Tooltip>
          }
          label="Delete"
          onClick={() => remove(params.row)}
        />,
      ],
    },
  ];

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        flexWrap="wrap"
        gap={1}
      >
        <Box>
          <Typography variant="h4">Tracking Links</Typography>
          <Typography variant="body2" color="text.secondary">
            Generate and manage consent-based tracking links.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Generate link
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ height: 620 }}>
        <DataGrid
          rows={links}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          initialState={{
            pagination: { paginationModel: { pageSize: 25, page: 0 } },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "rgba(139,92,246,0.06)",
            },
          }}
        />
      </Card>

      <CreateLinkDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(link) => {
          setLinks((prev) => [link, ...prev]);
          setToast("Tracking link generated");
        }}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setToast(null)}>
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
