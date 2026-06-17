import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM ?? 'Modify <contact@modifea.com>'

export interface WeeklyReportData {
  shopName: string
  recoveredEuros: number
  monthRecoveredEuros: number
  potentialEuros: number
  fixesApplied: number
  appliedFixesList: { title: string; impact_euros: number }[]
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
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
        <tr><td style="background:#FF5C35;padding:28px 32px;">
          <p style="margin:0;color:#fff;font-size:13px;opacity:.85;">${d.shopName}</p>
          <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:800;">Voici ce que Modify a corrigé cette semaine</h1>
          <p style="margin:8px 0 0;color:#fff;font-size:40px;font-weight:800;">€${d.recoveredEuros.toLocaleString('fr-FR')}<span style="font-size:16px;font-weight:500;opacity:.8;"> récupérés cette semaine</span></p>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          ${d.appliedFixesList.length > 0 ? `
          <p style="margin:0 0 8px;color:#18181b;font-size:15px;font-weight:700;">Corrigé cette semaine</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            ${d.appliedFixesList.map((f) => `<tr>
              <td style="padding:9px 0;border-bottom:1px solid #ececec;color:#18181b;font-size:14px;">✅ ${f.title}</td>
              <td style="padding:9px 0;border-bottom:1px solid #ececec;color:#16a34a;font-size:14px;font-weight:600;text-align:right;white-space:nowrap;">+€${f.impact_euros}/mois</td>
            </tr>`).join('')}
          </table>` : `
          <p style="margin:0 0 20px;color:#52525b;font-size:14px;">Aucun nouveau correctif cette semaine — votre boutique est déjà bien optimisée. 🎉</p>`}

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row('Total récupéré ce mois', `€${d.monthRecoveredEuros.toLocaleString('fr-FR')}`, '#16a34a')}
            ${row('Images allégées', `${d.imagesOptimized} (${d.mbSaved} Mo)`)}
            ${row('Articles publiés', String(d.articlesPublished))}
            ${row('Potentiel restant à récupérer', `€${d.potentialEuros.toLocaleString('fr-FR')}/mois`, '#FF5C35')}
          </table>
          <div style="text-align:center;margin-top:28px;">
            <a href="${d.dashboardUrl}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;">Voir le rapport complet</a>
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

// ─── Monthly report (1st of each month) ─────────────────────────────────────────

export interface MonthlyReportData {
  shopName: string
  monthRecovered: number
  totalRecovered: number
  fixesApplied: number
  appliedList: { title: string; impact_euros: number }[]
  articles: number
  winningProducts: number
  scoreNow: number
  scoreDelta: number | null
  pendingList: { title: string; impact_euros: number }[]
  dashboardUrl: string
  /** Impact Visible — 1-2 preuves texte du mois (avant/après réels, ex. titre Google). */
  proofExamples?: { title: string; before: string; after: string }[]
  /** Insights v10 — veille concurrentielle + tendances détectées ce mois. */
  insights?: string[]
}

