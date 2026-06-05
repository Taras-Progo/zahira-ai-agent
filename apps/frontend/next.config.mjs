/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@zahira/types", "@zahira/shared"],
  eslint: { ignoreDuringBuilds: true },
  // Static export: the dashboard is a fully client-rendered SPA that talks to
  // the API. In production it is served as static files by the backend
  // (single-process deployment), so we emit a static `out/` bundle.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
