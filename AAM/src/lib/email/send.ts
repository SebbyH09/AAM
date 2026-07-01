import { Resend } from 'resend'
import type { EmailContent } from './templates'

/**
 * Send an email via Resend.
 *
 * If RESEND_API_KEY is missing (or left as the placeholder), the email is
 * logged to the console instead of sent — this keeps local/dev runs working
 * without real credentials. Returns true when the send (or dev log) succeeds.
 */
export async function sendEmail(to: string, content: EmailContent): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.NOTIFICATION_EMAIL_FROM ?? 'notifications@assetmanager.local'

  if (!apiKey || apiKey === 'your-resend-api-key') {
    console.log('[EMAIL NOTIFICATION]', {
      to,
      subject: content.subject,
      preview: content.text.slice(0, 200),
    })
    return true
  }

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from,
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    })
    if (error) {
      console.error('[EMAIL NOTIFICATION] Resend error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[EMAIL NOTIFICATION] send failed:', err)
    return false
  }
}
