# Cotización — iAutentica Portal de Inversiones

## Recomendación

**Cobrar $2.000.000 CLP año 1** + **$600k–$700k CLP/año** mantención desde el año 2.

Táctica de negociación: cotizar **$2.300.000 CLP** y dejar $300k de margen para descuento si regatean. Si aceptan los $2.3M, mejor. Si piden rebaja, bajas a $2M y queda contento (efecto ancla).

---

## Desglose de costos año 1 (lo que tú pagas)

| Ítem | Costo CLP/año | Notas |
|---|---|---|
| Supabase Pro | ~$280k | USD 25/mes × 12 |
| Vercel Pro | ~$225k | USD 20/mes × 12 |
| Resend | ~$225k o $0 | Free tier cubre 3.000 mails/mes — alcanza para este cliente |
| Dominio `iautentica.cl` | ~$15k | NIC Chile |
| **Total infra año 1** | **$520k – $745k** | |

## Margen en $2M

- Con Resend pago: ~$1.255.000 para dev + onboarding + ajustes
- Con Resend free tier: ~$1.480.000

## Mantención año 2+

- **$600k – $700k CLP/año**
- Cubre los ~$520k de infra + $100k-$180k de margen para fixes y soporte básico

## Features nuevas

- **$35k CLP/hora** — no bajar de ahí, protege tu tiempo
- Cotizar por separado, fuera del paquete anual

---

## Lo que está incluido en el paquete año 1

### Software entregado
- Auth multi-rol con RLS (admin / investor / advisor)
- 3 dashboards diferenciados por rol
- CRUD completo: inmobiliarias, proyectos, etapas, aportes, documentos, usuarios
- Subida de archivos (cover, galería, logo, docs) con buckets seguros
- Sistema de notificaciones in-app + mail
- Mapa de proyectos con OpenStreetMap (sin tarjeta de crédito)
- Lightbox de galería con navegación por teclado
- i18n español/inglés
- Modo claro/oscuro
- Descargas de documentos por signed URLs (seguro)
- Topbar con badge del usuario logueado

### Operaciones
- Setup completo del proyecto Supabase
- Configuración Vercel + dominio
- Hosting año 1 (Supabase Pro + Vercel Pro incluido)
- Onboarding (presencial o remoto)
- 2 rondas de ajustes menores (definir scope antes)
- Soporte por email durante 90 días post-entrega

---

## Valoración a precio de mercado

A tarifa estándar Chile para senior dev (~$35k CLP/hora):

- ~80-100 horas de desarrollo ya hechas = **$2.8M-$3.5M solo en dev**
- Estás cobrando bajo costo de oportunidad porque es el primer cliente del producto

Está **subvalorado vs mercado**, pero estratégicamente correcto para validar y conseguir referencia.

---

## Cuándo subir el precio

| Escenario | Precio sugerido |
|---|---|
| iAutentica con >200 inversores activos o features extra | $3M – $4M |
| Vender a otras inmobiliarias del rubro (referencia) | Modelo licencia anual o % por cliente |
| Pedidos de mailing masivo, white-label, API pública | Presupuesto aparte |

## Cuándo bajar el precio

- Solo si el cliente NO necesita Vercel/Supabase Pro (poco tráfico, pocos usuarios) → $1.5M en free tier
- **Riesgo:** sin SLA, si crecen rápido tienes que migrar bajo presión
- Generalmente no vale la pena por $500k de descuento

---

## En la propuesta al cliente

1. **Lista todos los bullets de "Lo que está incluido"** — cuando ve el largo de la lista, entiende que compra un producto, no una página web.
2. **Sé claro sobre el límite de "ajustes menores"** — define qué cuenta y qué no, para evitar scope creep.
3. **Mantención año 2+ se firma por separado** — no la metas en el contrato del año 1, así renegocian cuando toque.
4. **Cobra 50% al firmar, 50% al entregar** — estándar para proyectos de este tamaño en Chile.
