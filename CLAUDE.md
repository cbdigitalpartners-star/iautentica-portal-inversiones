# iAutentica — Portal de Inversiones

Fork de Capital Storage para el cliente iautentica.cl. Demo lista, faltan pasos finales de producción (Resend + dominio).

## Stack

Next.js 14 App Router · @supabase/ssr · next-intl (es/en) · TailwindCSS · shadcn/ui manual · Recharts (lazy) · **Leaflet + OpenStreetMap (CARTO tiles)** (lazy) · Resend (mail, opcional) · SWR (polling notifs) · Zod + react-hook-form.

Dependencias **ya removidas** del fork de Capital Storage (no reintroducir sin razón): `@tremor/react`, `@react-google-maps/api`, `mapbox-gl`, `@types/mapbox-gl`, `@headlessui/react`, `@headlessui/tailwindcss`, `@tanstack/react-table`, `@remixicon/react`. Si necesitás un componente que tenían, primero revisá si Radix + Lucide + lo que ya está alcanza.

## Roles

- **admin** → `/admin/*` — ve y edita todo.
- **investor** → `/dashboard`, `/funds`, `/documents`, `/notifications` — solo lectura de lo que tiene vía `fund_access`.
- **advisor** → `/advisor/*` — solo lectura de lo que tengan sus inversores asignados vía `advisor_investors`.

Middleware [middleware.ts](middleware.ts) enruta por rol usando cookies `ia-role` / `ia-user` (se invalidan si cambia el user id).

## Schema y RLS

Correr en orden en Supabase SQL Editor:
1. [sql/schema.sql](sql/schema.sql) — tablas, helpers (`is_admin`, `is_advisor_of`, `advisor_fund_ids`), triggers, buckets.
2. [sql/rls.sql](sql/rls.sql) — policies para todos los roles sobre todas las tablas + storage.
3. [sql/audit.sql](sql/audit.sql) — tabla `audit_logs`, helper `current_actor_id()`, trigger genérico `tg_audit_row` enganchado a todas las tablas críticas. Idempotente.
4. [sql/security.sql](sql/security.sql) — triggers defensivos: `profiles_protect_privileged` (no-admins no pueden cambiar `role`/`id`/`email` propios) y `advisor_investors_validate_roles` (los UUIDs deben coincidir con `role='advisor'` y `role='investor'` respectivamente). Idempotente.

Tablas nuevas respecto a Capital Storage:
- `developers` — inmobiliarias
- `advisor_investors` — relación asesor↔inversor
- `contribution_milestones` — etapas por proyecto, con `expected_amount`, `expected_date`, `reached_at`
- `notifications` — notificaciones in-app

`contributions` gana `milestone_id` y `committed_amount`. `funds` gana `developer_id`. `profiles.role` acepta `'advisor'`.

### Seed inicial de proyectos iAutentica

7 proyectos pre-cargados via SQL (Inmobiliaria Auténtica como único developer):
Viñedos de Rengo, Vive Quinta, Edificio Alfredo Mackenney, Viñedos de Rengo II, VUI Catapilco, Edificio Carlos Walker, Renta Isla de Maipo. Coordenadas reales para que aparezcan en el mapa.

## Mail

Hay dos modos:

**Demo / sin Resend:** Supabase Auth manda los mails (invite, reset). Limitación: free tier de Supabase tiene **rate limit de 4 mails/hora**. Para crear varios usuarios sin mail, usar Dashboard → Auth → Add user con "Auto Confirm User" + `UPDATE profiles SET role='...'`.

**Producción / con Resend:**
- Cliente en [lib/mail/resend.ts](lib/mail/resend.ts) — fire-and-forget con log; si no hay API key, skip silencioso (`console.warn`).
- Plantillas HTML inline en [lib/mail/templates.ts](lib/mail/templates.ts).
- 3 disparadores:
  - Invite → [app/api/admin/users/route.ts](app/api/admin/users/route.ts)
  - Doc nuevo → [app/api/admin/documents/route.ts](app/api/admin/documents/route.ts)
  - Aporte registrado → [app/api/admin/contributions/route.ts](app/api/admin/contributions/route.ts)

**Importante con Resend activo:** deshabilitar los mails automáticos de Supabase Auth (Auth → Email Templates) para no duplicar.

### Flow de invitación

