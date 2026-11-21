import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite testar no celular/tablet pela rede local. Sem isso, o Next bloqueia
  // os recursos /_next e o React não hidrata quando a página é aberta pelo IP.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*"],

  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
