"use client";

import { createTheme } from "@mui/material/styles";

// Premium dark intelligence dashboard — purple primary.
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#8b5cf6", light: "#a78bfa", dark: "#6d28d9" },
    secondary: { main: "#22d3ee" },
    background: { default: "#0b0b12", paper: "#14141f" },
    success: { main: "#34d399" },
    warning: { main: "#fbbf24" },
    error: { main: "#f87171" },
    info: { main: "#60a5fa" },
    divider: "rgba(148,163,184,0.14)",
    text: { primary: "#e6e6f0", secondary: "#9aa0b4" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontWeight: 650 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(148,163,184,0.10)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: "1px solid rgba(148,163,184,0.10)" },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "rgba(11,11,18,0.8)",
          backdropFilter: "blur(8px)",
        },
      },
    },
  },
});

export default theme;