1. Admin invita desde `/admin/users/new` → `inviteUserByEmail` con `redirectTo = ${appUrl}/api/auth/callback?next=/new-password`.
2. Mail (Supabase o Resend) lleva al user al callback → exchange del code → sesión activa.
3. Callback redirige a `/new-password`.
4. La página de `/new-password` también acepta el flow legacy con `#access_token=...` en el hash (parsea + `setSession` en `useEffect`), por compatibilidad con mails ya enviados.

## Notificaciones in-app

- Tabla `notifications` + policies propias.
- Helper [lib/notifications.ts](lib/notifications.ts): `notifyUsers`, `investorAndAdvisorIdsForFund`, `advisorIdsForInvestor`. Deduplica IDs vía `Set`.
- Se disparan en paralelo con los mails (mismo endpoint).
- UI: [components/notifications-bell.tsx](components/notifications-bell.tsx) en topbar (polling 60s con SWR) + páginas `/notifications` (investor) y `/advisor/notifications` (advisor) que usan [components/notifications-list.tsx](components/notifications-list.tsx).
- Los `link` se guardan en formato investor (`/funds/abc`, `/documents`) y el cliente reescribe al prefijo `/advisor/*` cuando corresponde.

### Enriquecimiento para advisors

[app/api/notifications/route.ts](app/api/notifications/route.ts) detecta si el user es `advisor` y, para cada notif con `metadata.fund_id`, agrega el campo computado `investor_names: string[]` con los nombres de SUS inversores que tienen acceso a ese fondo. La UI lo muestra como "Inversor(es): X, Y" en el bell, en la lista, y también en el panel de documentos.

## Audit log

Tabla `audit_logs` ([sql/audit.sql](sql/audit.sql)) con un trigger genérico `tg_audit_row` enganchado a las tablas críticas. Captura `INSERT/UPDATE/DELETE` con `before` / `after` / `diff` JSON.

### Tablas auditadas

`profiles`, `developers`, `funds`, `fund_access`, `advisor_investors`, `contribution_milestones`, `contributions`, `documents`, `fund_photos`. La tabla `notifications` queda fuera a propósito (ruido alto, valor de auditoría bajo). `audit_logs` no se audita a sí misma.

### Esquema de `audit_logs`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `created_at` | TIMESTAMPTZ | índice DESC |
| `actor_id` | UUID | nullable (capturas sin sesión: cron, SQL editor) |
| `actor_email` / `actor_role` | TEXT | denormalizados al momento del cambio (sobreviven al borrado del profile) |
| `action` | TEXT | `INSERT` \| `UPDATE` \| `DELETE` |
| `entity_table` | TEXT | nombre de la tabla |
| `entity_id` | TEXT | `id` de la fila como texto |
| `before` | JSONB | fila completa antes (UPDATE/DELETE) |
| `after` | JSONB | fila completa después (INSERT/UPDATE) |
| `diff` | JSONB | solo UPDATE: `{ col: { from, to } }` con los campos que cambiaron |

Índices: `(created_at DESC)`, `(actor_id, created_at DESC)`, `(entity_table, created_at DESC)`.

### Atribución del autor (`actor_id`)

Helper SQL `current_actor_id()` resuelve en orden:
1. **`auth.uid()`** — funciona automáticamente para mutaciones client-side que viajan con la sesión del admin (cover image en edición, galería, fund-form, fund-access, milestones-manager, etc.).
2. **Header `x-actor-id`** — necesario para las API routes admin que usan service role, porque service role bypasea RLS y `auth.uid()` queda NULL. Por eso esas rutas usan **`createAuditedAdminClient(gate.userId)`** en lugar de `createAdminClient()` ([lib/supabase/admin.ts](lib/supabase/admin.ts)). El cliente envía el header en cada request a PostgREST, que lo expone vía `current_setting('request.headers')` y el helper lo parsea como UUID.

Si `actor_id` queda NULL, la UI lo muestra como "Sistema" (placeholder de [messages/es.json](messages/es.json) → `audit.unknownActor`). Esto pasa cuando alguien ejecuta SQL desde el Dashboard de Supabase, o cuando un job futuro escriba con service role sin el header.

### Reglas de logueo en el trigger

- `INSERT` / `DELETE` → siempre se loguean.
- `UPDATE` → se ignora si `to_jsonb(NEW)` y `to_jsonb(OLD)` no difieren en ninguna key (atajo: `UPDATE` ruidosos del cliente que reescriben con los mismos valores no aparecen en el log).
- El trigger es `SECURITY DEFINER` con `search_path = public` para escribir en `audit_logs` sin importar el rol del caller.

