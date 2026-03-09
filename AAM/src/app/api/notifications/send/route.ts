import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { addDays, format } from 'date-fns'

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  // In development or if CRON_SECRET is not set, allow all requests
  if (!cronSecret) return true
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
}

// Email sending via Resend (or fallback to console log in dev)
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.NOTIFICATION_EMAIL_FROM ?? 'notifications@assetmanager.local'

  if (!apiKey || apiKey === 'your-resend-api-key') {
    console.log('[EMAIL NOTIFICATION]', { to, subject, html: html.slice(0, 200) })
    return true // In dev, just log it
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    })
    return res.ok
  } catch {
    return false
  }
}

function buildContractEmail(contract: any, daysLeft: number): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Service Contract Expiry Alert</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151;">A service contract is ${daysLeft === 0 ? 'expiring <strong>today</strong>' : `expiring in <strong>${daysLeft} day(s)</strong>`}.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Vendor</td>
            <td style="padding: 8px 12px; font-weight: bold;">${contract.vendor_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Asset</td>
            <td style="padding: 8px 12px;">${contract.assets?.name ?? 'N/A'}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Contract #</td>
            <td style="padding: 8px 12px;">${contract.contract_number ?? 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Expiry Date</td>
            <td style="padding: 8px 12px; color: #dc2626; font-weight: bold;">${format(new Date(contract.end_date), 'MMMM d, yyyy')}</td>
          </tr>
        </table>
        <p style="color: #374151; font-size: 14px;">Please renew or replace this contract to maintain coverage.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/contracts"
           style="display: inline-block; background: #1e40af; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 8px;">
          View Contracts
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 16px; text-align: center;">
        Asset Manager Notification System
      </p>
    </div>
  `
}

function buildMaintenanceEmail(plan: any, daysLeft: number): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #065f46; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Maintenance Due Alert</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #374151;">A maintenance task is ${daysLeft === 0 ? 'due <strong>today</strong>' : `due in <strong>${daysLeft} day(s)</strong>`}.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Task</td>
            <td style="padding: 8px 12px; font-weight: bold;">${plan.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Asset</td>
            <td style="padding: 8px 12px;">${plan.assets?.name ?? 'N/A'}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Priority</td>
            <td style="padding: 8px 12px; text-transform: capitalize;">${plan.priority}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Due Date</td>
            <td style="padding: 8px 12px; color: #dc2626; font-weight: bold;">${format(new Date(plan.next_due_date), 'MMMM d, yyyy')}</td>
          </tr>
          ${plan.assigned_to ? `
          <tr style="background: #f9fafb;">
            <td style="padding: 8px 12px; color: #6b7280; font-size: 14px;">Assigned To</td>
            <td style="padding: 8px 12px;">${plan.assigned_to}</td>
          </tr>` : ''}
        </table>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/maintenance"
           style="display: inline-block; background: #065f46; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 8px;">
          View Maintenance Plans
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 16px; text-align: center;">
        Asset Manager Notification System
      </p>
    </div>
  `
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = new Date()
  let notificationsSent = 0
  let notificationsFailed = 0

  // Get active notification rules
  const { data: rules } = await supabase
    .from('notification_rules')
    .select('*')
    .eq('is_active', true)

  if (!rules || rules.length === 0) {
    return NextResponse.json({ message: 'No active notification rules', sent: 0 })
  }

  for (const rule of rules) {
    const targetDate = addDays(today, rule.days_before)
    const targetDateStr = targetDate.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]

    if (rule.type === 'contract_expiry') {
      const { data: contracts } = await supabase
        .from('service_contracts')
        .select('*, assets(name, asset_tag)')
        .eq('status', 'active')
        .eq('end_date', rule.days_before === 0 ? todayStr : targetDateStr)

      for (const contract of contracts ?? []) {
        // Check if notification already sent today for this item
        const { count } = await supabase
          .from('notification_log')
          .select('*', { count: 'exact', head: true })
          .eq('related_id', contract.id)
          .eq('related_type', 'service_contract')
          .gte('sent_at', todayStr)

        if ((count ?? 0) > 0) continue // Already sent today

        const subject = `Contract Expiry Alert: ${contract.vendor_name} expires ${format(new Date(contract.end_date), 'MMM d, yyyy')}`
        const html = buildContractEmail(contract, rule.days_before)

        for (const email of rule.email_to) {
          const success = await sendEmail(email, subject, html)
          await supabase.from('notification_log').insert({
            rule_id: rule.id,
            type: 'contract_expiry',
            subject,
            recipient: email,
            related_id: contract.id,
            related_type: 'service_contract',
            status: success ? 'sent' : 'failed',
          })
          if (success) notificationsSent++
          else notificationsFailed++
        }
      }
    }

    if (rule.type === 'maintenance_due') {
      const { data: plans } = await supabase
        .from('maintenance_plans')
        .select('*, assets(name, asset_tag)')
        .eq('is_active', true)
        .eq('next_due_date', rule.days_before === 0 ? todayStr : targetDateStr)

      for (const plan of plans ?? []) {
        const { count } = await supabase
          .from('notification_log')
          .select('*', { count: 'exact', head: true })
          .eq('related_id', plan.id)
          .eq('related_type', 'maintenance_plan')
          .gte('sent_at', todayStr)

        if ((count ?? 0) > 0) continue

        const subject = `Maintenance Due: ${plan.name} - ${plan.assets?.name ?? 'Asset'}`
        const html = buildMaintenanceEmail(plan, rule.days_before)

        for (const email of rule.email_to) {
          const success = await sendEmail(email, subject, html)
          await supabase.from('notification_log').insert({
            rule_id: rule.id,
            type: 'maintenance_due',
            subject,
            recipient: email,
            related_id: plan.id,
            related_type: 'maintenance_plan',
            status: success ? 'sent' : 'failed',
          })
          if (success) notificationsSent++
          else notificationsFailed++
        }
      }
    }
  }

  return NextResponse.json({
    message: `Notifications processed: ${notificationsSent} sent, ${notificationsFailed} failed`,
    sent: notificationsSent,
    failed: notificationsFailed,
  })
}

export async function GET(request: NextRequest) {
  // Allow GET for Vercel Cron job compatibility
  return POST(request)
}
