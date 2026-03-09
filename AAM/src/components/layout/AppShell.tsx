'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar, { MobileMenuButton } from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header bar */}
        <div className="lg:hidden flex h-14 items-center border-b border-gray-200 bg-white px-4">
          <MobileMenuButton onClick={() => setMobileOpen(true)} />
          <span className="ml-3 text-sm font-semibold text-gray-900">Asset Manager</span>
        </div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
