/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-leaflet v4's MapContainer cannot be initialized twice on the same DOM
  // node, which React 18 Strict Mode does in development ("Map container is
  // already initialized"). Strict Mode is a dev-only double-invoke; disabling it
  // is the standard fix for Leaflet maps and has no effect on production output.
  reactStrictMode: false,
  // MUI emotion works best transpiled; keep server external packages lean.
  serverExternalPackages: ["mongoose", "bcryptjs"],
  eslint: {
    // Do not fail production builds on lint; we run lint separately.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
