'use client'

import { Bell } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <div className="flex min-h-16 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-gray-900 sm:text-xl">{title}</h1>
        {subtitle && <p className="truncate text-xs text-gray-500 sm:text-sm">{subtitle}</p>}
      </div>
      <div className="ml-3 flex flex-shrink-0 items-center gap-2 sm:gap-3">
        {actions}
        <button className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
