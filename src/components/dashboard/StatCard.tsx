"use client";

import { Card, CardContent, Stack, Typography, Box } from "@mui/material";
import type { ReactNode } from "react";

export default function StatCard({
  label,
  value,
  icon,
  accent = "#8b5cf6",
  hint,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: string;
  hint?: string;
}) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h4" sx={{ mt: 0.5 }}>
              {value}
            </Typography>
            {hint && (
              <Typography variant="caption" color="text.secondary">
                {hint}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: `${accent}22`,
              color: accent,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
