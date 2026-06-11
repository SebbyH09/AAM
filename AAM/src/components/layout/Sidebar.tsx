'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wrench,
  FileText,
  ClipboardList,
  Clock,
  Bell,
  Settings,
  Package,
  LogOut,
  X,
  Calendar,
  FlaskConical,
  Building2,
  Package2,
  DollarSign,
  BarChart3,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const assetNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, adminOnly: false },
  { name: 'Assets', href: '/assets', icon: Package, adminOnly: false },
  { name: 'Service Contracts', href: '/contracts', icon: FileText, adminOnly: true },
  { name: 'Maintenance Plans', href: '/maintenance', icon: ClipboardList, adminOnly: false },
  { name: 'Repairs', href: '/repairs', icon: Wrench, adminOnly: false },
  { name: 'Downtime', href: '/downtime', icon: Clock, adminOnly: false },
  { name: 'Notifications', href: '/notifications', icon: Bell, adminOnly: false },
]

const operationsNavigation = [
  { name: 'Schedule', href: '/schedule', icon: Calendar, adminOnly: false },
  { name: 'Calibrations', href: '/calibrations', icon: FlaskConical, adminOnly: false },
]

const resourcesNavigation = [
  { name: 'Vendors', href: '/vendors', icon: Building2, adminOnly: false },
  { name: 'Parts Inventory', href: '/parts', icon: Package2, adminOnly: false },
  { name: 'Budgets', href: '/budgets', icon: DollarSign, adminOnly: true },
]

const analyticsNavigation = [
  { name: 'Reports', href: '/reports', icon: BarChart3, adminOnly: false },
]

interface SidebarProps {
  onClose?: () => void
  userRole: string | null
}

export default function Sidebar({ onClose, userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = userRole === 'admin'

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function renderNavItem(item: { name: string; href: string; icon: React.ElementType; adminOnly: boolean }) {
    if (item.adminOnly && !isAdmin) return null
    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        )}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {item.name}
      </Link>
    )
  }

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-700 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Settings className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Asset Manager</p>
          <p className="text-xs text-slate-400">Service & Maintenance</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {/* Asset Manager section */}
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Asset Manager</p>
          <div className="space-y-1">
            {assetNavigation.map(renderNavItem)}
          </div>
        </div>

        {/* Operations section */}
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Operations</p>
          <div className="space-y-1">
            {operationsNavigation.map(renderNavItem)}
          </div>
        </div>

        {/* Resources section */}
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Resources</p>
          <div className="space-y-1">
            {resourcesNavigation.map(renderNavItem)}
          </div>
        </div>

        {/* Analytics section */}
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Analytics</p>
          <div className="space-y-1">
            {analyticsNavigation.map(renderNavItem)}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 p-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          Sign out
        </button>
        <p className="mt-2 text-xs text-slate-500">Aera Manager v1.0</p>
      </div>
    </div>
  )
}
