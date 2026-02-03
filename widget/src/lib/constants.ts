export type IntentMain = 'eficiencia_energetica' | 'producto_tecnologia' | 'otras'
export type IntentSub = 'casa' | 'empresa' | 'colegio'

export const INTENT_LABEL: Record<IntentMain, string> = {
  eficiencia_energetica: 'Adquirir un Proyecto de eficiencia energética',
  producto_tecnologia: 'Hacer consultas sobre algún producto o tecnología',
  otras: 'Otras consultas',
}

export const SUB_LABEL: Record<IntentSub, string> = {
  casa: 'Casa',
  empresa: 'Empresa',
  colegio: 'Colegio',
}

export const WHATSAPP_NUMBER = {
  residencial: '994276728',
  empresa: '995064569',
  colegio: '961492905',
  general: '975644930',
} as const

export function resolveWhatsAppNumber(
  intentMain: IntentMain,
  intentSub: IntentSub | null,
): string {
  if (intentMain !== 'eficiencia_energetica') return WHATSAPP_NUMBER.general
  if (intentSub === 'casa') return WHATSAPP_NUMBER.residencial
  if (intentSub === 'empresa') return WHATSAPP_NUMBER.empresa
  if (intentSub === 'colegio') return WHATSAPP_NUMBER.colegio
  return WHATSAPP_NUMBER.general
}

