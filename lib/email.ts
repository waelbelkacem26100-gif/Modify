import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM ?? 'Modify <rapport@modify-coral.vercel.app>'

export interface WeeklyReportData {
  shopName: string
  recoveredEuros: number
  potentialEuros: number
  fixesApplied: number
  imagesOptimized: number
  mbSaved: number
  articlesPublished: number
  pageSpeedScore: number | null
  pageSpeedDelta: number | null
  newIssues: number
  dashboardUrl: string
}

function row(label: string, value: string, accent = '#18181b'): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #ececec;color:#52525b;font-size:14px;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #ececec;color:${accent};font-size:14px;font-weight:600;text-align:right;">${value}</td>
  </tr>`
}

export function renderWeeklyReportHtml(d: WeeklyReportData): string {
  const speed = d.pageSpeedScore == null
    ? '—'
    : `${d.pageSpeedScore}/100${d.pageSpeedDelta ? ` (${d.pageSpeedDelta > 0 ? '+' : ''}${d.pageSpeedDelta})` : ''}`

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
        <tr><td style="background:#FF5C35;padding:28px 32px;">
          <p style="margin:0;color:#fff;font-size:13px;opacity:.85;">Rapport hebdomadaire · ${d.shopName}</p>
          <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:800;">Cette semaine, Modify a récupéré</h1>
          <p style="margin:8px 0 0;color:#fff;font-size:40px;font-weight:800;">€${d.recoveredEuros.toLocaleString('fr-FR')}<span style="font-size:16px;font-weight:500;opacity:.8;"> récupérés</span></p>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row('Correctifs appliqués', String(d.fixesApplied))}
            ${row('Images compressées', `${d.imagesOptimized} (${d.mbSaved} Mo économisés)`)}
            ${row('Articles SEO publiés', String(d.articlesPublished))}
            ${row('Score vitesse mobile', speed, d.pageSpeedScore != null && d.pageSpeedScore >= 90 ? '#16a34a' : '#d97706')}
            ${row('Nouveaux problèmes détectés', String(d.newIssues), d.newIssues > 0 ? '#dc2626' : '#16a34a')}
            ${row('Potentiel restant à récupérer', `€${d.potentialEuros.toLocaleString('fr-FR')}/mois`, '#FF5C35')}
          </table>
          <div style="text-align:center;margin-top:28px;">
            <a href="${d.dashboardUrl}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;">Voir le dashboard</a>
          </div>
          <p style="margin:24px 0 0;color:#a1a1aa;font-size:12px;text-align:center;line-height:1.5;">
            Modify entretient votre boutique automatiquement, chaque semaine.<br>Vous n'avez rien à faire.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// ─── Weekly approval email (merchants in "approval" mode) ───────────────────────

export interface ApprovalEmailData {
  shopName: string
  fixes: { title: string; impact_euros: number }[]
  totalEuros: number
  approveUrl: string
  dashboardUrl: string
}

export function renderApprovalEmailHtml(d: ApprovalEmailData): string {
  const rows = d.fixes.map((f) => `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #ececec;color:#18181b;font-size:14px;">${f.title}</td>
    <td style="padding:10px 0;border-bottom:1px solid #ececec;color:#16a34a;font-size:14px;font-weight:600;text-align:right;">+€${f.impact_euros}/mois</td>
  </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
      <tr><td style="background:#FF5C35;padding:28px 32px;">
        <p style="margin:0;color:#fff;font-size:13px;opacity:.85;">${d.shopName}</p>
        <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:800;">${d.fixes.length} amélioration(s) prête(s)</h1>
        <p style="margin:8px 0 0;color:#fff;font-size:15px;opacity:.9;">Jusqu’à <strong>€${d.totalEuros.toLocaleString('fr-FR')}/mois</strong> de ventes à récupérer.</p>
      </td></tr>
      <tr><td style="padding:24px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        <div style="text-align:center;margin-top:28px;">
          <a href="${d.approveUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;">✅ Tout approuver en 1 clic</a>
        </div>
        <p style="margin:18px 0 0;color:#a1a1aa;font-size:12px;text-align:center;line-height:1.5;">
          Un seul clic applique tout sur votre boutique.<br>
          Vous préférez choisir un par un ? <a href="${d.dashboardUrl}" style="color:#FF5C35;">Ouvrez votre dashboard</a>.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

/** Sends the weekly approval email. Returns false on any failure (never throws). */
export async function sendApprovalEmail(to: string, data: ApprovalEmailData): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — skipping approval send')
    return false
  }
  try {
    const resend = new Resend(key)
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `✋ ${data.shopName} — ${data.fixes.length} amélioration(s) à approuver`,
      html: renderApprovalEmailHtml(data),
    })
    if (error) { console.error('[email] Resend error:', error); return false }
    return true
  } catch (e) {
    console.error('[email] approval send threw:', e)
    return false
  }
}

/** Sends the weekly report. Returns false on any failure (never throws). */
export async function sendWeeklyReport(to: string, data: WeeklyReportData): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[email] RESEND_API_KEY not set — skipping send')
    return false
  }
  try {
    const resend = new Resend(key)
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `📈 ${data.shopName} — €${data.recoveredEuros.toLocaleString('fr-FR')} récupérés cette semaine`,
      html: renderWeeklyReportHtml(data),
    })
    if (error) {
      console.error('[email] Resend error:', error)
      return false
    }
    return true
  } catch (e) {
    console.error('[email] send threw:', e)
    return false
  }
}
