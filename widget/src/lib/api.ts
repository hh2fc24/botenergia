import type { IntentMain, IntentSub } from './constants'

export type CreateLeadPayload = {
  name: string
  phone: string
  email?: string
  intent_main: IntentMain
  intent_sub: IntentSub | null
  message?: string
  consent: boolean
  page_url?: string | null
  user_agent?: string | null
  source?: string
}

export type LeadRow = {
  id: string
  created_at: string
  name: string
  phone: string
  email: string | null
  intent_main: IntentMain
  intent_sub: IntentSub | null
  message: string | null
  consent: boolean
  source: string
  page_url: string | null
  user_agent: string | null
  ai_summary: string | null
}

function apiBase() {
  return import.meta.env.VITE_API_BASE ?? ''
}

export async function createLead(payload: CreateLeadPayload) {
  const res = await fetch(`${apiBase()}/v1/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || `HTTP_${res.status}`)
  }
  return (await res.json()) as { lead: { id: string; created_at: string } }
}

export async function listLeads(params: {
  limit?: number
  intentMain?: string
  intentSub?: string
  q?: string
  from?: string
  to?: string
}): Promise<LeadRow[]> {
  const usp = new URLSearchParams()
  if (params.limit) usp.set('limit', String(params.limit))
  if (params.intentMain) usp.set('intentMain', params.intentMain)
  if (params.intentSub) usp.set('intentSub', params.intentSub)
  if (params.q) usp.set('q', params.q)
  if (params.from) usp.set('from', params.from)
  if (params.to) usp.set('to', params.to)

  const res = await fetch(`${apiBase()}/v1/leads?${usp.toString()}`)
  if (!res.ok) throw new Error(`HTTP_${res.status}`)
  const data = (await res.json()) as { leads: LeadRow[] }
  return data.leads ?? []
}