### RLS

- `SELECT` solo para admins (policy `audit_logs_admin_select USING (is_admin())`).
- No hay policy de `INSERT/UPDATE/DELETE`: solo el trigger (definer) y service role escriben. El admin **no puede borrar entradas desde la app** — la auditoría es append-only por diseño.

### UI

[app/admin/audit/page.tsx](app/admin/audit/page.tsx) — Server Component con filtros vía query string (`table`, `actor`, `from`, `to`) y paginación por cursor sobre `created_at`. Cada fila se expande con `<details>` nativo: INSERT/DELETE muestran el JSON completo; UPDATE muestra una mini-tabla con los campos cambiados (`from` / `to`). Page size 50.

Sidebar: ítem **Auditoría** con icono `ShieldCheck` en [components/layout/admin-sidebar.tsx](components/layout/admin-sidebar.tsx).

### Cómo agregar auditoría a una tabla nueva

1. Sumar el nombre al array `audited` en el bloque `DO $$ ... $$` al final de [sql/audit.sql](sql/audit.sql) y re-correr (es idempotente).
2. Sumar el nombre al array `AUDITED_TABLES` en [app/admin/audit/page.tsx](app/admin/audit/page.tsx) para que aparezca en el filtro de tabla.
3. Sumar la traducción en `audit.tables.<nombre>` en [messages/es.json](messages/es.json) y [messages/en.json](messages/en.json).

### Cómo agregar un endpoint admin que mute datos

Usar `createAuditedAdminClient(gate.userId)` en lugar de `createAdminClient()`. Si te olvidás, el endpoint funciona pero las filas auditadas quedan con `actor_id = NULL` (aparecen como "Sistema").

```ts
import { createAuditedAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const admin = createAuditedAdminClient(gate.userId);
  // ...mutaciones
}
```

### Lo que NO se audita (consciente)

- **Uploads a Storage** (`storage.objects`) — los archivos en sí no se loguean. Pero las filas que esos uploads producen sí quedan registradas: `fund_photos.INSERT`, `documents.INSERT`, `funds.cover_image UPDATE`, `developers.logo_url UPDATE`. Si en el futuro hace falta trazar cada PUT/DELETE al bucket, sumar un trigger en `storage.objects` con la misma función.
- **Tabla `notifications`** — ver justificación arriba.
- **Lecturas** (descarga de docs, vista de fondos) — fuera de scope. Si llega un requerimiento de "quién vio qué documento", hay que agregar logueo explícito en [app/api/documents/[id]/download/route.ts](app/api/documents/[id]/download/route.ts).

### Retención

No hay job de purga. La tabla crece linealmente con la actividad admin. Para el volumen esperado del cliente (1 admin, decenas de cambios al mes) no es problema en años. Si crece feo, agregar una cron que borre filas con `created_at < NOW() - INTERVAL '12 months'` y avisar al cliente.

## Milestones (etapas de aportes)

- Plantillas sugeridas en [lib/milestone-templates.ts](lib/milestone-templates.ts).
- UI CRUD: [components/admin/milestones-manager.tsx](components/admin/milestones-manager.tsx) dentro de [app/admin/funds/[fundId]/page.tsx](app/admin/funds/[fundId]/page.tsx).
- Marcar como "alcanzada" dispara notificación a todos los inversores del fondo.
- Cada milestone se guarda solo al apretar "Agregar etapa" (auto-save, no requiere guardar el form padre).

## Subida de imágenes (3 buckets)

| Bucket | Visibilidad | Uso |
|---|---|---|
| `documents` | privado | docs admin → descarga vía signed URL desde server **con service role** |
| `fund-photos` | público | cover image + galería de proyectos |
| `developer-logos` | público | logos de inmobiliarias |

### Cover image (proyecto)

[components/admin/fund-form.tsx](components/admin/fund-form.tsx) sube directo al bucket con la sesión del admin. **En modo edición** la imagen se persiste **automáticamente al subir** (`UPDATE funds.cover_image`); en modo creación se guarda con el resto del form al apretar "Guardar datos del proyecto".

### Galería del proyecto

