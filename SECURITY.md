# Seguridad — iAutentica

Mapa de las defensas activas y dónde vive cada una. Para detalles operativos (qué SQL correr, env vars, etc.) ver [CLAUDE.md](CLAUDE.md).

## Capas

```
Browser  ──► Next.js (middleware + handlers) ──► Supabase (Auth + Postgres + Storage)
   │              │                                    │
   │   security headers, CSRF, rate limit,             │  RLS + triggers + CHECKs + audit
   │   Zod allowlists, errores genéricos               │  (sql/security.sql + sql/audit.sql)
   │
   └─ HSTS, secure cookies, CSP
```

## Defensas activas

### Frontend / Edge

| Defensa | Implementación | Contra |
|---|---|---|
| Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options) | [next.config.mjs](next.config.mjs) `headers()` | XSS exfiltration, clickjacking, mixed content, info leak por referer |
| Cookies `ia-role` / `ia-user` / `NEXT_LOCALE` con `secure` + `httpOnly` + `sameSite=lax` | [middleware.ts](middleware.ts) | Robo de cookie por HTTP, lectura desde JS |
| `safeNext()` en callback de OAuth | [app/api/auth/callback/route.ts](app/api/auth/callback/route.ts) | Open redirect post-login |

### API / Backend

| Defensa | Implementación | Contra |
|---|---|---|
| CSRF (Origin/Referer contra `NEXT_PUBLIC_APP_URL`) | [lib/csrf.ts](lib/csrf.ts), aplicado en todos los mutadores admin + notificaciones | CSRF cross-site, Host header spoofing |
| Zod strict + allowlist por endpoint | Cada `app/api/admin/**/route.ts` | Mass assignment |
| Coherencia de negocio: `milestone.fund_id == contribution.fund_id`, monto > 0, fecha ISO | [app/api/admin/contributions/route.ts](app/api/admin/contributions/route.ts) | Datos financieros inconsistentes |
| Pre-validación de roles en `advisor_investors` y `users.POST` | [app/api/admin/advisors/[id]/investors/route.ts](app/api/admin/advisors/[id]/investors/route.ts), [app/api/admin/users/route.ts](app/api/admin/users/route.ts) | Relaciones inválidas |
| Errores PostgREST genéricos (`dbError()`) | [lib/api-errors.ts](lib/api-errors.ts) | Filtración de schema, constraints, valores |
| Rate limit por proceso (token bucket) | [lib/rate-limit.ts](lib/rate-limit.ts), aplicado a `users.POST` (10/h) y `documents.POST` (30/h) | Mail/notification flood por admin comprometido |
| Validación de uploads (MIME real, tamaño, sanitizeFilename, orphan compensation) | [components/admin/document-upload-form.tsx](components/admin/document-upload-form.tsx), [components/admin/developer-form.tsx](components/admin/developer-form.tsx), [components/admin/fund-form.tsx](components/admin/fund-form.tsx) | Tipos no esperados, abuso de storage, archivos huérfanos |
| `/new-password` legacy hash flow gated por `type=recovery|invite` + confirmación de email | [app/(auth)/new-password/page.tsx](app/(auth)/new-password/page.tsx) | Login CSRF / session swap |

### Postgres / Supabase

Triggers, CHECKs y policies viven en [sql/security.sql](sql/security.sql) (idempotente).

| Defensa | Sección | Contra |
|---|---|---|
| Trigger `protect_profile_privileged_columns` | 1 | Privilege escalation: usuarios cambiándose `role='admin'` |
| Trigger `validate_advisor_investor_roles` | 2 | Vínculos asesor↔inversor con roles incorrectos |
| Trigger `validate_contribution_milestone_fund` | 3 | Aporte con `milestone` de otro proyecto |
| `CHECK contributions.amount > 0` | 3 | Aportes negativos o cero |
| `CHECK advisor_investors.advisor_id <> investor_id` | 4 | Auto-relación |
| `CHECK committed_amount > 0`, `dividends >= 0`, `expected_amount > 0` | 4 | Valores absurdos |
| `CHECK funds.latitude` y `funds.longitude` en rango | 4 | Coordenadas inválidas |
| `UNIQUE` en `documents.storage_path` y `fund_photos.storage_path` | 4 | Referencias ambiguas |
| `FORCE ROW LEVEL SECURITY` en 11 tablas | 5 | Bypass por owner si en el futuro la app conecta con un rol no-superuser |
| Policy `developers_select` estrecha (admin OR fund accesible) | 6 | Lectura amplia de metadatos de inmobiliarias |
| Trigger `audit_storage_objects` | 7 | Falta de trazabilidad forense en uploads/deletes |

### Auditoría

- **Cambios en tablas de negocio:** trigger `tg_audit_row` engancha 9 tablas. Filas en `audit_logs` con `entity_table`, `before`, `after`, `diff`. Ver [sql/audit.sql](sql/audit.sql) y la sección de auditoría en [CLAUDE.md](CLAUDE.md).
- **Cambios en `storage.objects`:** trigger `audit_storage_objects` (INSERT/DELETE + UPDATE solo si cambia bucket o name).
- **Eventos de auth (login, password reset, fallos):** los maneja Supabase en `auth.audit_log_entries`. Visible vía Dashboard → Authentication → Logs.
- UI de revisión: [app/admin/audit/page.tsx](app/admin/audit/page.tsx) (solo admin).

## Variables de entorno relevantes

```
NEXT_PUBLIC_APP_URL          # base de links + allowlist CSRF — obligatoria, sin trailing slash
CSRF_ALLOWED_ORIGINS         # opcional, comma-separated, para staging/preview
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY               # opcional
RESEND_FROM_EMAIL            # opcional
```

## Limitaciones conocidas

- **Rate limit es por proceso.** En Vercel cada instancia serverless tiene su bucket. Es defensa contra runaway-script de un admin comprometido, no contra atacante distribuido. Para protección más fuerte, migrar a Upstash Redis.
- **CSP usa `'unsafe-inline'` y `'unsafe-eval'`** porque Next 14 los necesita para hidratación/HMR. Si en el futuro se adopta nonce-based CSP via middleware, se puede apretar.
- **`auth.audit_log_entries` no se replica** a `audit_logs` para no duplicar fuente de verdad. Si hace falta vista cruzada, hacer JOIN puntual por `actor_id` / `user_id`.
- **Política de retención de `audit_logs` no implementada.** Crece linealmente. Para volumen esperado del cliente (1 admin, decenas de cambios al mes) no es problema en años. Si crece feo, agregar cron que borre `created_at < NOW() - INTERVAL '12 months'`.

## Cómo reproducir el setup

1. Correr en orden los SQL de [sql/](sql/) en Supabase: `schema.sql` → `rls.sql` → `audit.sql` → `security.sql`. El último requiere `postgres` (Dashboard SQL Editor) por el trigger sobre `storage.objects`.
2. Setear las env vars (ver tabla arriba).
3. Crear admin inicial vía Dashboard → Auth → Add user con Auto Confirm + `UPDATE profiles SET role='admin' WHERE email='...'` desde Dashboard SQL.

## Reportar una vulnerabilidad

Contactar al equipo técnico antes de divulgar públicamente. No abrir issues con detalles explotables.
