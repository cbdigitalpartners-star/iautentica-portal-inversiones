const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  max-width: 560px; margin: 0 auto; padding: 32px 24px;
  color: #1a1a1a; line-height: 1.6;
`;

const buttonStyle = `
  display: inline-block; padding: 12px 24px;
  background: #0f172a; color: #fff; text-decoration: none;
  border-radius: 6px; font-weight: 600; margin: 16px 0;
`;

const brand = `
  <div style="border-bottom:1px solid #e5e7eb; padding-bottom:16px; margin-bottom:24px;">
    <div style="font-size:20px; font-weight:700; color:#0f172a;">iAutentica</div>
    <div style="font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:1px;">Portal de Inversiones</div>
  </div>
`;

const footer = `
  <div style="margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; font-size:12px; color:#6b7280;">
    Este correo es automático — si tenés dudas respondé a este mensaje.
  </div>
`;

export function renderInviteEmail(params: { fullName: string; inviteLink: string; role: string }) {
  return `
<div style="${baseStyle}">
  ${brand}
  <h1 style="font-size:22px; margin:0 0 16px 0;">Bienvenido, ${escapeHtml(params.fullName)}</h1>
  <p>Se creó una cuenta para vos en el portal de inversiones iAutentica con el rol de <strong>${escapeHtml(params.role)}</strong>.</p>
  <p>Activá tu cuenta definiendo tu contraseña haciendo clic acá:</p>
  <p><a href="${params.inviteLink}" style="${buttonStyle}">Activar mi cuenta</a></p>
  <p style="font-size:13px; color:#6b7280;">Si el botón no funciona, copiá este link en tu navegador:<br>${escapeHtml(params.inviteLink)}</p>
  ${footer}
</div>`;
}

export function renderNewDocumentEmail(params: {
  fullName: string;
  fundName: string;
  documentName: string;
  category: string;
  link: string;
  updated?: boolean;
}) {
  const verb = params.updated ? "actualizado" : "cargado";
  return `
<div style="${baseStyle}">
  ${brand}
  <h1 style="font-size:22px; margin:0 0 16px 0;">Nuevo documento disponible</h1>
  <p>Hola ${escapeHtml(params.fullName)},</p>
  <p>Se ha ${verb} un documento en el proyecto <strong>${escapeHtml(params.fundName)}</strong>:</p>
  <div style="background:#f9fafb; padding:16px; border-radius:8px; margin:16px 0;">
    <div style="font-weight:600;">${escapeHtml(params.documentName)}</div>
    <div style="font-size:13px; color:#6b7280; margin-top:4px;">${escapeHtml(params.category)}</div>
  </div>
  <p><a href="${params.link}" style="${buttonStyle}">Ver documento</a></p>
  ${footer}
</div>`;
}

export function renderContributionConfirmationEmail(params: {
  fullName: string;
  fundName: string;
  amount: string;
  date: string;
  milestone: string | null;
  link: string;
}) {
  return `
<div style="${baseStyle}">
  ${brand}
  <h1 style="font-size:22px; margin:0 0 16px 0;">Aporte registrado</h1>
  <p>Hola ${escapeHtml(params.fullName)},</p>
  <p>Registramos un aporte en el proyecto <strong>${escapeHtml(params.fundName)}</strong>:</p>
  <table style="width:100%; margin:16px 0; border-collapse:collapse;">
    <tr><td style="padding:8px 0; color:#6b7280;">Monto</td><td style="padding:8px 0; text-align:right; font-weight:600;">${escapeHtml(params.amount)}</td></tr>
    <tr><td style="padding:8px 0; color:#6b7280;">Fecha</td><td style="padding:8px 0; text-align:right;">${escapeHtml(params.date)}</td></tr>
    ${params.milestone ? `<tr><td style="padding:8px 0; color:#6b7280;">Etapa</td><td style="padding:8px 0; text-align:right;">${escapeHtml(params.milestone)}</td></tr>` : ""}
  </table>
  <p><a href="${params.link}" style="${buttonStyle}">Ver en el portal</a></p>
  ${footer}
</div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
