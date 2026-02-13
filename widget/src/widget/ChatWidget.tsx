import { useEffect, useMemo, useRef, useState } from 'react'
import type { WidgetConfig } from '../lib/config'
import {
  INTENT_LABEL,
  SUB_LABEL,
  resolveWhatsAppNumber,
  type IntentMain,
  type IntentSub,
} from '../lib/constants'
import { createLead } from '../lib/api'
import { formatName, inferIntentFromText } from '../lib/infer'

type Stage = 'choose_main' | 'choose_sub' | 'lead_form' | 'done'

type Msg = { id: string; from: 'bot' | 'user'; text: string }

function uid() {
  const c = (globalThis as any).crypto
  if (c?.randomUUID) return c.randomUUID()
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export default function ChatWidget({ config }: { config: WidgetConfig }) {
  const [open, setOpen] = useState(config.open)
  const [stage, setStage] = useState<Stage>('choose_main')
  const [intentMain, setIntentMain] = useState<IntentMain | null>(null)
  const [intentSub, setIntentSub] = useState<IntentSub | null>(null)
  const [suggestedMain, setSuggestedMain] = useState<IntentMain | null>(null)
  const [suggestedSub, setSuggestedSub] = useState<IntentSub | null>(null)
  const [done, setDone] = useState<{ to: string; text: string } | null>(null)
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: uid(),
      from: 'bot',
      text: 'Para poder derivarte con el especialista adecuado, necesitamos hacerte algunas consultas. ¿Qué es lo que estás buscando?',
    },
  ])

  useEffect(() => {
    if (!open) return
    // reset scroll on open
    setTimeout(() => {
      document.getElementById('eb-messages')?.scrollTo({ top: 1e9 })
    }, 0)
  }, [open, stage, messages.length])

  function pushUser(text: string) {
    setMessages((m) => [...m, { id: uid(), from: 'user', text }])
  }

  function pushBot(text: string) {
    setMessages((m) => [...m, { id: uid(), from: 'bot', text }])
  }

  function resetFlow() {
    setStage('choose_main')
    setIntentMain(null)
    setIntentSub(null)
    setSuggestedMain(null)
    setSuggestedSub(null)
    setDone(null)
    setMessages([
      {
        id: uid(),
        from: 'bot',
        text: 'Para poder derivarte con el especialista adecuado, necesitamos hacerte algunas consultas. ¿Qué es lo que estás buscando?',
      },
    ])
  }

  function chooseMain(main: IntentMain) {
    setIntentMain(main)
    setIntentSub(null)
    setSuggestedMain(null)
    if (main === 'eficiencia_energetica') {
      pushBot('Tu proyecto es para un(a):')
      if (suggestedSub) pushBot(`Sugerencia: ${SUB_LABEL[suggestedSub]}. Confirma con un botón.`)
      setStage('choose_sub')
    } else {
      setSuggestedSub(null)
      pushBot('Antes de derivarte, necesitamos tus datos de contacto:')
      setStage('lead_form')
    }
  }

  function chooseSub(sub: IntentSub) {
    setIntentSub(sub)
    setSuggestedSub(null)
    pushBot('Antes de derivarte, necesitamos tus datos de contacto:')
    setStage('lead_form')
  }

  function handleTypedAtMain(text: string) {
    pushUser(text)
    const inf = inferIntentFromText(text)
    if (!inf.intentMain) {
      pushBot('¿Me ayudas eligiendo una de estas opciones?')
      setSuggestedMain(null)
      setSuggestedSub(null)
      return
    }
    setSuggestedMain(inf.intentMain)
    setSuggestedSub(inf.intentSub)
    const type = INTENT_LABEL[inf.intentMain]
    const sub = inf.intentSub ? SUB_LABEL[inf.intentSub] : null
    pushBot(
      sub
        ? `Si entendí bien, buscas: ${type} para ${sub}. Confírmalo usando los botones.`
        : `Si entendí bien, buscas: ${type}. Confírmalo usando los botones.`,
    )
  }

  function handleTypedAtSub(text: string) {
    pushUser(text)
    const inf = inferIntentFromText(text)
    if (inf.intentSub) {
      setSuggestedSub(inf.intentSub)
      pushBot(`Sugerencia: ${SUB_LABEL[inf.intentSub]}. Confirma con un botón.`)
    } else {
      pushBot('Para continuar, necesito que elijas una de estas opciones:')
    }
  }

  const header = useMemo(() => {
    if (stage === 'lead_form') return 'Datos de contacto'
    if (stage === 'done') return 'Derivación'
    return 'EnergyBot'
  }, [stage])

  return (
    <>
      {!open ? (
        <button className="eb-launcher" onClick={() => setOpen(true)} aria-label="Abrir chat">
          EnergyBot
        </button>
      ) : (
        <div className="eb-window" role="dialog" aria-label="EnergyBot">
          <div className="eb-header">
            <div className="eb-header__title">{header}</div>
            <button className="eb-iconbtn" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
          </div>

          <div className="eb-messages" id="eb-messages">
            {messages.map((m) => (
              <div key={m.id} className={`eb-bubble eb-bubble--${m.from}`}>
                {m.text}
              </div>
            ))}

            {stage === 'choose_main' ? (
              <div className="eb-actions">
                <button
                  className={`eb-chip${suggestedMain === 'eficiencia_energetica' ? ' eb-chip--suggested' : ''}`}
                  onClick={() => {
                    pushUser(INTENT_LABEL.eficiencia_energetica)
                    chooseMain('eficiencia_energetica')
                  }}
                >
                  {INTENT_LABEL.eficiencia_energetica}
                </button>
                <button
                  className={`eb-chip${suggestedMain === 'producto_tecnologia' ? ' eb-chip--suggested' : ''}`}
                  onClick={() => {
                    pushUser(INTENT_LABEL.producto_tecnologia)
                    chooseMain('producto_tecnologia')
                  }}
                >
                  {INTENT_LABEL.producto_tecnologia}
                </button>
                <button
                  className={`eb-chip${suggestedMain === 'otras' ? ' eb-chip--suggested' : ''}`}
                  onClick={() => {
                    pushUser(INTENT_LABEL.otras)
                    chooseMain('otras')
                  }}
                >
                  {INTENT_LABEL.otras}
                </button>
              </div>
            ) : null}

            {stage === 'choose_sub' ? (
              <div className="eb-actions">
                <button
                  className={`eb-chip${suggestedSub === 'casa' ? ' eb-chip--suggested' : ''}`}
                  onClick={() => {
                    pushUser(SUB_LABEL.casa)
                    chooseSub('casa')
                  }}
                >
                  {SUB_LABEL.casa}
                </button>
                <button
                  className={`eb-chip${suggestedSub === 'empresa' ? ' eb-chip--suggested' : ''}`}
                  onClick={() => {
                    pushUser(SUB_LABEL.empresa)
                    chooseSub('empresa')
                  }}
                >
                  {SUB_LABEL.empresa}
                </button>
                <button
                  className={`eb-chip${suggestedSub === 'colegio' ? ' eb-chip--suggested' : ''}`}
                  onClick={() => {
                    pushUser(SUB_LABEL.colegio)
                    chooseSub('colegio')
                  }}
                >
                  {SUB_LABEL.colegio}
                </button>
              </div>
            ) : null}

            {stage === 'lead_form' && intentMain ? (
              <LeadForm
                intentMain={intentMain}
                intentSub={intentSub}
                pageUrl={config.pageUrl}
                onSaved={({ name, phone, email, message }) => {
                  const to = resolveWhatsAppNumber(intentMain, intentSub)
                  const type = INTENT_LABEL[intentMain]
                  const sub = intentSub ? SUB_LABEL[intentSub] : ''
                  const text = [
                    `Hola, soy ${name}.`,
                    `Teléfono: ${phone}.`,
                    email ? `Email: ${email}.` : null,
                    `Tipo: ${type}.`,
                    sub ? `Subtipo: ${sub}.` : null,
                    message ? `Necesidad: ${message}` : null,
                  ]
                    .filter(Boolean)
                    .join(' ')
                  pushBot('Listo. Puedes hablar por WhatsApp con el especialista correspondiente:')
                  pushBot('Importante: el botón abre WhatsApp con un mensaje prellenado.')
                  setStage('done')
                  setDone({ to, text })
                }}
                onBack={() => {
                  resetFlow()
                }}
              />
            ) : null}

            {stage === 'done' ? (
              <DoneActions done={done} onRestart={resetFlow} />
            ) : null}
          </div>

          {stage === 'choose_main' ? (
            <TextComposer placeholder="Escribe tu necesidad (opcional)" onSend={handleTypedAtMain} />
          ) : null}
          {stage === 'choose_sub' ? (
            <TextComposer placeholder="Escribe (opcional) Casa/Empresa/Colegio" onSend={handleTypedAtSub} />
          ) : null}
        </div>
      )}
    </>
  )
}

