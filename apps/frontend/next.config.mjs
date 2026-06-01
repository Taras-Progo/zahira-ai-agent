/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@zahira/types", "@zahira/shared"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
