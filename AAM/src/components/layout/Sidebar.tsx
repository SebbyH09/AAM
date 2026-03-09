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
  Menu,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Assets', href: '/assets', icon: Package },
  { name: 'Service Contracts', href: '/contracts', icon: FileText },
  { name: 'Maintenance Plans', href: '/maintenance', icon: ClipboardList },
  { name: 'Repairs', href: '/repairs', icon: Wrench },
  { name: 'Downtime', href: '/downtime', icon: Clock },
  { name: 'Notifications', href: '/notifications', icon: Bell },
]

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  )
}

interface SidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navContent = (
    <div className="flex h-full w-64 flex-col bg-slate-900">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-slate-700 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Asset Manager</p>
            <p className="text-xs text-slate-400">Service & Maintenance</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)

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
        })}
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
        <p className="mt-2 text-xs text-slate-500">Asset Manager v1.0</p>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block h-full">
        {navContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 z-50">
            {navContent}
          </div>
        </div>
      )}
    </>
  )
}
