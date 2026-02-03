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
const candidates = [
  path.resolve(__dirname, '../../widget/dist'), // Local development with dist structure
  path.resolve(__dirname, '../widget/dist'),    // Potential flattened structure
  path.join(process.cwd(), 'widget/dist'),      // Vercel root?
  path.join(process.cwd(), '../widget/dist'),   // Local CWD
]

const widgetDist = candidates.find((p) => fs.existsSync(p))
const widgetIndex = widgetDist ? path.join(widgetDist, 'index.html') : null

if (widgetDist && widgetIndex && fs.existsSync(widgetIndex)) {
  // Vite build uses base '/embed/' so assets live under /embed/assets/...
  app.use('/embed', express.static(widgetDist, { redirect: false }))
  app.use('/widget', express.static(widgetDist, { redirect: false }))

  const sendIndex = (_req: express.Request, res: express.Response) => {
    res.sendFile(widgetIndex)
  }

  // Express 5 (path-to-regexp) no acepta '/path/*' como string literal.
  app.get(/^\/embed(\/.*)?$/, sendIndex)
  app.get(/^\/widget(\/.*)?$/, sendIndex)
  app.get(/^\/dashboard(\/.*)?$/, sendIndex)
} else {
  logger.warn(
    { candidates, cwd: process.cwd() },
    'widget dist not found; run `npm --prefix widget run build`',
  )

  // Fallback route to debug path issues in production
  app.get('/debug-paths', (_req, res) => {
    res.json({
      error: 'Widget dist not found',
      cwd: process.cwd(),
      __dirname,
      candidates
    })
  })
}

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
