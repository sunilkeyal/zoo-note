import withSerwistInit from "@serwist/next"

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/notes/*/export": ["./node_modules/@sparticuz/chromium/bin/**/*"],
    "/api/notes/import/onenote": ["./src/lib/onenote/vendor/**/*"],
  },
  // Add turbopack config to fix build issues
  turbopack: {},
}

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  swUrl: "/sw.js",
  reloadOnOnline: true,
})

export default withSerwist(nextConfig)