[components/admin/fund-photos-manager.tsx](components/admin/fund-photos-manager.tsx) — flujo en 2 pasos:
1. Seleccionar nombre del catálogo [lib/photo-captions.ts](lib/photo-captions.ts) (47 opciones agrupadas: interior, áreas comunes, exterior, renders) o "Otro" (escribir libre).
2. Subir foto(s) — el file picker queda **deshabilitado hasta que se elija un nombre**. Cada foto se guarda automáticamente al subirla.

Lightbox/carrusel de visualización: [components/investor/photo-gallery.tsx](components/investor/photo-gallery.tsx) — full-screen con flechas teclado/UI, `Esc` cierra, contador `N/M`. Usado en investor + advisor.

### Logo de inmobiliaria

[components/admin/developer-form.tsx](components/admin/developer-form.tsx) sube al bucket `developer-logos`. El preview usa `<img>` plano (no `next/image`) para tolerar URLs externas legacy.

### Bucket de documents — descarga segura

[app/api/documents/[id]/download/route.ts](app/api/documents/[id]/download/route.ts):
1. Cliente con sesión del user verifica acceso vía RLS sobre tabla `documents` (RLS bloquea a quien no tenga `fund_access`).
2. **Cliente con service role firma la URL** (`createSignedUrl`), porque la policy de `storage.objects` para bucket `documents` solo deja leer a admins.
3. Redirect a la signed URL (10 min de validez).

**Nunca** llamar `getPublicUrl()` para documents — son privados.

## Storage init en Supabase