export function renderMonthlyReportHtml(d: MonthlyReportData): string {
  const li = (label: string, value: string) => `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #ececec;color:#52525b;font-size:14px;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #ececec;color:#18181b;font-size:14px;font-weight:600;text-align:right;">${value}</td></tr>`
  const score = d.scoreDelta != null ? `${d.scoreNow}/100 (${d.scoreDelta >= 0 ? '+' : ''}${d.scoreDelta})` : `${d.scoreNow}/100`
  const fixesRows = d.appliedList.length
    ? d.appliedList.map((f) => `<tr><td style="padding:8px 0;border-bottom:1px solid #f1f1f1;color:#18181b;font-size:13px;">✅ ${f.title}</td><td style="padding:8px 0;border-bottom:1px solid #f1f1f1;color:#16a34a;font-size:13px;font-weight:600;text-align:right;white-space:nowrap;">+€${f.impact_euros}/mois</td></tr>`).join('')
    : `<tr><td style="padding:8px 0;color:#52525b;font-size:13px;">Aucun nouveau correctif ce mois-ci.</td><td></td></tr>`
  const pendingRows = d.pendingList.length
    ? d.pendingList.map((f) => `<tr><td style="padding:8px 0;border-bottom:1px solid #f1f1f1;color:#18181b;font-size:13px;">⏳ ${f.title}</td><td style="padding:8px 0;border-bottom:1px solid #f1f1f1;color:#FF5C35;font-size:13px;font-weight:600;text-align:right;white-space:nowrap;">€${f.impact_euros}/mois</td></tr>`).join('')
    : ''

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
      <tr><td style="background:#FF5C35;padding:28px 32px;">
        <p style="margin:0;color:#fff;font-size:13px;opacity:.85;">Bilan du mois · ${d.shopName}</p>
        <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:800;">Ce mois-ci, Modify a récupéré</h1>
        <p style="margin:8px 0 0;color:#fff;font-size:40px;font-weight:800;">€${d.monthRecovered.toLocaleString('fr-FR')}</p>
      </td></tr>
      <tr><td style="padding:24px 32px;">
        <p style="margin:0 0 8px;color:#18181b;font-size:15px;font-weight:700;">Ce que Modify a fait</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">${fixesRows}</table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${li('Total récupéré depuis le début', `€${d.totalRecovered.toLocaleString('fr-FR')}/mois`)}
          ${li('Articles de blog publiés ce mois', String(d.articles))}
          ${li('Produits gagnants suggérés', String(d.winningProducts))}
          ${li('Score de votre boutique', score)}
        </table>
        ${(d.proofExamples?.length ? `<p style="margin:22px 0 8px;color:#18181b;font-size:15px;font-weight:700;">La preuve, concrètement</p>
        ${d.proofExamples.map((p) => `<div style="border:1px solid #ececec;border-radius:10px;padding:12px 14px;margin-bottom:10px;">
          <p style="margin:0 0 6px;color:#18181b;font-size:13px;font-weight:600;">${p.title}</p>
          <p style="margin:0 0 4px;color:#71717a;font-size:12px;"><span style="font-weight:700;text-transform:uppercase;font-size:10px;margin-right:6px;">Avant</span>${p.before}</p>
          <p style="margin:0;color:#18181b;font-size:12px;"><span style="color:#FF6B35;font-weight:700;text-transform:uppercase;font-size:10px;margin-right:6px;">Après</span>${p.after}</p>
        </div>`).join('')}` : '')}
        ${(d.insights?.length ? `<p style="margin:22px 0 8px;color:#18181b;font-size:15px;font-weight:700;">Insights du mois</p>
        ${d.insights.map((t) => `<p style="margin:0 0 8px;color:#3f3f46;font-size:13px;line-height:1.5;">${t}</p>`).join('')}` : '')}
        ${pendingRows ? `<p style="margin:22px 0 8px;color:#18181b;font-size:15px;font-weight:700;">Ce qui reste à gagner</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${pendingRows}</table>` : ''}
        <div style="text-align:center;margin-top:28px;">
          <a href="${d.dashboardUrl}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;">Voir mon suivi complet</a>
        </div>
        <p style="margin:24px 0 0;color:#a1a1aa;font-size:12px;text-align:center;line-height:1.5;">Modify entretient votre boutique automatiquement.<br>Vous n'avez rien à faire.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

/** Sends the monthly report. Returns false on any failure (never throws). */
export async function sendMonthlyReport(to: string, data: MonthlyReportData): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) { console.warn('[email] RESEND_API_KEY not set — skipping monthly send'); return false }
  try {
    const resend = new Resend(key)
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: `📊 ${data.shopName} — votre bilan du mois (€${data.monthRecovered.toLocaleString('fr-FR')} récupérés)`,
      html: renderMonthlyReportHtml(data),
    })
    if (error) { console.error('[email] Resend error:', error); return false }
    return true
  } catch (e) {
    console.error('[email] monthly send threw:', e)
    return false
  }
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
