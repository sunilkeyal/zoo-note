/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/notes/[id]/export": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
}

export default nextConfig