Al crear el proyecto Supabase, `storage.buckets` no existe hasta que se entre por primera vez al módulo Storage en Dashboard. Por eso [sql/schema.sql:193-217](sql/schema.sql#L193-L217) tiene un `DO` block con guarda `to_regclass('storage.buckets') IS NOT NULL`. Si la tabla aún no existe, emite un `NOTICE` y los buckets se crean a mano desde Dashboard → Storage. Una vez creado al menos uno, las policies de [sql/rls.sql](sql/rls.sql) sobre `storage.objects` corren sin problema.

## Mapa de proyectos

[components/investor/project-map.tsx](components/investor/project-map.tsx) usa **Leaflet + tiles CARTO sobre OpenStreetMap** (gratis, sin token, sin tarjeta). Carga `leaflet` y CSS dinámicamente en `useEffect` para evitar SSR. Patrón anti-StrictMode: flag `cancelled` + reset de `_leaflet_id` del container antes de inicializar (sin esto, doble-mount en dev tira "Map container is already initialized").

Se eliminaron Mapbox y `NEXT_PUBLIC_MAPBOX_TOKEN`.

## UI patterns importantes

- **Topbar con badge de usuario**: [components/layout/topbar.tsx](components/layout/topbar.tsx) hace fetch del profile server-side y muestra avatar circular con iniciales + nombre + rol (oculto en mobile). Compartido por los 3 layouts.
- **Lista de proyectos como cards**: [app/admin/funds/page.tsx](app/admin/funds/page.tsx) muestra grid responsive con cover, badge de tipo, equity y fecha. Hover con sombra y zoom suave.
- **Cards clickables en dashboards**: investor (`Inversiones vigentes` → `/funds`) y advisor (`Mis Inversores`, `Proyectos`, `Documentos`). Patrón: `<Link>` envolviendo `<Card>` con flecha → en hover.
- **Documentos en página de proyecto admin**: [app/admin/funds/[fundId]/page.tsx](app/admin/funds/[fundId]/page.tsx) lista los docs del proyecto + botón "Subir documento" que va a `/admin/documents/new?fundId=<id>` con el proyecto preseleccionado y bloqueado.
- **`next/image` para arbitrary URLs**: usar `<img>` plano (las URLs externas no se pueden whitelistear de antemano). Para imágenes del bucket Supabase, [next.config.mjs](next.config.mjs) tiene `*.supabase.co/storage/v1/object/public/**`.
- **Radix Select y `value=""`**: prohibido — usar centinela `__none__` y traducir bidireccional. Aplicado en fund-form, user-form, contribution-form, advisor-investors-manager.

## Env vars (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_SUPABASE_SERVICE_ROLE_KEY    # nombre no-standard, lo lee lib/supabase/admin.ts
NEXT_PUBLIC_APP_URL                # base para links en mails (ej http://localhost:3000)

# Opcionales (modo demo funciona sin estas)
RESEND_API_KEY
RESEND_FROM_EMAIL                  # ej: no-reply@iautentica.cl
```

`NEXT_PUBLIC_MAPBOX_TOKEN` ya **no se usa** (se migró a Leaflet/OSM).

## Decisiones técnicas no obvias

1. **Cookies `ia-role` / `ia-user`** — el middleware cachea el rol para evitar query por request, y detecta cambio de user para refetchear.
2. **`admin/` es segmento real, no route group** — los route groups (`(admin)`) no aparecen en URL y colisionan con `(investor)/dashboard`.
3. **`SECURITY DEFINER` + `SET search_path = public`** en funciones SQL — sin eso el trigger de signup falla con "relation profiles does not exist".
4. **`Database` type con helper `TableDef<Row>`** — postgrest-js v2.104 requiere `Views`, `Functions`, `Enums`, `CompositeTypes` en la schema, y `Relationships: []` en cada table. Ver [lib/types/database.ts](lib/types/database.ts).
5. **Selects con joins casteados a `any`** — `.select("*, funds(name)").single()` produce tipos `never` sin Database auto-generado desde Supabase CLI. Los casts están localizados en los API routes.
6. **Notification links en formato investor** — el advisor sidebar los reescribe client-side.
7. **Document download usa service role para firmar** — la policy de storage solo permite read a admins, pero la autorización del user ya quedó validada vía RLS sobre `documents`. Service role solo firma, no chequea permisos.
8. **Auto-save vs Submit explícito**:
   - Auto-save: cover image en edición, galería, milestones (cada acción se persiste sola).
   - Submit explícito: campos de texto del fund-form ("Guardar datos del proyecto").
   - El UI lo aclara con texto "se guarda automáticamente" donde corresponde.
9. **TypeScript tiene 2 errores pre-existentes heredados del repo origen** — recharts Formatter en `fund-allocation-chart.tsx` y CSS import en `project-map.tsx` (este último ya no aplica tras migración a Leaflet — revisar si quedó). No bloquean Next.js dev/build.
10. **Helpers compartidos en [lib/utils.ts](lib/utils.ts)** — `formatCurrency` está fijado a `es-CL` + `CLP` (no `en-US`/`USD`); `formatDate` y `formatDateTime` toleran `null`/inválido devolviendo `"—"`. `parseApiError(res)` mapea 401/403/404/429/5xx a copy en español y soporta cuerpos vacíos. `sanitizeFilename(name)` se usa antes de cualquier `.upload()` a Supabase Storage. **Toda nueva pantalla con plata, fechas o uploads tiene que pasar por estos helpers.**
11. **Mobile bottom nav del investor** — `<InvestorMobileNav>` en [components/layout/investor-sidebar.tsx](components/layout/investor-sidebar.tsx) y montado en [app/(investor)/layout.tsx](app/(investor)/layout.tsx) con `pb-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)]` en `<main>`. Los demás roles (admin/advisor) no tienen bottom nav porque su uso desde mobile no es prioritario.
12. **Dashboard widgets pesados son lazy** — Recharts (chart) y Leaflet (mapa) no entran al chunk inicial del dashboard. Se exponen vía wrapper client `components/investor/dashboard-widgets.tsx` que llama `dynamic(... { ssr: false })`. Por restricción de App Router, **el wrapper tiene que ser `"use client"`**: importar `next/dynamic` desde un Server Component falla en build.
13. **Image `<Image fill>` con `cover_image` requiere `sizes`** — sin él, Next sirve un asset 100vw para tarjetas de 360px. La grilla de `/funds` ya tiene `sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"`. Replicar el patrón en cualquier nueva tarjeta con cover.
14. **Selects con `select("funds(*)")` son derroche** — preferir lista explícita de columnas (ya aplicado en `/dashboard` y `/funds`). Especialmente importante en joins via `fund_access` que se ejecutan en cada page-load.
15. **Motion tokens y `prefers-reduced-motion`** — definidos en [app/globals.css](app/globals.css). Variables de easing `--ease-out-quart` / `--ease-out-quint`. Utilidades:
    - `.ia-rise-in` (360 ms, fade + 6 px lift) — usar para entradas escalonadas con `style={{ animationDelay: "Nms" }}`. Stride típico: **60 ms** entre tarjetas, **80 ms** entre secciones.
    - `.ia-badge-pop` (280 ms, scale 1 → 1.18 → 1) — solo para confirmaciones de estado (ej: badge de la campana cuando el contador sube). Nunca al primer paint.
    - El bloque `@media (prefers-reduced-motion: reduce)` desactiva todo a 0.01 ms globalmente. **No agregues animaciones que no se puedan desactivar via media query** (animaciones JS controladas por timing, ej. setTimeout, también deben checkear `window.matchMedia("(prefers-reduced-motion: reduce)")`).
    - Anti-pattern del proyecto: easing `bounce`/`elastic`, animar layout properties (top/left/width/height), durations >500 ms en feedback, animaciones en loop sin trigger explícito.
