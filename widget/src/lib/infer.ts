import type { IntentMain, IntentSub } from './constants'

export type Inference = {
  intentMain: IntentMain | null
  intentSub: IntentSub | null
}

function norm(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

export function inferIntentFromText(text: string): Inference {
  const t = norm(text)

  const mentionsEficiencia =
    t.includes('eficiencia') ||
    t.includes('ahorro') ||
    t.includes('energia') ||
    t.includes('energética') ||
    t.includes('energetica') ||
    t.includes('proyecto')

  const mentionsProducto =
    t.includes('producto') ||
    t.includes('tecnologia') ||
    t.includes('tecnología') ||
    t.includes('panel') ||
    t.includes('inversor') ||
    t.includes('bateria') ||
    t.includes('batería') ||
    t.includes('equip') ||
    t.includes('cotiz') ||
    t.includes('precio')

  let intentMain: IntentMain | null = null
  if (mentionsEficiencia && !mentionsProducto) intentMain = 'eficiencia_energetica'
  else if (mentionsProducto && !mentionsEficiencia) intentMain = 'producto_tecnologia'
  else if (mentionsProducto && mentionsEficiencia) intentMain = 'eficiencia_energetica'

  let intentSub: IntentSub | null = null
  if (t.includes('empresa') || t.includes('negocio') || t.includes('oficina')) {
    intentSub = 'empresa'
  } else if (t.includes('casa') || t.includes('hogar') || t.includes('vivienda')) {
    intentSub = 'casa'
  } else if (t.includes('colegio') || t.includes('escuela') || t.includes('liceo')) {
    intentSub = 'colegio'
  }

  if (intentMain !== 'eficiencia_energetica') intentSub = null
  return { intentMain, intentSub }
}

export function formatName(name: string) {
  const cleaned = name.trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''
  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

