import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/permissions'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdmin(user?.user_metadata?.role)) redirect('/')

  const [
    { data: categories, error: categoriesError },
    { data: accessRows, error: accessError },
    { data: assets },
  ] = await Promise.all([
    supabase.from('asset_categories').select('*').order('sort_order').order('name'),
    supabase.from('role_page_access').select('*'),
    supabase.from('assets').select('category'),
  ])

  const categoryUsage: Record<string, number> = {}
  for (const a of assets ?? []) {
    categoryUsage[a.category] = (categoryUsage[a.category] ?? 0) + 1
  }

  return (
    <div>
      <Header title="Settings" subtitle="Configure asset categories and what each user can see" />
      <div className="p-6">
        <SettingsClient
          currentUserId={user!.id}
          categories={categories ?? []}
          categoryUsage={categoryUsage}
          accessRows={accessRows ?? []}
          setupNeeded={!!(categoriesError || accessError)}
        />
      </div>
    </div>
  )
}