16. **Delight = anticipación, nunca performance** — el portal nunca usa confetti, copy juguetón, ilustraciones whimsical, easter eggs visibles, mensajes de loading clever, ni saludos por hora del día. Los momentos de delight son **siempre informacionales**:
    - Subtítulos sobrios bajo H1 (ej: "Resumen consolidado de tu cartera." en `/dashboard`).
    - Visualizaciones que anticipan la próxima pregunta del usuario (ej: barra de progreso aportado/comprometido en la card de Capital total).
    - Empty states con icono + 1-2 líneas cálidas, encerradas en `<Card>` para mantener la grilla (ver [app/(investor)/funds/page.tsx](app/(investor)/funds/page.tsx)).
    - 404 propio en [app/not-found.tsx](app/not-found.tsx): `Compass` + copy chileno + un único CTA al panel.

    Si querés agregar otro toque, primero pasalo por el filtro: ¿sigue siendo el efecto que tendría una banca privada? Si la respuesta es "no, esto es más fintech/SaaS", descartar.
17. **Páginas full-width, secciones contenidas** — todas las pantallas del investor (`/dashboard`, `/funds`, `/funds/[fundId]`, `/documents`, `/notifications`) usan el ancho completo del `<main>` (`flex-1 p-4 md:p-6`). Si alguna sección interna se siente "hero" en pantallas anchas (ej: galería de fotos), la palanca correcta es **subir densidad de la grilla en breakpoints altos**, no agregar `max-w-{n}` al contenedor de la página. La galería usa `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` con `aspect-video` por eso.
18. **Orden canónico de [app/(investor)/funds/[fundId]/page.tsx](app/(investor)/funds/[fundId]/page.tsx)** — `FundSwitcher` (breadcrumb) → H1 + badge → 4 stat cards → descripción → "Mis aportes" → "Documentos del proyecto" → galería. La galería siempre va al final: las fotos son evidencia visual, no hero. Si agregás una sección nueva, ubicala respetando el principio "Numbers are the protagonist" — datos financieros antes que media.
19. **`<FundSwitcher>` en [components/investor/fund-switcher.tsx](components/investor/fund-switcher.tsx)** — breadcrumb que duplica como dropdown switcher. Se le pasa `current` y la lista completa de proyectos accesibles (ya viene en el `Promise.all` de la página). Si el inversor solo tiene 1 proyecto, el dropdown desaparece y queda como texto plano. Para reusar en `/admin/funds/[fundId]` o `/advisor/funds/[fundId]`, pasar `basePath` y `rootLabel` distintos.
20. **Tagline del topbar** — "Portal de Inversiones" en [components/layout/topbar.tsx](components/layout/topbar.tsx), separado del wordmark con un `<span aria-hidden className="h-7 w-px bg-border" />` (no usar pipe typográfico). Oculto en mobile (`hidden sm:block`) por espacio. Es lenguaje de marca — no cambiar a "Portal de Inversionistas" porque excluye a los roles admin/advisor que comparten el mismo topbar.
21. **Inline links en tablas/listas** — patrón "color reveal on hover": el texto hereda `inherit` en estado normal y solo en `hover`/`focus-visible` cambia a `text-primary` con `underline`. Aplicado en el nombre de inversión de la tabla de aportes del dashboard ([components/investor/contributions-table.tsx](components/investor/contributions-table.tsx)). Evita el aspecto de "bolsa de links azules" típico de admin panels — el link existe cuando se busca, no compite cuando se escanea.
22. **Tipografía: Jost via `next/font/google`** — la fuente del proyecto es **Jost** (geométrica humanista, free stand-in del Futura Std del sitio público iautentica.cl). Configurada en [app/layout.tsx](app/layout.tsx) con weights `400/500/600/700`, `display: swap` y expuesta como CSS variable `--font-sans`. La variable se aplica al `<html>` y el `className` al `<body>`, así que tanto la herencia natural como la utilidad `font-sans` de Tailwind ([tailwind.config.ts](tailwind.config.ts) tiene `fontFamily.sans: ["var(--font-sans)", ...]`) resuelven a Jost. **No reemplazar por Inter ni system stack** — Inter está explícitamente listada como anti-reference en [.impeccable.md](.impeccable.md). En [app/globals.css](app/globals.css):
    - `font-feature-settings: "kern", "liga"` en `body` (Jost no soporta `ss01`/`cv11` de Inter — no agregarlas).
    - `-webkit-font-smoothing: antialiased` para que Jost se renderice más fina en macOS.
    - `h1–h4` tienen `line-height: 1.2` y `tracking-tight` por default — Jost a default leading se ve aireada en titulares.
    - Body usa el leading default de Tailwind (1.5x) — no tocarlo.
    - **Números**: usar la utilidad `tabular-nums` de Tailwind en cualquier celda con plata, fechas o cantidades alineables (ya aplicado en dashboard, contributions table, fund detail stats).

