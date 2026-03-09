'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import { Menu, Settings } from 'lucide-react'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed overlay on mobile, static on desktop */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:relative lg:z-auto lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
              <Settings className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Aera Manager</p>
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
