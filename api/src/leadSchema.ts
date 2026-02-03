import { z } from 'zod'

export const IntentMain = z.enum([
  'eficiencia_energetica',
  'producto_tecnologia',
  'otras',
])

export const IntentSub = z.enum(['casa', 'empresa', 'colegio'])

export const CreateLeadSchema = z
  .object({
    name: z.string().min(1).max(120),
    phone: z.string().min(5).max(40),
    email: z
      .union([z.string().email().max(200), z.literal('')])
      .optional()
      .transform((v) => (v && v !== '' ? v : undefined)),
    intent_main: IntentMain,
    intent_sub: IntentSub.optional().nullable(),
    message: z.string().max(1000).optional().nullable(),
    consent: z.boolean().refine((v) => v === true, {
      message: 'consent must be true',
    }),
    source: z.string().max(80).optional(),
    page_url: z.string().max(2000).optional().nullable(),
    user_agent: z.string().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.intent_main === 'eficiencia_energetica') {
      if (!data.intent_sub) {
        ctx.addIssue({
          code: 'custom',
          message: 'intent_sub is required for eficiencia_energetica',
          path: ['intent_sub'],
        })
      }
    } else if (data.intent_sub) {
      ctx.addIssue({
        code: 'custom',
        message: 'intent_sub must be null unless eficiencia_energetica',
        path: ['intent_sub'],
      })
    }
  })

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>

export const ListLeadsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(200),
  intentMain: IntentMain.optional(),
  intentSub: IntentSub.optional(),
  q: z.string().max(200).optional(),
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
})
