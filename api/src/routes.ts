import type { Express, Request, Response } from 'express'
import express from 'express'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import type { Env } from './env.js'
import { logger } from './logger.js'
import { summarizeForSeller } from './ai.js'
import {
  CreateLeadSchema,
  ListLeadsQuerySchema,
  type CreateLeadInput,
} from './leadSchema.js'
import type { SupabaseClient } from '@supabase/supabase-js'

function getClientIp(req: Request) {
  // Si estás detrás de un proxy (Vercel, Cloudflare, Nginx), configura `app.set('trust proxy', 1)`
  // para que Express use X-Forwarded-For.
  return req.ip || req.socket.remoteAddress || 'unknown'
}

const postLimiter = new RateLimiterMemory({
  points: 10, // 10 requests
  duration: 60, // per 60 seconds per key
})

export function registerRoutes(app: Express, env: Env, supabase: SupabaseClient) {
  app.get('/health', (_req, res) => res.json({ ok: true }))

  app.post('/v1/leads', async (req: Request, res: Response) => {
    try {
      const ip = getClientIp(req)
      await postLimiter.consume(ip)
    } catch {
      return res.status(429).json({ error: 'rate_limited' })
    }

    const parsed = CreateLeadSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_payload', details: parsed.error.issues })
    }

    const input = parsed.data
    const normalized: CreateLeadInput = {
      ...input,
      name: input.name.trim(),
      phone: input.phone.trim(),
      message: input.message ? input.message.trim() : input.message,
      source: input.source ?? 'wordpress_widget',
    }

    const aiSummary =
      normalized.message && normalized.message.trim()
        ? await summarizeForSeller(env, normalized.message)
        : null

    const { data, error } = await supabase
      .from('leads')
      .insert([
        {
          name: normalized.name,
          phone: normalized.phone,
          email: normalized.email ?? null,
          intent_main: normalized.intent_main,
          intent_sub: normalized.intent_sub ?? null,
          message: normalized.message ?? null,
          consent: normalized.consent,
          source: normalized.source ?? 'wordpress_widget',
          page_url: normalized.page_url ?? null,
          user_agent: normalized.user_agent ?? null,
          ai_summary: aiSummary,
        },
      ])
      .select('id, created_at')
      .single()

    if (error) {
      logger.error({ error }, 'failed to insert lead')
      return res.status(500).json({ error: 'insert_failed' })
    }

    return res.status(201).json({ lead: data })
  })

  app.get('/v1/leads', async (req, res) => {
    // Producción: agrega auth aquí (JWT/API key) antes de exponer /v1/leads públicamente.
    // Ejemplo: app.use('/v1/leads', requireAdminAuth)
    // Mantener este endpoint sin auth SOLO para desarrollo/MVP.
    const parsed = ListLeadsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_query', details: parsed.error.issues })
    }

    const { limit, intentMain, intentSub, q, from, to } = parsed.data

    let query = supabase
      .from('leads')
      .select(
        'id, created_at, name, phone, email, intent_main, intent_sub, message, consent, source, page_url, user_agent, ai_summary',
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (intentMain) query = query.eq('intent_main', intentMain)
    if (intentSub) query = query.eq('intent_sub', intentSub)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)
    if (q && q.trim()) {
      const needle = q.trim().replace(/%/g, '')
      query = query.or(
        [
          `name.ilike.%${needle}%`,
          `phone.ilike.%${needle}%`,
          `email.ilike.%${needle}%`,
          `message.ilike.%${needle}%`,
          `ai_summary.ilike.%${needle}%`,
        ].join(','),
      )
    }

    const { data, error } = await query
    if (error) {
      logger.error({ error }, 'failed to list leads')
      return res.status(500).json({ error: 'list_failed' })
    }

    return res.json({ leads: data ?? [] })
  })

  // In case someone hits the api root.
  // Redirect root to dashboard instead of plain text
  app.get('/', (_req, res) => {
    res.redirect('/dashboard/')
  })

  // SPA serving (widget build) is registered in src/index.ts.
}

