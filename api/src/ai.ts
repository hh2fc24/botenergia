import type { Env } from './env.js'
import { logger } from './logger.js'

function cleanOneLine(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 280)
}

export async function summarizeForSeller(
  env: Env,
  message: string,
): Promise<string | null> {
  const input = cleanOneLine(message)
  if (!input) return null
  if (env.AI_PROVIDER === 'none') return null

  try {
    if (env.AI_PROVIDER === 'openai') {
      // Optional: si falla, seguimos sin bloquear el flujo.
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 80,
          messages: [
            {
              role: 'system',
              content:
                'Resume el mensaje del cliente en 1 línea (máx 140 caracteres), sin inventar datos.',
            },
            { role: 'user', content: input },
          ],
        }),
      })

      if (!res.ok) {
        logger.warn({ status: res.status }, 'openai summary request failed')
        return null
      }
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const out = data.choices?.[0]?.message?.content
      return out ? cleanOneLine(out).slice(0, 140) : null
    }

    if (env.AI_PROVIDER === 'gemini') {
      const model = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash'
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY ?? '')}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Resume en 1 línea (máx 140 caracteres), sin inventar datos:\n\n${input}`,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.2, maxOutputTokens: 80 },
        }),
      })
      if (!res.ok) {
        logger.warn({ status: res.status }, 'gemini summary request failed')
        return null
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const out = data.candidates?.[0]?.content?.parts?.[0]?.text
      return out ? cleanOneLine(out).slice(0, 140) : null
    }

    return null
  } catch (err) {
    logger.warn({ err }, 'ai summary failed')
    return null
  }
}

