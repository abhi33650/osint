"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SpaceDashboardRoundedIcon from "@mui/icons-material/SpaceDashboardRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ShieldMoonRoundedIcon from "@mui/icons-material/ShieldMoonRounded";
import { apiSend } from "@/lib/apiClient";
import type { PublicUser } from "@/types";

const WIDTH = 256;

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: <SpaceDashboardRoundedIcon /> },
  { href: "/tracking-links", label: "Tracking Links", icon: <LinkRoundedIcon /> },
  {
    href: "/email-intelligence",
    label: "Email Intelligence",
    icon: <TravelExploreRoundedIcon />,
  },
  { href: "/settings", label: "Settings", icon: <SettingsRoundedIcon /> },
];

export default function AppShell({
  user,
  children,
}: {
  user: PublicUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = React.useState(false);

  async function logout() {
    try {
      await apiSend("/api/auth/logout", "POST");
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ px: 2.5, py: 2.5 }}>
        <ShieldMoonRoundedIcon color="primary" />
        <Typography variant="h6" fontWeight={750}>
          LinkTrack
        </Typography>
      </Stack>
      <Divider />
      <List sx={{ px: 1.2, py: 1, flex: 1 }}>
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              selected={active}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                "&.Mui-selected": {
                  bgcolor: "rgba(139,92,246,0.16)",
                  "&:hover": { bgcolor: "rgba(139,92,246,0.22)" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: active ? "primary.light" : "text.secondary" }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: active ? 700 : 500,
                  color: active ? "text.primary" : "text.secondary",
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2 }}>
        <Avatar sx={{ bgcolor: "primary.dark", width: 36, height: 36 }}>
          {user.name.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap fontWeight={600}>
            {user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {user.email}
          </Typography>
        </Box>
        <Tooltip title="Sign out">
          <IconButton onClick={logout} size="small">
            <LogoutRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      {isDesktop ? (
        <Drawer
          variant="permanent"
          sx={{
            width: WIDTH,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: WIDTH,
              boxSizing: "border-box",
              bgcolor: "background.paper",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { width: WIDTH, bgcolor: "background.paper" } }}
        >
          {drawer}
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AppBar position="sticky" elevation={0} color="transparent">
          <Toolbar sx={{ gap: 1 }}>
            {!isDesktop && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)}>
                <MenuRoundedIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.secondary">
              Consent-based · audit-logged
            </Typography>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: { xs: 2, md: 3 }, flex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
