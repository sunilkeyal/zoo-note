import puppeteer, { Browser } from "puppeteer-core"
import chromium from "@sparticuz/chromium"

function log(...args: unknown[]) {
  console.log("[pdf]", ...args)
}

const EDITOR_STYLES = `
  body {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1a1a2e;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
  }
  h1 { font-size: 20px; font-weight: 700; margin: 16px 0 8px; }
  h2 { font-size: 18px; font-weight: 600; margin: 14px 0 6px; }
  h3 { font-size: 16px; font-weight: 600; margin: 12px 0 4px; }
  p { margin: 8px 0; }
  ul, ol { padding-left: 24px; margin: 8px 0; }
  li { margin: 4px 0; }
  blockquote {
    border-left: 3px solid #d1d5db;
    margin: 8px 0;
    padding: 4px 16px;
    color: #6b7280;
  }
  code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
  }
  pre code {
    display: block;
    padding: 12px;
    overflow-x: auto;
  }
  img { max-width: 100%; height: auto; }
`

let browserPromise: Promise<Browser> | null = null

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION

    const commonArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--window-position=-9999,-9999",
    ]

    if (isServerless) {
      log("launching in serverless mode")
      browserPromise = puppeteer.launch({
        args: [...chromium.args, ...commonArgs],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: true,
      })
    } else {
      let chromePath: string | undefined
      try {
        const { executablePath } = await import("puppeteer")
        chromePath = await executablePath()
        log("using puppeteer-bundled Chromium at", chromePath)
      } catch {
        chromePath = process.env.CHROME_PATH
        if (chromePath) {
          log("using CHROME_PATH env:", chromePath)
        } else {
          log("no Chromium path found, puppeteer will use default")
        }
      }
      browserPromise = puppeteer.launch({
        executablePath: chromePath,
        args: commonArgs,
        headless: true,
      })
    }
  }
  return browserPromise
}

const SKELETON = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${EDITOR_STYLES}</style>
</head>
<body id="pdf-content"></body>
</html>`

function resolveRelativeImages(html: string, baseUrl: string): string {
  const before = (html.match(/src="\//g) || []).length
  const result = html.replace(/(\bsrc=")\/(?!\/)/g, `$1${baseUrl}/`)
  const after = (result.match(/src="/g) || []).length
  log(`resolveRelativeImages: ${before} relative img URLs found, ${after} total img URLs`)
  return result
}

export async function generatePdf(html: string, baseUrl?: string): Promise<Buffer> {
  const imgCount = (html.match(/<img[^>]*>/gi) || []).length
  log(`generatePdf called: html length=${html.length}, img tags=${imgCount}, baseUrl=${baseUrl}`)

  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    const processedHtml = baseUrl ? resolveRelativeImages(html, baseUrl) : html
    const content = SKELETON.replace(
      '<body id="pdf-content">',
      `<body id="pdf-content">${processedHtml}`
    )

    log("setting page content, waiting for network idle...")
    await page.setContent(content, { waitUntil: "load", timeout: 30000 })
    log("page content set successfully")

    log("checking for img elements...")
    const foundImgs = await page.evaluate(() => document.querySelectorAll("img").length)
    log(`found ${foundImgs} img elements in the page`)

    if (foundImgs > 0) {
      log("waiting for images to finish loading...")
      await page.evaluate(() => Promise.all(
        Array.from(document.querySelectorAll("img"))
          .filter((img) => !img.complete)
          .map((img) => new Promise((r) => { img.onload = r; img.onerror = r }))
      ))
      log("all images finished loading (or errored)")
    }

    log("generating PDF...")
    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "40px", bottom: "40px", left: "40px", right: "40px" },
      printBackground: true,
    })
    log(`PDF generated: ${pdf.length} bytes`)

    return Buffer.from(pdf)
  } catch (err) {
    log("ERROR during PDF generation:", err)
    throw err
  } finally {
    await page.close()
    log("page closed")
  }
}
