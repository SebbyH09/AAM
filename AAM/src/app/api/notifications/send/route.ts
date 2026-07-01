import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { addDays } from 'date-fns'
import { sendEmail } from '@/lib/email/send'
import { contractExpiryEmail, maintenanceDueEmail } from '@/lib/email/templates'

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  // In development or if CRON_SECRET is not set, allow all requests
  if (!cronSecret) return true
  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${cronSecret}`
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

        const content = contractExpiryEmail(contract, rule.days_before)

        for (const email of rule.email_to) {
          const success = await sendEmail(email, content)
          await supabase.from('notification_log').insert({
            rule_id: rule.id,
            type: 'contract_expiry',
            subject: content.subject,
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

        const content = maintenanceDueEmail(plan, rule.days_before)

        for (const email of rule.email_to) {
          const success = await sendEmail(email, content)
          await supabase.from('notification_log').insert({
            rule_id: rule.id,
            type: 'maintenance_due',
            subject: content.subject,
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
