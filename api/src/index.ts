import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { loadEnv } from './env.js'
import { logger } from './logger.js'
import { createSupabase } from './supabase.js'
import { registerRoutes } from './routes.js'

const env = loadEnv()
const app = express()

// Importante para rate limiting / IP real detrás de proxy (Nginx/Cloudflare/Vercel).
// Ajusta el número según tu infraestructura (1 suele ser suficiente).
app.set('trust proxy', 1)

app.use(helmet())
app.use(express.json({ limit: '256kb' }))

const allowed = env.ALLOWED_ORIGINS.trim()
if (allowed === '*') {
  app.use(cors({ origin: '*' }))
} else {
  const list = allowed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  app.use(
    cors({
      origin(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
        if (!origin) return cb(null, true)
        return cb(null, list.includes(origin))
      },
    }),
  )
}

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    logger.info(
      { method: req.method, path: req.path, status: res.statusCode, ms },
      'http',
    )
  })
  next()
})

const supabase = createSupabase(env)
registerRoutes(app, env, supabase)

// Static serving: widget build (Vite) under the SAME Express app.
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Candidate paths for widget/dist
// Candidate paths for widget/dist
const candidates = [
  path.resolve(__dirname, '../../widget/dist'), // Local development with dist structure
  path.resolve(__dirname, '../widget/dist'),    // Potential flattened structure
  path.join(process.cwd(), 'widget/dist'),      // Vercel root?
  path.join(process.cwd(), '../widget/dist'),   // Local CWD
  path.join(process.cwd(), 'dist'),             // Sometimes vercel flattens here
  path.join(__dirname, 'public'),               // Copied directly into dist/public
]

// Always register routes, decide at runtime if we can serve
const sendIndex = (_req: express.Request, res: express.Response) => {
  const connectionString = (candidates.find((p) => fs.existsSync(p)))
  const indexFile = connectionString ? path.join(connectionString, 'index.html') : null

  if (indexFile && fs.existsSync(indexFile)) {
    return res.sendFile(indexFile)
  }

  // Fallback if not found: Show debug info directly in browser
  res.status(404).type('text/html').send(`
    <h1>Dashboard Error: Frontend not found</h1>
    <p>Could not locate index.html in any of these paths:</p>
    <ul>${candidates.map(c => `<li>${c}</li>`).join('')}</ul>
    <p><strong>CWD:</strong> ${process.cwd()}</p>
    <p><strong>__dirname:</strong> ${__dirname}</p>
  `)
}

// Register static serving if a path is found globally (optimization)
const staticPath = candidates.find((p) => fs.existsSync(p))
if (staticPath) {
  app.use('/embed', express.static(staticPath, { redirect: false }))
  app.use('/widget', express.static(staticPath, { redirect: false }))
}

// Always handle these routes - Vercel will route here, we handle the response
app.get(/^\/embed(\/.*)?$/, sendIndex)
app.get(/^\/widget(\/.*)?$/, sendIndex)
app.get(/^\/dashboard(\/.*)?$/, sendIndex)
// Fallback route to debug path issues in production
app.get('/debug-paths', (_req, res) => {
  const listDir = (dir: string) => {
    try {
      if (!fs.existsSync(dir)) return `ENOENT: ${dir}`
      return fs.readdirSync(dir)
    } catch (e) {
      return `Error: ${e}`
    }
  }

  res.json({
    error: 'Widget dist not found',
    cwd: process.cwd(),
    __dirname,
    candidates,
    filesInCwd: listDir(process.cwd()),
    filesInApiSrc: listDir(path.resolve(__dirname)),
    filesInApi: listDir(path.resolve(__dirname, '..')),
    filesInWidget: listDir(path.resolve(process.cwd(), 'widget')),
    filesInWidgetDist: listDir(path.resolve(process.cwd(), 'widget/dist')),
  })
})


app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'unhandled_error')
  res.status(500).json({ error: 'internal_error' })
})

// Export app for Vercel
export default app

// Only listen if run directly (entry point)
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'listening')
  })
}
