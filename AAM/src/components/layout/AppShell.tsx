'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import { MobileMenuContext } from '@/contexts/MobileMenuContext'

interface AppShellProps {
  children: React.ReactNode
  userRole: string | null
}

export default function AppShell({ children, userRole }: AppShellProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <MobileMenuContext.Provider value={{ openMobileMenu: () => setMobileMenuOpen(true) }}>
      <div className="flex h-screen bg-gray-50">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar userRole={userRole} />
        </div>

        {/* Mobile backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile sidebar drawer */}
        <div
          className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:hidden ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar userRole={userRole} onClose={() => setMobileMenuOpen(false)} />
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </MobileMenuContext.Provider>
  )
}
