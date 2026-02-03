import { useEffect, useMemo, useState } from 'react'
import { listLeads, type LeadRow } from '../lib/api'
import { INTENT_LABEL, SUB_LABEL, type IntentMain, type IntentSub } from '../lib/constants'
import { readWidgetConfig } from '../lib/config'

export default function DashboardPage() {
  const config = readWidgetConfig()
  const [rows, setRows] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [intentMain, setIntentMain] = useState<IntentMain | ''>('')
  const [intentSub, setIntentSub] = useState<IntentSub | ''>('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    document.documentElement.dataset.ebTheme = config.theme
  }, [config.theme])

  const filters = useMemo(
    () => ({
      limit: 200,
      intentMain: intentMain || undefined,
      intentSub: intentSub || undefined,
      q: q || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [intentMain, intentSub, q, from, to],
  )

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const data = await listLeads(filters)
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="eb-dashboard">
      <header className="eb-dashboard__header">
        <div>
          <h1>Leads (últimos 200)</h1>
          <p className="eb-muted">
            Sin auth por ahora. Para producción, agrega auth en el backend antes de exponer este endpoint.
          </p>
        </div>
        <button className="eb-btn" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </header>

      <section className="eb-dashboard__filters">
        <div className="eb-field">
          <label>Búsqueda</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, teléfono, email, mensaje…" />
        </div>
        <div className="eb-field">
          <label>Tipo</label>
          <select
            value={intentMain}
            onChange={(e) => {
              const v = e.target.value as IntentMain | ''
              setIntentMain(v)
              if (v !== 'eficiencia_energetica') setIntentSub('')
            }}
          >
            <option value="">Todos</option>
            <option value="eficiencia_energetica">{INTENT_LABEL.eficiencia_energetica}</option>
            <option value="producto_tecnologia">{INTENT_LABEL.producto_tecnologia}</option>
            <option value="otras">{INTENT_LABEL.otras}</option>
          </select>
        </div>
        <div className="eb-field">
          <label>Subtipo</label>
          <select
            value={intentSub}
            onChange={(e) => setIntentSub(e.target.value as IntentSub | '')}
            disabled={intentMain !== 'eficiencia_energetica'}
          >
            <option value="">Todos</option>
            <option value="casa">{SUB_LABEL.casa}</option>
            <option value="empresa">{SUB_LABEL.empresa}</option>
            <option value="colegio">{SUB_LABEL.colegio}</option>
          </select>
        </div>
        <div className="eb-field">
          <label>Desde (created_at)</label>
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2026-02-02T00:00:00Z" />
        </div>
        <div className="eb-field">
          <label>Hasta (created_at)</label>
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="2026-02-02T23:59:59Z" />
        </div>
      </section>

      {error ? <div className="eb-alert">Error: {error}</div> : null}

      <div className="eb-tablewrap">
        <table className="eb-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Tipo</th>
              <th>Sub</th>
              <th>Mensaje</th>
              <th>AI</th>
              <th>Page</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="eb-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.name}</td>
                <td className="eb-nowrap">{r.phone}</td>
                <td>{r.email ?? ''}</td>
                <td>{INTENT_LABEL[r.intent_main]}</td>
                <td>{r.intent_sub ? SUB_LABEL[r.intent_sub] : ''}</td>
                <td className="eb-cellwrap">{r.message ?? ''}</td>
                <td className="eb-cellwrap">{r.ai_summary ?? ''}</td>
                <td className="eb-cellwrap">{r.page_url ?? ''}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={9} className="eb-muted">
                  Sin resultados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

