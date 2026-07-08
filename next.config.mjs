/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/notes/*/export": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/notes/import/onenote": ["./src/lib/onenote/vendor/**/*"],
  },
}

export default nextConfig