## Para poner en producción

1. Crear proyecto Supabase nuevo para iautentica.
2. Correr `sql/schema.sql`. Si reporta `storage.buckets does not exist`, entrar a Dashboard → Storage para inicializar el módulo, crear los 3 buckets a mano (`documents` privado, `fund-photos` y `developer-logos` públicos), luego re-correr (es idempotente).
3. Correr `sql/rls.sql`.
4. Correr `sql/audit.sql`.
5. Correr `sql/security.sql`.
6. Crear admin inicial: Dashboard → Auth → Add user (Auto Confirm) → SQL `UPDATE profiles SET role='admin' WHERE email='...'` (este UPDATE corre con service role en Dashboard, así que el trigger `profiles_protect_privileged` no lo bloquea).
7. Cargar los 7 proyectos seed (SQL `INSERT INTO funds ...` documentado en historial).
8. (Opcional) Cuenta Resend + verificar dominio iautentica.cl (SPF+DKIM) → desactivar mail templates de Supabase Auth.
9. Reemplazar placeholders en `.env.local`.
10. Vercel: nuevo proyecto, conectar dominio `iautentica.cl`, mismas env vars.

Para **demo** se puede saltar Resend y dominio — basta con Supabase + Vercel (o local) + admin inicial via Dashboard.

## Uploads — checklist mínimo

Cualquier nuevo formulario que suba a Supabase Storage debe:

1. **Validar tamaño** antes del request — convención: 15 MB imágenes, 25 MB documentos. Mensaje de error en español con el peso real (`(file.size / 1024 / 1024).toFixed(1)` MB).
2. **Validar tipo** vía `file.type.startsWith("image/")` o accept específico.
3. **Sanitizar nombre** con `sanitizeFilename` antes de pasarlo al `path` de `.upload()`.
4. **Compensar orphan storage** si el `INSERT`/`POST` de DB falla después del upload — `void supabase.storage.from(bucket).remove([path])`.
5. **Botón submit** dice "Guardando…" o "Subiendo…", nunca `"..."`. Cancelar también queda disabled durante upload.

Ejemplos vivos: [components/admin/document-upload-form.tsx](components/admin/document-upload-form.tsx), [components/admin/fund-photos-manager.tsx](components/admin/fund-photos-manager.tsx), [components/admin/fund-form.tsx](components/admin/fund-form.tsx).

## Smoke test end-to-end

1. Admin crea inmobiliaria → sube logo → crea proyecto asociado → sube cover + galería → define 3 milestones → sube documento desde el botón "+ Subir documento" del proyecto.
2. Admin crea inversor (Dashboard si está rate-limited) → asigna `fund_access` al proyecto → registra 2 aportes contra distintos milestones.
3. Login inversor: ve dashboard con su capital, click en "Inversiones vigentes" → `/funds` con cards → entra a un proyecto → galería abre lightbox → puede descargar documento (signed URL).
4. Admin crea asesor → lo liga al inversor → login asesor: ve "Inversores: X" en docs y notifs.
5. Crear 2º inversor del mismo asesor con acceso al mismo fondo → verificar que aparezcan **ambos nombres** en una sola notif/doc del asesor.
6. Bell: badge cuenta correcta, click marca leído y navega.
7. Mail (si Resend): no va a spam, links funcionan.

## Modelo de cobro al cliente

Detalle completo en [COTIZACION.md](COTIZACION.md).