function TextComposer({
  placeholder,
  onSend,
}: {
  placeholder: string
  onSend: (text: string) => void
}) {
  const [text, setText] = useState('')
  return (
    <form
      className="eb-composer"
      onSubmit={(e) => {
        e.preventDefault()
        const v = text.trim()
        if (!v) return
        setText('')
        onSend(v)
      }}
    >
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
      <button className="eb-btn" type="submit">
        Enviar
      </button>
    </form>
  )
}

function DoneActions({
  done,
  onRestart,
}: {
  done: { to: string; text: string } | null
  onRestart: () => void
}) {
  const href = done
    ? `https://wa.me/${done.to}?text=${encodeURIComponent(done.text)}`
    : null
  return (
    <div className="eb-actions eb-actions--end">
      {href ? (
        <a className="eb-btn eb-btn--wa" href={href} target="_blank" rel="noreferrer">
          Hablar por WhatsApp
        </a>
      ) : null}
      <button className="eb-chip eb-chip--ghost" onClick={onRestart}>
        Volver a empezar
      </button>
    </div>
  )
}

function LeadForm({
  intentMain,
  intentSub,
  pageUrl,
  onSaved,
  onBack,
}: {
  intentMain: IntentMain
  intentSub: IntentSub | null
  pageUrl: string | null
  onSaved: (data: { name: string; phone: string; email?: string; message?: string }) => void
  onBack: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialFocus = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    initialFocus.current?.focus()
  }, [])

  async function submit() {
    setError(null)
    const formattedName = formatName(name)
    if (!formattedName) {
      setError('Nombre requerido.')
      return
    }
    if (!phone.trim()) {
      setError('Teléfono es obligatorio.')
      return
    }
    if (!consent) {
      setError('Debes aceptar ser contactado.')
      return
    }

    setLoading(true)
    try {
      await createLead({
        name: formattedName,
        phone: phone.trim(),
        email: email.trim() || undefined,
        intent_main: intentMain,
        intent_sub: intentSub,
        message: message.trim() || undefined,
        consent: true,
        source: 'wordpress_widget',
        page_url: pageUrl,
        user_agent: navigator.userAgent,
      })

      onSaved({
        name: formattedName,
        phone: phone.trim(),
        email: email.trim() || undefined,
        message: message.trim() || undefined,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="eb-formwrap">
      <div className="eb-form">
        <div className="eb-field">
          <label>Nombre</label>
          <input ref={initialFocus} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="eb-field">
          <label>Teléfono (obligatorio)</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="eb-field">
          <label>Email (opcional)</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="eb-field">
          <label>Cuéntanos en 1 frase tu necesidad (opcional)</label>
          <input value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <label className="eb-check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Acepto ser
          contactado
        </label>
        {error ? <div className="eb-alert">{error}</div> : null}
        <div className="eb-actions eb-actions--form">
          <button className="eb-chip eb-chip--ghost" onClick={onBack} disabled={loading}>
            Reiniciar
          </button>
          <button className="eb-btn eb-btn--wa" onClick={() => void submit()} disabled={loading}>
            {loading ? 'Guardando…' : 'Hablar por Whatsapp'}
          </button>
        </div>
      </div>
    </div>
  )
}
