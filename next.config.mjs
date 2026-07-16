import { withSerwist } from "@serwist/next"

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/notes/*/export": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/notes/import/onenote": ["./src/lib/onenote/vendor/**/*"],
  },
}

export default withSerwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  swUrl: "/sw.js",
  reloadOnOnline: true,
})(nextConfig)