- **Año 1 paquete cerrado:** $2.000.000 CLP (con margen de negociación a $2.3M).
- **Año 2+ mantención:** $600k–$700k CLP/año.
- **Features nuevas:** $35k CLP/h.

## Relacionado

- Plan original: `C:\Users\Shorly-Game\.claude\plans\una-copia-de-este-humming-sparrow.md`
- Repo padre (Capital Storage): `c:/Users/Shorly-Game/Proyectos/bancos/capital-storage-main/`
- Cotización: [COTIZACION.md](COTIZACION.md)

## Design Context

### Users
Spanish-speaking Chilean real-estate investors (and the advisors / admins who serve them) using a private portal to track committed capital, follow project milestones, and access legal/financial documents for projects developed by Inmobiliaria Auténtica. Sessions are short and purposeful: log in, scan status, drill into one project or document, leave. Users expect to feel that their money is in serious hands — not to be entertained.

Three roles share the same surface with different lenses:
- **Admin** — operations: full CRUD across funds, users, contributions, milestones, documents.
- **Investor** — read-only: their own capital, the projects they have access to, their documents and notifications.
- **Advisor** — read-only across the investors assigned to them, with computed "Inversor(es): X, Y" attribution everywhere.

### Brand Personality
**Premium · Curated · Quiet.** The voice is sober, precise, Chilean-professional; tone is closer to a private-banking statement than a fintech dashboard. The portal should evoke **institutional confidence** — every screen earns trust through restraint, accurate numbers, generous whitespace, and the absence of unnecessary ornament. Confidence shows in what is *removed*, not what is added.

### Aesthetic Direction
- **Theme**: Light primary (default to light, not system). Dark mode remains available but is secondary and should never be the surface a screenshot for the client lands on.
- **Color**: Anchored on the iAutentica brand teal `#006681` (HSL `193 100% 25%`) used as `--primary` / `--ring` and as the `brand` token, with `#c4d2d3` (HSL `184 14% 80%`) as `--secondary`. Source of truth: the public site iautentica.cl. Surfaces stay near-white; supporting tones are the slate-cool neutrals already in `globals.css`. No gradients, no accent neons, no shadow-heavy "fintech" cards.
- **Typography**: Jost (Google Fonts) as a free stand-in for the public site's `Futura Std` (which is Adobe-licensed and not redistributable). Kept restrained — headings are confident but not loud (no oversized display sizes); numbers and project names get the visual weight, not section labels.
- **Imagery**: Project cover photos and the OSM/Leaflet map are the only visual heroes. Photography is treated as content, not decoration — the gallery is full-bleed when opened, otherwise contained.
- **Density**: Generous. Card grids breathe; tables are scannable, not packed. Whitespace is the most expensive material on the page — spend it.
- **Motion**: Minimal and functional. Hover lift on clickable cards, fade on dialogs, no scroll-driven or attention-grabbing animation. `prefers-reduced-motion` must be honored.
- **Reference**: The current state of the portal *is* the reference. New work should feel indistinguishable in tone from existing screens — same cool blues, same card style, same calm. Drift toward anything more opinionated requires a reason.

#### Anti-references
- Generic SaaS / "AI-default shadcn" — gray cards, Inter, one blue button, nothing else.
- Crypto / fintech aesthetics — gradients, neon, hyper-modern motion, dark-by-default.
- Corporate-bank stiffness — heavy borders, dense tables, dated typography, zero whitespace.
- Marketing-site flashiness — hero scroll effects, big animated imagery, full-bleed hype.

### Design Principles
1. **Confidence through restraint.** If a flourish doesn't help the investor judge their position, remove it. Quiet always beats clever here.
2. **Numbers are the protagonist.** Capital, committed amounts, milestone progress, dates — these get the strongest typographic weight on every screen. Labels recede.
3. **Same calm across roles.** Admin, investor, and advisor share one visual language; only the data lens changes. No role gets a "fancier" or "denser" treatment.
4. **Whitespace is not waste.** Density signals seriousness in spreadsheets, not in trust products. Err on the side of more space.
5. **Spanish-first, real lengths.** Copy is Chilean Spanish; layouts must hold both `es` and `en` without breaking. Currency in CLP with thousand-separator formatting via `Intl`, dates in `es-CL`.
6. **Auto-save is invisible, submit is explicit.** Where the codebase already auto-saves (cover image in edit, gallery, milestones), the UI states it plainly; where there is a Submit button, nothing else persists silently. Don't mix the two within one form.
