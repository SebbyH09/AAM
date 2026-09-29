import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Page visibility per role. Admins always see everything; every other role
 * gets the defaults below unless an admin has overridden them in Settings
 * (stored in the role_page_access table).
 */

export const ADMIN_ROLE = 'admin'

/** Roles that can be assigned to users. Admin is listed but not configurable. */
export const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to every page, including Settings' },
  { value: 'user', label: 'Standard user', description: 'Sees the pages enabled below' },
]

export const CONFIGURABLE_ROLES = ROLES.filter((r) => r.value !== ADMIN_ROLE)

export interface AppPage {
  href: string
  name: string
  /** Visible to non-admin roles when no override has been saved. */
  defaultVisible: boolean
}

/** Pages whose visibility can be controlled per role. The dashboard is always visible. */
export const CONFIGURABLE_PAGES: AppPage[] = [
  { href: '/assets', name: 'Assets', defaultVisible: true },
  { href: '/contracts', name: 'Service Contracts', defaultVisible: false },
  { href: '/maintenance', name: 'Maintenance Plans', defaultVisible: true },
  { href: '/work-orders', name: 'Other Work Orders', defaultVisible: true },
  { href: '/repairs', name: 'Repairs', defaultVisible: true },
  { href: '/downtime', name: 'Downtime', defaultVisible: true },
  { href: '/notifications', name: 'Notifications', defaultVisible: true },
  { href: '/schedule', name: 'Schedule', defaultVisible: true },
  { href: '/calibrations', name: 'Calibrations', defaultVisible: true },
  { href: '/vendors', name: 'Vendors', defaultVisible: true },
  { href: '/parts', name: 'Parts Inventory', defaultVisible: true },
  { href: '/budgets', name: 'Budgets', defaultVisible: false },
  { href: '/reports', name: 'Reports', defaultVisible: true },
]

/** Pages only admins can ever reach, regardless of settings. */
export const ADMIN_ONLY_PAGES = ['/settings']

export function isAdmin(role: string | null | undefined): boolean {
  return role === ADMIN_ROLE
}

function matchesPage(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Hrefs the given role may not see. Unknown or missing roles are treated as a
 * standard user. If the settings table can't be read the defaults apply.
 */
export async function getHiddenPages(
  supabase: SupabaseClient,
  role: string | null | undefined,
): Promise<string[]> {
  if (isAdmin(role)) return []
  const effectiveRole = role || 'user'

  const overrides = new Map<string, boolean>()
  const { data, error } = await supabase
    .from('role_page_access')
    .select('page, can_view')
    .eq('role', effectiveRole)
  if (!error && data) {
    for (const row of data as { page: string; can_view: boolean }[]) overrides.set(row.page, row.can_view)
  }

  const hidden = CONFIGURABLE_PAGES
    .filter((p) => !(overrides.get(p.href) ?? p.defaultVisible))
    .map((p) => p.href)
  return [...hidden, ...ADMIN_ONLY_PAGES]
}

export function isPathHidden(pathname: string, hiddenPages: string[]): boolean {
  return hiddenPages.some((href) => matchesPage(pathname, href))
}
