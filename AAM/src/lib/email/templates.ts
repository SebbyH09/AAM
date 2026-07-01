import { format } from 'date-fns'

/**
 * Reusable email templates for Resend reminder notifications.
 *
 * Each builder returns a { subject, html, text } payload. Providing a
 * plain-text alternative alongside the HTML improves deliverability and
 * gives clients that don't render HTML something readable.
 */

export interface EmailContent {
  subject: string
  html: string
  text: string
}

/** Escape user-supplied values before interpolating them into HTML. */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface DetailRow {
  label: string
  value: string
  /** Render the value in red/bold — used for due & expiry dates. */
  highlight?: boolean
}

interface LayoutOptions {
  title: string
  /** Header + CTA accent colour. */
  accent: string
  intro: string
  rows: DetailRow[]
  ctaLabel: string
  ctaUrl: string
}

const APP_NAME = 'Asset Manager'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? ''
}

/** Shared branded HTML wrapper used by every reminder template. */
function renderLayout({ title, accent, intro, rows, ctaLabel, ctaUrl }: LayoutOptions): string {
  const rowsHtml = rows
    .map((row, i) => {
      const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff'
      const valueStyle = row.highlight
        ? 'padding: 8px 12px; color: #dc2626; font-weight: bold;'
        : 'padding: 8px 12px; color: #111827;'
      return `
          <tr style="background: ${bg};">
            <td style="padding: 8px 12px; color: #6b7280; font-size: 14px; white-space: nowrap;">${escapeHtml(row.label)}</td>
            <td style="${valueStyle}">${escapeHtml(row.value)}</td>
          </tr>`
    })
    .join('')

  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 16px;">
      <div style="background: ${accent}; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">${escapeHtml(title)}</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151; margin-top: 0;">${intro}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          ${rowsHtml}
        </table>
        <a href="${escapeHtml(ctaUrl)}"
           style="display: inline-block; background: ${accent}; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 8px; font-weight: bold;">
          ${escapeHtml(ctaLabel)}
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 16px; text-align: center;">
        ${APP_NAME} Notification System${ctaUrl ? ` &middot; <a href="${escapeHtml(ctaUrl)}" style="color: #9ca3af;">Open in app</a>` : ''}
      </p>
    </div>
  `
}

/** Build a plain-text version from the same intro + detail rows. */
function renderText(intro: string, rows: DetailRow[], ctaLabel: string, ctaUrl: string): string {
  const lines = rows.map((r) => `${r.label}: ${r.value}`)
  return [
    intro.replace(/<[^>]+>/g, ''),
    '',
    ...lines,
    '',
    ctaUrl ? `${ctaLabel}: ${ctaUrl}` : '',
    '',
    `— ${APP_NAME} Notification System`,
  ]
    .filter((l) => l !== undefined)
    .join('\n')
}

/** Phrase the lead time as "today" or "in N day(s)". */
function whenPhrase(daysLeft: number, verb: string): { html: string; text: string } {
  if (daysLeft <= 0) {
    return { html: `${verb} <strong>today</strong>`, text: `${verb} today` }
  }
  return {
    html: `${verb} in <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>`,
    text: `${verb} in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
  }
}

interface ContractLike {
  vendor_name: string
  contract_number?: string | null
  end_date: string
  assets?: { name?: string | null } | null
}

/** Reminder for an expiring service contract. */
export function contractExpiryEmail(contract: ContractLike, daysLeft: number): EmailContent {
  const endDate = format(new Date(contract.end_date), 'MMMM d, yyyy')
  const subject = `Contract Expiry Alert: ${contract.vendor_name} expires ${format(new Date(contract.end_date), 'MMM d, yyyy')}`
  const when = whenPhrase(daysLeft, 'expiring')

  const rows: DetailRow[] = [
    { label: 'Vendor', value: contract.vendor_name },
    { label: 'Asset', value: contract.assets?.name ?? 'N/A' },
    { label: 'Contract #', value: contract.contract_number ?? 'N/A' },
    { label: 'Expiry Date', value: endDate, highlight: true },
  ]
  const ctaUrl = `${appUrl()}/contracts`
  const introHtml = `A service contract is ${when.html}. Please renew or replace it to maintain coverage.`
  const introText = `A service contract is ${when.text}. Please renew or replace it to maintain coverage.`

  return {
    subject,
    html: renderLayout({
      title: 'Service Contract Expiry Alert',
      accent: '#1e40af',
      intro: introHtml,
      rows,
      ctaLabel: 'View Contracts',
      ctaUrl,
    }),
    text: renderText(introText, rows, 'View Contracts', ctaUrl),
  }
}

interface PlanLike {
  name: string
  priority: string
  next_due_date: string
  assigned_to?: string | null
  assets?: { name?: string | null } | null
}

/** Reminder for a maintenance plan coming due. */
export function maintenanceDueEmail(plan: PlanLike, daysLeft: number): EmailContent {
  const dueDate = format(new Date(plan.next_due_date), 'MMMM d, yyyy')
  const subject = `Maintenance Due: ${plan.name} - ${plan.assets?.name ?? 'Asset'}`
  const when = whenPhrase(daysLeft, 'due')

  const rows: DetailRow[] = [
    { label: 'Task', value: plan.name },
    { label: 'Asset', value: plan.assets?.name ?? 'N/A' },
    { label: 'Priority', value: plan.priority },
    { label: 'Due Date', value: dueDate, highlight: true },
  ]
  if (plan.assigned_to) {
    rows.push({ label: 'Assigned To', value: plan.assigned_to })
  }
  const ctaUrl = `${appUrl()}/maintenance`
  const introHtml = `A maintenance task is ${when.html}.`
  const introText = `A maintenance task is ${when.text}.`

  return {
    subject,
    html: renderLayout({
      title: 'Maintenance Due Alert',
      accent: '#065f46',
      intro: introHtml,
      rows,
      ctaLabel: 'View Maintenance Plans',
      ctaUrl,
    }),
    text: renderText(introText, rows, 'View Maintenance Plans', ctaUrl),
  }
}
