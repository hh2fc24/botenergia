# energybot-embed

Widget conversacional embebible (para WordPress) + API en Express para capturar leads en Supabase y derivar a WhatsApp.

## Flujo (exacto)

Inicio:
- “Para poder derivarte con el especialista adecuado, necesitamos hacerte algunas consultas. ¿Qué es lo que estás buscando?”

Opciones:
1) “Adquirir un Proyecto de eficiencia energética”
   - Luego: “Tu proyecto es para un(a):”
     - Casa  -> WhatsApp KAM Residencial: `994276728`
     - Empresa -> WhatsApp KAM Empresa: `995064569`
     - Colegio -> WhatsApp KAM Colegio: `961492905`
2) “Hacer consultas sobre algún producto o tecnología” -> WhatsApp General: `975644930`
3) “Otras consultas” -> WhatsApp General: `975644930`

Antes de abrir WhatsApp, SIEMPRE se captura lead (nombre, teléfono obligatorio, email opcional, mensaje opcional, consentimiento).

## Requisitos

- Node.js 18+ (recomendado 20+)
- Proyecto Supabase

## Supabase (tabla `leads`)

1. En Supabase SQL Editor ejecuta: `docs/supabase.sql`
2. Verifica que exista la tabla `public.leads`.

> Nota: RLS está desactivado por ahora (MVP). El archivo incluye comentarios para activarlo luego.

## Variables de entorno

### API (`api/.env`)

- `PORT=8080`
- `ALLOWED_ORIGINS=*` (en producción recomendado: lista separada por comas)
- `ALLOWED_FRAME_ANCESTORS=` (lista separada por comas de sitios que pueden embeber el bot en iframe; ej: `https://ggelectrics.cl,https://www.ggelectrics.cl`)
- `SUPABASE_URL=`
- `SUPABASE_SERVICE_ROLE_KEY=`
- `AI_PROVIDER=openai|gemini|none`
- `OPENAI_API_KEY=` (si aplica)
- `GEMINI_API_KEY=` (si aplica)

> Importante: **Nunca** expongas `SUPABASE_SERVICE_ROLE_KEY` en el frontend.

### Widget (opcional en dev)

En `widget/.env` puedes definir:
- `VITE_API_BASE=http://localhost:8080`

En producción, el widget suele consumir el API del mismo dominio (sin `VITE_API_BASE`).

## Correr en desarrollo

Instala dependencias:

```bash
npm install
npm --prefix api install
npm --prefix widget install
```

Levanta API + widget:

```bash
npm run dev
```

- Widget: `http://localhost:5173/embed`
- API: `http://localhost:8080/health`

## Producción (una sola URL)

Build:

```bash
npm run build
```

Run:

```bash
npm start
```

- Widget: `http://localhost:8080/embed` (también `http://localhost:8080/widget`)
- Dashboard: `http://localhost:8080/dashboard`

## Endpoints API

- `GET /health` -> `{ ok: true }`
- `POST /v1/leads` -> valida con Zod y guarda en Supabase (rate limit 10/min por IP)
- `GET /v1/leads` -> lista últimos 200 (para dashboard)

### Seguridad

- Helmet habilitado.
- CORS configurable via `ALLOWED_ORIGINS`.
- Rate limit en `POST /v1/leads`.

> Producción: **agrega auth** antes de exponer `GET /v1/leads`. El backend ya tiene puntos claros para insertar un middleware de auth.

## WordPress: iframe / snippet

Abre `docs/embed-snippet.html` y copia el snippet recomendado (script) o el iframe en un bloque “HTML personalizado”.

## Verificación mental (casos)

- Caso 1: eficiencia → casa → lead → botón WhatsApp abre `wa.me/994276728` con texto prellenado.
- Caso 2: producto/tecnología → lead → botón WhatsApp abre `wa.me/975644930`.
- Caso 3: otras → lead → botón WhatsApp abre `wa.me/975644930`.

Si el usuario escribe (en vez de apretar botones), el widget sugiere la opción y resalta el botón recomendado, pero el flujo se confirma siempre con botones.
