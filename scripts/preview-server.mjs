// Zero-dependency static preview server that mirrors production on ballknw.com.
//
// Production (see vercel.json) serves the repo root as static files with
// `outputDirectory: "."` and two redirects. This server reproduces that exactly
// so the v0 preview matches the live site: landing at `/`, game at `/gaffa/`,
// guides at `/*.html`, and the `/DraftXI/*` + `/football-manager/*` redirects.

import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { join, normalize, extname } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = normalize(join(fileURLToPath(import.meta.url), "..", ".."))
const PORT = Number(process.env.PORT) || 3000
const HOST = process.env.HOST || "0.0.0.0"

// Kept in sync with vercel.json "redirects".
const REDIRECTS = [
  { source: /^\/DraftXI\/(.*)$/, destination: (m) => `/perfect-cup/${m[1]}` },
  { source: /^\/DraftXI$/, destination: () => `/perfect-cup/` },
  { source: /^\/football-manager\/(.*)$/, destination: (m) => `/gaffa/${m[1]}` },
  { source: /^\/football-manager$/, destination: () => `/gaffa/` },
]

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json; charset=utf-8",
}

function contentType(path) {
  return CONTENT_TYPES[extname(path).toLowerCase()] || "application/octet-stream"
}

async function tryFile(path) {
  try {
    const s = await stat(path)
    if (s.isFile()) return path
    if (s.isDirectory()) {
      const indexPath = join(path, "index.html")
      const is = await stat(indexPath)
      if (is.isFile()) return indexPath
    }
  } catch {
    // fall through
  }
  return null
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    let pathname = decodeURIComponent(url.pathname)

    // Apply production redirects.
    for (const rule of REDIRECTS) {
      const match = pathname.match(rule.source)
      if (match) {
        const location = rule.destination(match) + url.search
        res.writeHead(308, { Location: location })
        res.end()
        return
      }
    }

    // Prevent path traversal.
    const safePath = normalize(join(ROOT, pathname))
    if (!safePath.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden")
      return
    }

    // Resolve file: exact match, directory index, or `.html` extension fallback
    // (production serves /about.html; links like /about should still resolve).
    let filePath =
      (await tryFile(safePath)) ||
      (extname(safePath) === "" ? await tryFile(`${safePath}.html`) : null)

    if (!filePath) {
      const notFound = await tryFile(join(ROOT, "404.html"))
      if (notFound) {
        const body = await readFile(notFound)
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" })
        res.end(body)
      } else {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
        res.end("404 Not Found")
      }
      return
    }

    const body = await readFile(filePath)
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-cache",
    })
    res.end(body)
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" })
    res.end(`500 Internal Server Error\n${err?.message ?? ""}`)
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[preview] Serving ${ROOT}`)
  console.log(`[preview] Mirroring production at http://${HOST}:${PORT}`)
  console.log(`[preview]   /              -> landing (index.html)`)
  console.log(`[preview]   /gaffa/        -> Gaffa game`)
  console.log(`[preview]   /perfect-cup/  -> Draft XI / Perfect Cup`)
  console.log(`[preview]   /scout/        -> Scout`)
})
