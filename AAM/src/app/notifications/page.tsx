import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import NotificationsClient from './NotificationsClient'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const [{ data: rules }, { data: logs }] = await Promise.all([
    supabase.from('notification_rules').select('*').order('created_at'),
    supabase.from('notification_log').select('*').order('sent_at', { ascending: false }).limit(50),
  ])

  return (
    <div>
      <Header
        title="Notifications"
        subtitle="Configure email alerts for contracts, maintenance, and repairs"
      />
      <div className="p-6">
        <NotificationsClient rules={rules ?? []} logs={logs ?? []} />
      </div>
    </div>
  )
}
